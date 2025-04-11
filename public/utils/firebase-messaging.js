

  
const firebaseConfig = {
    apiKey: "AIzaSyCSzCOlqIAhpBEE-xpOjK36xppnLGbFadk",
    authDomain: "qrcode-441614.firebaseapp.com",
    projectId: "qrcode-441614",
    storageBucket: "qrcode-441614.firebasestorage.app",
    messagingSenderId: "204002999906",
    appId: "1:204002999906:web:0ab85ef5048a05b1c35b3b",
    measurementId: "G-BFEG88HZPS"
  };
  // Initialiser Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Obtenir une instance de Firebase Messaging
  const messaging = firebase.messaging();

  

  async function initializeFirebaseMessaging() {
    try {
      // Vérifier et enregistrer le service worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/firebase-cloud-messaging-push-scope'
        });
        
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          // Obtenir le token FCM avec le service worker enregistré
          const currentToken = await messaging.getToken({
            vapidKey: 'BACRnKARssafBx55GnyOb6ZLw2F0GZKd350k7zACcIKHLXxTx9iMVLUjqNdZ5PeOAuO8m0SxO1twWu2VprG3dxA',
            serviceWorkerRegistration: registration
          });
  
          if (currentToken) {
            // Envoyer le token au serveur
            await sendTokenToServer(currentToken);
            console.log('Token FCM enregistré avec succès:', currentToken);
          } else {
            console.log('Impossible d\'obtenir le token.');
          }
        } else {
          console.log('Permission de notification refusée');
        }
      } else {
        console.log('Le navigateur ne supporte pas les service workers');
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des notifications:', error);
    }
  }
  
  async function sendTokenToServer(token) {
    try {
      // S'assurer que le token est bien une chaîne de caractères
      if (typeof token !== 'string') {
        throw new Error('Token invalide');
      }
  
      const response = await fetch('/api/save-fcm-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Ajouter Accept pour spécifier qu'on attend du JSON
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ 
          token: token // S'assurer que le token est envoyé dans un objet
        })
      });
  
      // Vérifier si la réponse est ok avant de parser le JSON
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Erreur HTTP: ${response.status} ${errText}`);
      }
  
      const data = await response.json();
      console.log('Token sauvegardé:', data);
    } catch (error) {
      console.error('Erreur lors de l\'envoi du token au serveur:', error);
      // Vous pouvez ajouter ici une logique pour réessayer plus tard
    }
  }
  // Gérer les messages reçus en premier plan
  messaging.onMessage((payload) => {
    console.log('Message reçu:', payload);
    // Créer et afficher une notification personnalisée
    new Notification(payload.notification.title, {
      body: payload.notification.body,
      icon: '/icon/favicon.ico'
    });
  });
  
  // Initialiser lors du chargement
  document.addEventListener('DOMContentLoaded', initializeFirebaseMessaging);