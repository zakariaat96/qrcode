
let totalPages = 5;
let currentPage = 1;
let itemsPerPage = 10;
let currentFilter = 'all';
let currentSearch = '';

async function loadHistory(filter = 'all', search = '', page = 1) {
    const response = await fetch(`/qrcodes?filter=${filter}&search=${encodeURIComponent(search)}&page=${page}`, {
        method: 'GET',
        credentials: 'include'
    });
    const data = await response.json();
    //console.log('Received data:', data);

    const historyList = document.getElementById('qr-history-list');
    // Nettoyage du conteneur sans innerHTML direct
    while (historyList.firstChild) {
        historyList.removeChild(historyList.firstChild);
    }

    data.qrcodes.forEach(item => {
        const div = document.createElement('div');
        div.className = 'qr-history-item';
        div.addEventListener('click', () => viewQRDetails(item.id));

        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        dateDiv.textContent = new Date(item.created_at).toLocaleDateString();

        const titleDiv = document.createElement('div');
        titleDiv.className = 'title';
        titleDiv.textContent = (item.property_info || '').substring(0, 30) + '...';

        const statsDiv = document.createElement('div');
        statsDiv.className = 'stats';

        const interactionSpan = document.createElement('span');
        interactionSpan.textContent = `👥 ${item.total_interactions || 0} interactions`;

        const sessionsSpan = document.createElement('span');
        sessionsSpan.textContent = `💬 ${item.session_count || 0} sessions`;

        statsDiv.appendChild(interactionSpan);
        statsDiv.appendChild(sessionsSpan);

        div.appendChild(dateDiv);
        div.appendChild(titleDiv);
        div.appendChild(statsDiv);

        historyList.appendChild(div);
    });
    }

async function viewQRDetails(qrcodeId) {
    const sessionsModal = document.getElementById('sessionsModal');
    const sessionsList = document.getElementById('sessionsList');
    // Ajouter la classe "modal-open" pour masquer l'historique
    document.body.classList.add('modal-open');

    const response = await fetch(`/qrcodes/${qrcodeId}/sessions`, {
        method: 'GET',
        credentials: 'include'
    });
    const data = await response.json();
    const sessions = data.sessions;

    // Nettoyer la liste
    while (sessionsList.firstChild) {
        sessionsList.removeChild(sessionsList.firstChild);
    }

    sessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-item';

        const h3 = document.createElement('h3');
        h3.textContent = `Session #${session.id}`;
        sessionDiv.appendChild(h3);

        const dateP = document.createElement('p');
        dateP.textContent = `Date: ${new Date(session.date).toLocaleString()}`;
        sessionDiv.appendChild(dateP);

        const durationP = document.createElement('p');
        durationP.textContent = `Duration: ${session.duration} minutes`;
        sessionDiv.appendChild(durationP);

        const interactionsP = document.createElement('p');
        interactionsP.textContent = `Interactions: ${session.interactions}`;
        sessionDiv.appendChild(interactionsP);

        const statusP = document.createElement('p');
        statusP.textContent = `Status: ${session.status}`;
        sessionDiv.appendChild(statusP);

        const smallEl = document.createElement('small');
        smallEl.style.color = '#6e48aa';
        smallEl.style.cursor = 'pointer';
        smallEl.textContent = 'Click to view chat transcript';
        smallEl.addEventListener('click', () => openChatTranscript(session.id));
        sessionDiv.appendChild(smallEl);

        sessionsList.appendChild(sessionDiv);
    });

    const totalInteractions = sessions.reduce((sum, s) => sum + s.interactions, 0);
    document.getElementById('totalInteractions').textContent = `Total Interactions: ${totalInteractions}`;
    document.getElementById('totalSessions').textContent = `Total Sessions: ${sessions.length}`;

    sessionsModal.style.display = 'flex';
    }






function closeSessionsModal() {
    document.getElementById('sessionsModal').style.display = 'none'; // Cache la modale
    document.body.classList.remove('modal-open'); // Réaffiche l'historique
}

// Fonction pour ouvrir le chat transcript réel
async function openChatTranscript(sessionId) {
    // Création dynamique d'un conteneur chatModal
    const chatModal = document.createElement('div');
    chatModal.className = 'chat-modal';
    chatModal.style.display = 'block';

    const response = await fetch(`/sessions/${sessionId}/chat`, {
        method: 'GET',
        credentials: 'include'
    });
    if (!response.ok) {
        console.error('Erreur lors du chargement du chat:', response.status, response.statusText);
        return;
    }
    const chatData = await response.json();

    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';

    const chatHeader = document.createElement('div');
    chatHeader.className = 'chat-header';

    const h2 = document.createElement('h2');
    h2.textContent = `Chat Transcript - Session #${sessionId}`;
    chatHeader.appendChild(h2);

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => {
        closeChatModal(closeButton);
    });
    chatHeader.appendChild(closeButton);

    chatContainer.appendChild(chatHeader);

    const chatMessagesDiv = document.createElement('div');
    chatMessagesDiv.className = 'chat-messages';

    chatData.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.type}-message`;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'content';
        contentDiv.textContent = msg.message;

        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'timestamp';
        timestampDiv.textContent = msg.timestamp;

        messageDiv.appendChild(contentDiv);
        messageDiv.appendChild(timestampDiv);
        chatMessagesDiv.appendChild(messageDiv);
    });

    chatContainer.appendChild(chatMessagesDiv);
    chatModal.appendChild(chatContainer);
    document.body.appendChild(chatModal);
    }


function closeChatModal(button) {
    button.closest('.chat-modal').remove();
}


function filterHistory(filter, e) {
    currentFilter = filter;
    currentPage = 1;
    loadHistory(currentFilter, currentSearch, currentPage);
    
    // Mettre à jour l'onglet actif
    document.querySelectorAll('.history-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    }


function searchHistory(query) {
    currentSearch = query;
    if (query.trim() === '') {
        // Si pas de recherche, on recharge l'historique normal
        loadHistory(currentFilter, currentSearch, currentPage);
        return;
    }
    // Faire une recherche côté serveur :
    loadHistory(currentFilter, currentSearch, currentPage);
}

async function handleLogout() {
try {
    const response = await fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    });
    
    if (response.ok) {
        window.location.href = '/login';
    } else {
        alert('Erreur lors de la déconnexion');
    }
} catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la déconnexion');
}
}

async function generateQRCode() {
const propertyInfo = document.getElementById('propertyInfo').value;
if (!propertyInfo.trim()) {
alert('Please enter property information');
return;
}

// 1. Afficher le spinner
const spinner = document.getElementById('loadingSpinner');
spinner.style.display = 'block';

try {
const response = await fetch('/generate-qr', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ propertyInfo })
});

const data = await response.json();

// 2. Masquer le spinner dès qu’on a reçu la réponse
spinner.style.display = 'none';

if (data.success) {
    const qrContainer = document.getElementById('qrcode-container');
    const qrImage = document.getElementById('qrcode-image');
    const downloadLink = document.getElementById('download-link');
    
    qrImage.src = data.qrCode;
    downloadLink.href = data.qrCode;
    qrContainer.style.display = 'block';

    loadHistory(currentFilter, currentSearch, currentPage);

    if (data.remainingCredits !== undefined) {
        document.getElementById('credits-count').textContent = data.remainingCredits;
    }
} else {
    alert('Vos crédits sont épuisés. Veuillez mettre à niveau votre plan pour continuer.');
}
} catch (error) {
console.error('Error:', error);
spinner.style.display = 'none'; // Masquer le spinner même s’il y a une erreur
alert('Nous rencontrons actuellement un problème technique. Notre équipe travaille dessus. Merci de votre patience.');
}
}





    
async function fetchCredits() {
    const response = await fetch('/get-credits');
    const data = await response.json();
    //console.log('Credits data:', data);
    document.getElementById('credits-count').textContent = data.credits;
}


    


let isRecording = false;
let mediaRecorder = null;
let recordedChunks = [];

async function setupRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' }); // Utilisez le format WebM pour plus de compatibilité
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            try {
                const response = await fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                if (result.success) {
                    document.getElementById('propertyInfo').value = result.text; // Remplacez le contenu du textarea par la transcription
                } else {
                    alert('Error transcribing audio: ' + result.error);
                }
            } catch (error) {
                console.error('Error sending audio to server:', error);
                alert('Failed to send audio to server');
            } finally {
                recordedChunks = []; // Réinitialisez les chunks audio après l'envoi
            }
        };
    } catch (err) {
        console.error('Error accessing microphone:', err);
        alert('Unable to access microphone');
    }
}

document.getElementById('startRecord').addEventListener('click', () => {
    if (mediaRecorder) {
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('startRecord').style.display = 'none';
        document.getElementById('stopRecord').style.display = 'flex';
        document.getElementById('recordingStatus').style.display = 'block';
    } else {
        setupRecording().then(() => {
            mediaRecorder.start();
            isRecording = true;
            document.getElementById('startRecord').style.display = 'none';
            document.getElementById('stopRecord').style.display = 'flex';
            document.getElementById('recordingStatus').style.display = 'block';
        });
    }
});

document.getElementById('stopRecord').addEventListener('click', () => {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('startRecord').style.display = 'flex';
        document.getElementById('stopRecord').style.display = 'none';
        document.getElementById('recordingStatus').style.display = 'none';
    }
});



document.getElementById('upgrade-plan').addEventListener('click', () => {
    window.location.href = '/plans'; // Redirige vers la page des plans
});


function handleLogout() {
    fetch('/logout', { 
        method: 'GET',
        credentials: 'include' // Inclut les cookies de session
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/'; // Redirige vers la page d'accueil
        } else {
            alert('Erreur lors de la déconnexion');
        }
    })
    .catch(error => {
        console.error('Erreur :', error);
        alert('Erreur lors de la déconnexion');
    });
}

// Chargement dès que la page est prête
document.addEventListener('DOMContentLoaded', () => {
    loadHistory(); // Charger l'historique réel
    setupRecording();
});

const hamburgerBtn = document.getElementById('hamburgerBtn');
    hamburgerBtn.addEventListener('click', () => {
        document.body.classList.toggle('sidebar-open');
    });







let propertyImageUploaded = false;
let qrCodeUploaded = false;

function updateCombineButton() {
const combineButton = document.getElementById('combineButton');
if (propertyImageUploaded && qrCodeUploaded) {
combineButton.style.display = 'block';
}
}

document.getElementById('propertyImage').addEventListener('change', function(e) {
const file = e.target.files[0];
if (file) {
document.getElementById('propertyFileName').textContent = file.name;
const reader = new FileReader();
reader.onload = function(e) {
    document.getElementById('propertyPreviewImg').src = e.target.result;
    document.getElementById('propertyPreview').style.display = 'block';
    propertyImageUploaded = true;
    updateCombineButton();
};
reader.readAsDataURL(file);
}
});

document.getElementById('qrCodeImage').addEventListener('change', function(e) {
const file = e.target.files[0];
if (file) {
document.getElementById('qrFileName').textContent = file.name;
const reader = new FileReader();
reader.onload = function(e) {
    document.getElementById('qrPreviewImg').src = e.target.result;
    document.getElementById('qrPreview').style.display = 'block';
    qrCodeUploaded = true;
    updateCombineButton();
};
reader.readAsDataURL(file);
}
});

async function combineImages() {
const propertyImage = document.getElementById('propertyImage').files[0];
const qrCodeImage = document.getElementById('qrCodeImage').files[0];

if (!propertyImage || !qrCodeImage) {
alert('Please upload both images first');
return;
}

const formData = new FormData();
formData.append('propertyImage', propertyImage);
formData.append('qrCodeImage', qrCodeImage);

try {
const response = await fetch('/combine-images', {
    method: 'POST',
    body: formData
});

const data = await response.json();
if (data.success) {
    document.getElementById('finalImage').src = data.combinedImage;
    document.getElementById('downloadFinal').href = data.combinedImage;
    document.getElementById('finalImageContainer').style.display = 'block';
} else {
    alert('Error combining images');
}
} catch (error) {
console.error('Error:', error);
alert('Error processing images');
}
}


document.querySelectorAll('.menu-item').forEach(item => {
item.addEventListener('click', () => {
document.querySelectorAll('.menu-item').forEach(i => {
  i.classList.remove('active');
  i.querySelector('.indicator')?.classList.remove('active');
});
item.classList.add('active');
item.querySelector('.indicator')?.classList.add('active');
});
});

document.getElementById("editBtn").addEventListener("click", () => {
window.location.href = "/update-data"; 
});


async function loadProfilePhoto() {
try {
const response = await fetch('/get-profile');
const data = await response.json();

const profileImg = document.getElementById('profilePhoto');

if (data.profilePhoto) {
profileImg.src = data.profilePhoto;
profileImg.style.width = '20px';
profileImg.style.height = '20px';
} else {
// Suppression sécurisée de l'image existante
while (profileImg.firstChild) {
profileImg.removeChild(profileImg.firstChild);
}

// Création sécurisée du SVG via createElement
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("class", "app-logo");
svg.setAttribute("viewBox", "0 0 24 24");

const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
path.setAttribute("fill", "#6c5ce7");
path.setAttribute("d", "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm0 14c-2.03 0-4.43-.82-6.14-2.88C7.55 15.8 9.68 15 12 15s4.45.8 6.14 2.12C16.43 19.18 14.03 20 12 20z");

svg.appendChild(path);
profileImg.appendChild(svg);
}
} catch (error) {
console.error('Erreur chargement profil:', error);
}
}


// Ajouter au onload existant
window.onload = function() {
fetchCredits();
loadProfilePhoto();

const editBtn = document.getElementById('editBtn');
const tooltip = document.getElementById('tooltip');

editBtn.addEventListener('mouseover', function(event) {
  // Récupère les dimensions et la position du bouton
  const rect = editBtn.getBoundingClientRect();
  // Positionne le tooltip (ici centré horizontalement sous le bouton)
  tooltip.style.top = (rect.bottom + window.scrollY + 5) + 'px';
  tooltip.style.left = (rect.left + window.scrollX + rect.width / 2) + 'px';
  tooltip.style.transform = 'translateX(-50%)';
  tooltip.style.display = 'block';
});

editBtn.addEventListener('mouseout', function() {
  tooltip.style.display = 'none';
});


};