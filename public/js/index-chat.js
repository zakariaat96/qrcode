// Fonction pour effacer le champ de saisie lorsque l'utilisateur clique dessus
document.getElementById('user-input-field').addEventListener('click', function () {
    this.value = ''; // Efface le champ de saisie
    this.style.height = 'auto'; // Réinitialise la hauteur
});

// Vérifie si l'API de reconnaissance vocale est disponible
if ('webkitSpeechRecognition' in window) {
var recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = 'fr-FR';
    
    
// Écouteur pour le bouton de reconnaissance vocale (mousedown)
document.getElementById('voice-typing-button').addEventListener('mousedown', function() {
    recognition.start();
    this.style.background = '#ff0000';
});

// Écouteur pour le bouton de reconnaissance vocale (mouseup)
document.getElementById('voice-typing-button').addEventListener('mouseup', function() {
    recognition.stop();
    this.style.background = '#3312d6';
    // Déclenche automatiquement l'envoi après la reconnaissance
    setTimeout(() => {
        document.getElementById('talk-button').click();
    }, 500);
});

// Gestionnaire pour l'événement 'onend' de la reconnaissance vocale
recognition.onend = function() {
    document.getElementById('voice-typing-button').style.background = '#3312d6';
};

// Gestionnaire pour l'événement 'onresult' de la reconnaissance vocale
recognition.onresult = function (event) {
    var final_transcript = '';
    for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
        }
    }
    document.getElementById('user-input-field').value = final_transcript;
};
} else {
alert("Web Speech API is not supported in this browser.");
}

// Écouteur pour annuler la synthèse vocale si la touche "Échap" est pressée
document.addEventListener('keydown', (event) => {
    if (event.key === "Escape") {
        window.speechSynthesis.cancel();
        console.log("Speech synthesis cancelled.");
    }



});

