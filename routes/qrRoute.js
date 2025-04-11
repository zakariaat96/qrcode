const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { createRetrievalChain } = require("langchain/chains/retrieval");
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
//const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");
//const { ChatGroq } = require('@langchain/groq');
const { OpenAIEmbeddings } =require("@langchain/openai");

const { ChatOpenAI } = require('@langchain/openai');
const { Pinecone } = require('@pinecone-database/pinecone');
const { PineconeStore } = require('@langchain/pinecone');
const { ConversationSummaryMemory } = require("langchain/memory");
const { insertQRCode, getUserQRCodes, getQRSessions, insertSession, getQRCodeByUuid, getChatDataForSession, updateSessionTranscript } = require('../public/utils/db');
const multer = require('multer');
const sharp = require('sharp');
const { pool } = require('../db');
// Middleware d'authentification
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Initialisation Pinecone
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
  
});
const index = pc.index('qr-openai');

const ollama = new ChatOpenAI({
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 200,
  apiKey: process.env.OPENAI_API_KEY
})

// Configuration du modèle LLM et embeddings
/*const ollama = new ChatGroq({
  model: "llama3-8b-8192",
  temperature: 0.7,
  maxTokens: 70,
  apiKey: ""
});*/

/*const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY
});*/

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-large",
  apiKey: process.env.OPENAI_API_KEY
});

const memory = new ConversationSummaryMemory({
  llm: ollama,
  memoryKey: "chat_history",
  inputKey: "input",
  outputKey: "output",
  returnMessages: true,
  maxTokens: 4000
});

/*const embeddings = new HuggingFaceInferenceEmbeddings({
  apiKey: process.env.HF_API_KEY
});*/

// Map pour stocker les chaînes de propriétés
const propertyChains = new Map();

// Prompt système pour l'assistant
const SYSTEM_PROMPT = `Vous êtes un assistant vendeur français, spécialisé dans la vente d'une propriété immobilière. Votre objectif : conclure la vente ou, au minimum, récupérer les coordonnées du client et avancer dans le processus.

**Instructions et étapes :**

1. **Salutation initiale** : 
   - Commencez la conversation en saluant poliment le client ("Bonjour", "Bonsoir"), mais ne répétez pas ces formules de politesse à chaque réponse ultérieure.

2. **Présentation active du bien** :
   - Mettez en avant les caractéristiques principales du bien (surface, localisation...)
   - Soulignez les points forts et avantages distinctifs
   - Répondez aux questions de manière courte, claire et professionnelle
   

3. **Gestion du budget** :
   - Écoutez les remarques du client sur le prix
   - Proposez de prendre ses coordonnées (téléphone, email) pour revenir vers lui avec plus d'informations

4. **Progression vers la vente** :
   - Restez attentif aux réactions du client
   - Proposez des solutions constructives
   - Gardez une approche positive et orientée solutions

5. **Prise d'initiative** :
   - Ne vous limitez pas aux seules questions du client
   - Si l'utilisateur ne prend pas l'initiative, posez-lui vous-même des questions pour progresser vers la conclusion

6. **Signes d'intérêt** :
   - Si vous sentez que le client est intéressé, **ne perdez pas de temps**
   - **Demandez-lui ses coordonnées** pour un suivi (téléphone, email)
   - **Proposez-lui une visite** ou un rendez-vous pour accélérer la décision

7. **Informations manquantes** :
   - Si vous n'avez pas une information, répondez : "Je n'ai pas cette information spécifique, je peux me renseigner"
   - Poursuivez la discussion sur d'autres aspects positifs du bien

8. **Conclusion / Prochaine étape** :
   - Dirigez la discussion vers la phase suivante (visite, envoi de documents, signature...)
   - Dans tous les cas, essayez d'obtenir les coordonnées pour un suivi personnalisé

**Style / Ton** :
- Réponses **courtes**, **professionnelles** et **concises**
- Pas de re-salutations à chaque message
- Restez clair et direct
- Attitude positive et constructive

Vous suivez ces étapes jusqu'à conclure ou obtenir un engagement clair (visite, coordonnées, etc.).


`;

router.post('/generate-qr', isAuthenticated, async (req, res) => {
  
  try {
    const userId = req.user.id;
    const [user] = await pool.query('SELECT credits FROM users WHERE id = ?', [userId]);
    
    if (!user[0] || user[0].credits <= 0) {
      return res.status(403).json({ error: 'Aucun crédit restant. Veuillez renouveler votre abonnement.' });
    }

    await pool.query('UPDATE users SET credits = credits - 1 WHERE id = ?', [userId]);

    const propertyInfo = req.body.propertyInfo;
    const propertyId = crypto.randomBytes(16).toString('hex');

    // Préparation des documents pour Pinecone
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 50,
    });
    const docs = await textSplitter.createDocuments([propertyInfo]);
    const namespace = `property_${propertyId}`;

    // Création du store vectoriel
    const vectorStore = await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: namespace,
    });

    // Configuration du prompt et de la mémoire
    const prompt = ChatPromptTemplate.fromTemplate(`${SYSTEM_PROMPT}

Information sur la propriété:
{context}

Historique de la conversation:
{chat_history}

Question actuelle: {input}

Réponse (en utilisant le contexte et l'historique):`);



    
    // Création de la chaîne de documents
    const combineDocsChain = await createStuffDocumentsChain({
      llm: ollama,
      prompt,
      memory
    });

    // Configuration du retrieveur
    const retriever = vectorStore.asRetriever({
      k: 3,
      searchKwargs: {
        filter: { namespace: namespace }
      }
    });

    // Création de la chaîne de récupération
    const retrievalChain = await createRetrievalChain({
      combineDocsChain,
      retriever,
    });

    // Stockage des données de la propriété
    propertyChains.set(propertyId, {
      chain: retrievalChain,
      info: propertyInfo,
      namespace: namespace,
      memory: memory,
      userSessions: new Map()
    });

    // Génération du QR code
    const chatUrl = `${req.protocol}://${req.get('host')}/chat/${propertyId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(chatUrl, {
      color: { dark: '#6e48aa', light: '#ffffff' },
      width: 400,
      margin: 2
    });

    // Enregistrement en base de données
    const qrcodeDbId = await insertQRCode(userId, propertyInfo, qrCodeDataUrl, propertyId);
    const chainData = propertyChains.get(propertyId);
    chainData.qrcodeDbId = qrcodeDbId;
    propertyChains.set(propertyId, chainData);

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      propertyId: propertyId,
      remainingCredits: user[0].credits - 1
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/qrcodes', isAuthenticated, async (req, res) => {
  const userId = req.user.id;
  const { filter = 'all', search = '', page = 1 } = req.query;
  const itemsPerPage = 10;

  try {
    const result = await getUserQRCodes(userId, filter, search, page, itemsPerPage);
    res.json({ qrcodes: result.rows, page: result.page, totalPages: result.totalPages });
  } catch (error) {
    console.error('Error retrieving qrcodes:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/qrcodes/:id/sessions', isAuthenticated, async (req, res) => {
  const qrcodeId = req.params.id;
  try {
    const sessions = await getQRSessions(qrcodeId);
    res.json({ sessions });
  } catch (error) {
    console.error('Erreur récupération sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:sessionId/chat', isAuthenticated, async (req, res) => {
  const sessionId = req.params.sessionId;
  try {
    const chatData = await getChatDataForSession(sessionId);
    res.json(chatData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/chat/:propertyId', async (req, res) => {
  const propertyId = req.params.propertyId;
  const propertyData = propertyChains.get(propertyId);

  if (!propertyData) {
    return res.status(404).send('Propriété introuvable');
  }

  let userSessionId = req.query.session;
  if (!userSessionId) {
    userSessionId = uuidv4();
    return res.redirect(`/chat/${propertyId}?session=${userSessionId}`);
  }

  // Création ou récupération de la session utilisateur
  if (!propertyData.userSessions.has(userSessionId)) {
    const sessionMemory = new ConversationSummaryMemory({
      llm: ollama,
      memoryKey: "chat_history",
      returnMessages: true,
      inputKey: "input",
      outputKey: "output",  
      maxTokens: 4000
    });
   

    propertyData.userSessions.set(userSessionId, {
      sessionId: null,
      memory: sessionMemory,
      lastActivity: Date.now()
    });
  }

  res.sendFile(require('path').join(__dirname, '..', 'views', 'index.html'));
});


// Initialisation du nouvel index Pinecone pour la mémoire
const memoryIndex = pc.index('conversation-memory');



async function retrieveSimilarMemories(propertyId, sessionId, query, limit = 3) {
  try {
    // Si pas de sessionId, retourner un tableau vide
    if (!sessionId) {
      return [];
    }

    const queryEmbedding = await embeddings.embedQuery(query);
    
    const results = await memoryIndex.query({
      vector: queryEmbedding,
      filter: {
        propertyId: propertyId,
        sessionId: sessionId.toString()
      },
      topK: limit,
      includeMetadata: true
    });

    return results.matches.map(match => match.metadata.conversation);
  } catch (error) {
    console.error('Erreur lors de la récupération des souvenirs:', error);
    return [];
  }
}

// Modification de saveMemoryToPinecone pour gérer les longs textes
async function saveMemoryToPinecone(sessionId, propertyId, conversation) {
  try {
    // Si la conversation est trop longue, ne garder que les derniers échanges
    const maxTokens = 4000; // Une valeur sécurisée bien en dessous de la limite de 8192
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: maxTokens,
      chunkOverlap: 200,
    });
    
    // Ne garder que le dernier chunk si le texte est trop long
    const chunks = await textSplitter.createDocuments([conversation]);
    const lastChunk = chunks[chunks.length - 1].pageContent;
    
    const vector = await embeddings.embedQuery(lastChunk);
    const memoryId = `memory_${propertyId}_${sessionId}_${Date.now()}`;
    
    await memoryIndex.upsert([{
      id: memoryId,
      values: vector,
      metadata: {
        propertyId,
        sessionId: sessionId.toString(),
        conversation: lastChunk,
        timestamp: new Date().toISOString()
      }
    }]);
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la mémoire:', error);
  }
}


// Modification de la route /query/:propertyId
router.post('/query/:propertyId', async (req, res) => {
  try {
    const propertyId = req.params.propertyId;
    const userSessionId = req.query.session;
    const propertyData = propertyChains.get(propertyId);
    const userQuery = req.body.query;

    if (!propertyData || !propertyData.userSessions || !userSessionId || 
        !propertyData.userSessions.has(userSessionId)) {
      return res.status(400).json({ error: 'Session invalide' });
    }

    const sessionData = propertyData.userSessions.get(userSessionId);

    // Récupération des conversations similaires
    const similarMemories = await retrieveSimilarMemories(
      propertyId,
      sessionData.sessionId,
      userQuery
    );
    
    let contextHistory = similarMemories.join('\n\n');
    const historyVars = await sessionData.memory.loadMemoryVariables({});
    
    if (historyVars.chat_history) {
      if (Array.isArray(historyVars.chat_history)) {
        contextHistory += '\n\n' + historyVars.chat_history.map(msg => 
          `${msg.type === 'human' ? 'Client' : 'Assistant'}: ${msg.content}`
        ).join('\n');
      } else {
        contextHistory += '\n\n' + historyVars.chat_history;
      }
    }

    // Exécution de la requête
    const result = await propertyData.chain.invoke({
      input: userQuery,
      chat_history: contextHistory
    });

    // Gestion de la session
    if (!sessionData.sessionId) {
      const newSessionId = await insertSession(propertyData.qrcodeDbId, 1, 1, 'InProgress');
      sessionData.sessionId = newSessionId;
    }

    // Sauvegarde de la conversation dans Pinecone
    await saveMemoryToPinecone(
      sessionData.sessionId,
      propertyId,
      `${contextHistory}\nClient: ${userQuery}\nAssistant: ${result.answer}`
    );

    // Mise à jour de la transcription
    await updateSessionTranscript(sessionData.sessionId, userQuery, result.answer);

    try {
      // Sauvegarde sécurisée de la mémoire
      
     

      await sessionData.memory.saveContext(
        { input: userQuery },
        { output: result.answer }
     

      ).catch(error => {
        console.warn('Avertissement lors de la sauvegarde du contexte:', error);
        // Continue l'exécution même en cas d'erreur de sauvegarde du contexte
      });
    } catch (memoryError) {
      console.warn('Erreur non bloquante lors de la sauvegarde de la mémoire:', memoryError);
      // Continue l'exécution même en cas d'erreur
    }

    // Mise à jour du timestamp d'activité
    sessionData.lastActivity = Date.now();

    res.json({
      answer: result.answer,
      sessionId: sessionData.sessionId
    });

  } catch (error) {
    console.error('Erreur lors du traitement de la requête:', error);
    res.status(500).json({ error: error.message });
  }
});








// Modification de la route de nettoyage pour inclure la mémoire à long terme
router.post('/cleanup', isAuthenticated, async (req, res) => {
  try {
    const inactiveThreshold = 24 * 60 * 60 * 1000; // 24 heures
    const now = Date.now();

    for (const [propertyId, propertyData] of propertyChains.entries()) {
      for (const [sessionId, sessionData] of propertyData.userSessions.entries()) {
        if (now - sessionData.lastActivity > inactiveThreshold) {
          // Ne pas supprimer la mémoire à long terme, seulement la session
          propertyData.userSessions.delete(sessionId);
        }
      }

      if (propertyData.userSessions.size === 0) {
        await index.deleteAll({
          namespace: propertyData.namespace
        });
        propertyChains.delete(propertyId);
      }
    }

    res.json({ success: true, message: 'Nettoyage terminé' });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({ error: error.message });
  }
});





/*// Route pour combiner les images
router.post('/combine-images', upload.fields([
  { name: 'propertyImage', maxCount: 1 },
  { name: 'qrCodeImage', maxCount: 1 }
]), async (req, res) => {
  try {
      const propertyImage = req.files['propertyImage'][0].buffer;
      const qrCodeImage = req.files['qrCodeImage'][0].buffer;
      
      // Process the property image
      const propertyImageSharp = sharp(propertyImage);
      const propertyMetadata = await propertyImageSharp.metadata();
      
      // Resize QR code to be proportional to the property image
      //const qrCodeSize = Math.min(propertyMetadata.width, propertyMetadata.height) / 4;

      const minQRSize = 200; // Valeur à adapter selon vos besoins
      const ratioBasedSize = Math.floor(Math.min(propertyMetadata.width, propertyMetadata.height) / 4);
      const qrCodeSize = Math.max(ratioBasedSize, minQRSize);

      //const qrCodeSize = Math.floor(Math.min(propertyMetadata.width, propertyMetadata.height) / 4);


      const qrCodeResized = await sharp(qrCodeImage)
          .resize(qrCodeSize, qrCodeSize)
          .toBuffer();
          
      // Calculate position for QR code (bottom-right corner with padding)
      const padding = 20;
      const overlayOptions = {
          input: qrCodeResized,
          top: propertyMetadata.height - qrCodeSize - padding,
          left: propertyMetadata.width - qrCodeSize - padding
      };
      
      // Create the composite image
      const outputBuffer = await propertyImageSharp
          .composite([overlayOptions])
          .toBuffer();
      
      // Convert to base64 for sending back to client
      const outputBase64 = `data:image/png;base64,${outputBuffer.toString('base64')}`;
      
      res.json({
          success: true,
          combinedImage: outputBase64
      });
      
  } catch (error) {
      console.error('Error processing images:', error);
      res.status(500).json({
          success: false,
          error: 'Error processing images'
      });
  }
});*/


// Configuration de Multer pour stocker les fichiers en mémoire
const storage = multer.memoryStorage();



// Configuration de Multer avec limite de taille et filtre MIME
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5 Mo par fichier
  fileFilter: (req, file, cb) => {
    // On accepte uniquement les images JPEG et PNG
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      return cb(null, true);
    } else {
      return cb(new Error('Seulement les images JPEG et PNG sont autorisées.'));
    }
  }
});

// Route pour combiner les images
router.post('/combine-images', upload.fields([
  { name: 'propertyImage', maxCount: 1 },
  { name: 'qrCodeImage', maxCount: 1 }
]), async (req, res) => {
  try {
    // Vérifier que les deux images sont présentes
    if (
      !req.files ||
      !req.files['propertyImage'] ||
      !req.files['qrCodeImage']
    ) {
      return res.status(400).json({
        success: false,
        error: "Les deux images (propertyImage et qrCodeImage) sont requises."
      });
    }
    
    // Récupérer les buffers des images
    const propertyImageBuffer = req.files['propertyImage'][0].buffer;
    const qrCodeImageBuffer = req.files['qrCodeImage'][0].buffer;
    
    // Lire les métadonnées de l'image de propriété
    const propertyImageSharp = sharp(propertyImageBuffer);
    const propertyMetadata = await propertyImageSharp.metadata();
    
    if (!propertyMetadata.width || !propertyMetadata.height) {
      throw new Error("L'image de propriété n'a pas pu être traitée correctement.");
    }

    // Taille minimale de QR code souhaitée
    const minQRSize = 80;
    
    // Calcule une taille basée sur 1/4 de la plus petite dimension de l'image de fond
    const ratioBasedSize = Math.floor(Math.min(propertyMetadata.width, propertyMetadata.height) / 4);

    // Sélectionne le maximum entre la taille ratio-based et la taille minimale
    let qrCodeSize = Math.max(ratioBasedSize, minQRSize);

    // Empêche le QR code d'être plus grand que l'image en prévoyant des marges
    qrCodeSize = Math.min(
      qrCodeSize,
      propertyMetadata.width - 40,
      propertyMetadata.height - 40
    );

    // S'assurer qu'on ne descende pas en dessous d'une taille critique (ex: 50px)
    qrCodeSize = Math.max(qrCodeSize, 50);

    // Redimensionner le QR code
    const qrCodeResizedBuffer = await sharp(qrCodeImageBuffer)
      .resize(qrCodeSize, qrCodeSize)
      .toBuffer();

    // Calculer la position pour placer le QR code (en bas à droite avec 20px de marge)
    let leftPos = propertyMetadata.width - qrCodeSize - 20;
    let topPos = propertyMetadata.height - qrCodeSize - 20;

    // Si jamais la position calculée est négative, la forcer à 0
    leftPos = Math.max(leftPos, 0);
    topPos = Math.max(topPos, 0);

    // Créer l'image finale en composant le QR code sur l'image de propriété
    const outputBuffer = await propertyImageSharp
      .composite([{
        input: qrCodeResizedBuffer,
        top: topPos,
        left: leftPos
      }])
      .png()  // Conversion en PNG pour éviter la perte de qualité lors de la composition
      .toBuffer();

    // Convertir l'image finale en base64 pour l'envoyer
    const outputBase64 = `data:image/png;base64,${outputBuffer.toString('base64')}`;

    res.json({
      success: true,
      combinedImage: outputBase64
    });
  } catch (error) {
    console.error('Erreur lors du traitement des images:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement des images'
    });
  }
});

// Route pour combiner les images
router.post('/combine-images', upload.fields([
  { name: 'propertyImage', maxCount: 1 },
  { name: 'qrCodeImage', maxCount: 1 }
]), async (req, res) => {
  try {
    // Récupérer les buffers des images
    const propertyImage = req.files['propertyImage'][0].buffer;
    const qrCodeImage = req.files['qrCodeImage'][0].buffer;
    
    // Lire les métadonnées de l'image de propriété
    const propertyImageSharp = sharp(propertyImage);
    const propertyMetadata = await propertyImageSharp.metadata();

    // Taille minimale de QR code souhaitée
    const minQRSize = 80;
    
    // Calcule une taille basée sur 1/4 de la plus petite dimension de l'image de fond
    const ratioBasedSize = Math.floor(Math.min(propertyMetadata.width, propertyMetadata.height) / 4);

    // Sélectionne le maximum entre la taille ratio-based et la taille minimale
    let qrCodeSize = Math.max(ratioBasedSize, minQRSize);

    // Empêche le QR code d'être plus grand que l'image
    // On soustrait ici 40 par exemple (20px de marge en haut/gauche + 20px en bas/droite)
    qrCodeSize = Math.min(
      qrCodeSize,
      propertyMetadata.width - 40,
      propertyMetadata.height - 40
    );

    // Assurer qu'on ne descende pas en dessous d'une taille critique (ex: 50px)
    qrCodeSize = Math.max(qrCodeSize, 50);

    // Redimensionner le QR code
    const qrCodeResized = await sharp(qrCodeImage)
      .resize(qrCodeSize, qrCodeSize)
      .toBuffer();

    // Calculer la position (en bas à droite avec 20px de marge)
    let leftPos = propertyMetadata.width - qrCodeSize - 20;
    let topPos = propertyMetadata.height - qrCodeSize - 20;

    // Si jamais la position calculée est négative, on la force à 0
    if (leftPos < 0) leftPos = 0;
    if (topPos < 0) topPos = 0;

    // Créer l'image finale
    // On fait une composition PNG -> PNG pour éviter la perte de qualité
    const outputBuffer = await propertyImageSharp
      .composite([
        {
          input: qrCodeResized,
          top: topPos,
          left: leftPos
        }
      ])
      .png()
      .toBuffer();

    // Convertir en base64 avant de renvoyer
    const outputBase64 = `data:image/png;base64,${outputBuffer.toString('base64')}`;

    res.json({
      success: true,
      combinedImage: outputBase64
    });
  } catch (error) {
    console.error('Error processing images:', error);
    res.status(500).json({
      success: false,
      error: 'Error processing images'
    });
  }
});





router.patch('/qrcodes/:id', isAuthenticated, async (req, res) => {
  const qrcodeId = req.params.id;
  const userId = req.user.id;
  const { property_info } = req.body;

  try {
    //console.log('Début de la mise à jour pour QR code:', qrcodeId);

    // 1. Vérifier le QR code et récupérer le property_uuid
    const [qrCode] = await pool.query(
      'SELECT property_uuid FROM qrcodes WHERE id=? AND user_id=?',
      [qrcodeId, userId]
    );

    if (!qrCode.length) {
      return res.status(404).json({ error: 'QR code introuvable ou non autorisé' });
    }

    const propertyId = qrCode[0].property_uuid;
    const namespace = `property_${propertyId}`;
    //console.log('Namespace cible:', namespace);

    // 2. Mettre à jour la base de données
    const [result] = await pool.query(
      'UPDATE qrcodes SET property_info=? WHERE id=? AND user_id=?',
      [property_info, qrcodeId, userId]
    );
    //console.log('Base de données mise à jour avec succès');

    // 3. Supprimer les anciens vecteurs
    //console.log('Tentative de suppression des vecteurs...');
    try {
      await index.namespace(namespace).deleteAll();
      //console.log('Suppression réussie des anciens vecteurs');
    } catch (deleteError) {
      console.error('Erreur lors de la suppression:', deleteError);
    }

    // 4. Créer les nouveaux embeddings
    //console.log('Création des nouveaux documents...');
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 50,
    });
    const docs = await textSplitter.createDocuments([property_info]);
    //console.log('Nombre de nouveaux documents créés:', docs.length);
    
    //console.log('Création du nouveau vectorStore...');
    const vectorStore = await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex: index,
      namespace: namespace,
    });
    console.log('Nouveaux vecteurs créés et stockés');

    // 5. Vérification après insertion
    //console.log('Vérification des vecteurs après insertion...');
    const verificationQuery = await index.namespace(namespace).listPaginated();
    //console.log('Nombre de vecteurs après insertion:', verificationQuery.vectors?.length || 0);

    // 6. Mettre à jour la chaîne SANS mémoire globale
    if (propertyChains.has(propertyId)) {
      //console.log('Mise à jour de la chaîne de propriété en mémoire');
      const propertyData = propertyChains.get(propertyId);
      propertyData.info = property_info;

      const retriever = vectorStore.asRetriever({
        k: 3,
        searchKwargs: {
          filter: { namespace: namespace }
        }
      });

      const prompt = ChatPromptTemplate.fromTemplate(`${SYSTEM_PROMPT}

Information sur la propriété:
{context}

Historique de la conversation:
{chat_history}

Question actuelle: {input}

Réponse (en utilisant le contexte et l'historique):`);

      // RECONFIGURATION SANS MÉMOIRE GLOBALE
      const combineDocsChain = await createStuffDocumentsChain({
        llm: ollama,
        prompt // Plus de référence à la mémoire ici
      });

      const retrievalChain = await createRetrievalChain({
        combineDocsChain,
        retriever,
      });

      propertyData.chain = retrievalChain;
      propertyChains.set(propertyId, propertyData);
      //console.log('Chaîne de propriété mise à jour avec succès');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur update qrcode et embeddings:', error);
    res.status(500).json({ error: error.message });
  }
});




router.post('/qrcodes/deleteMany', isAuthenticated, async (req, res) => {
  const { ids } = req.body; // tableau d'IDs
  const userId = req.user.id;

  if (!Array.isArray(ids) || !ids.length) {
    return res.status(400).json({ error: 'Liste d\'IDs invalide' });
  }

  try {
    // Récupérer les property_uuid des QR codes à supprimer
    const [qrCodes] = await pool.query(
      `SELECT property_uuid FROM qrcodes WHERE id IN (?) AND user_id=?`,
      [ids, userId]
    );

    // Supprimer les sessions associées
    await pool.query(
      `DELETE FROM sessions WHERE qrcode_id IN (?)`,
      [ids]
    );

    // Supprimer les QR codes
    const [result] = await pool.query(
      `DELETE FROM qrcodes WHERE id IN (?) AND user_id=?`,
      [ids, userId]
    );

    // Supprimer les namespaces correspondants dans Pinecone
    for (const qrCode of qrCodes) {
      const namespace = `property_${qrCode.property_uuid}`;
      await index.namespace(namespace).deleteAll();
    }

    res.json({ success: true, deletedCount: result.affectedRows });
  } catch (error) {
    console.error('Erreur suppression multiple:', error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;