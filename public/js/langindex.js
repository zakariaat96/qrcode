//langindex.js - Separation of concerns for Langchain response handling
import { handleDIDStreaming } from '../../js/streaming-client-api.js';

document.addEventListener('DOMContentLoaded', () => {
  const userInputField = document.getElementById('user-input-field');
  const startButton = document.getElementById('talk-button');
  const responseContainer = document.getElementById('response-container');
  const toggleDIDCheckbox = document.getElementById('toggleDID');
  
  const pathSegments = window.location.pathname.split('/');
  const propertyId = pathSegments[pathSegments.indexOf('chat') + 1];
  const urlParams = new URLSearchParams(window.location.search);
  const userSessionId = urlParams.get('session');
  
  let lastResponse = '';

  startButton.addEventListener('click', async () => {
    const userInput = userInputField.value;
    
    // Afficher l'indicateur de réflexion
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.className = 'thinking-dots';
    // Create dots individually to avoid innerHTML
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.className = 'dot';
        thinkingIndicator.appendChild(dot);
    }
    responseContainer.appendChild(thinkingIndicator);
    
    try {
        const response = await fetch(`/query/${propertyId}?session=${userSessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userInput }),
        });

        if (!response.ok) {
            throw new Error(`Server responded with status code: ${response.status}`);
        }

        const responseData = await response.json();
        let chatText = responseData.answer ? responseData.answer.trim() : '';

        if (chatText === "I don't know.") {
            chatText = "That information is not in my knowledge base, please ask another question.";
        }

        lastResponse = chatText;
        
        // Supprimer l'indicateur de réflexion
        responseContainer.removeChild(thinkingIndicator);

        // Commencer par l'avatar si l'option est activée
        if (toggleDIDCheckbox.checked) {
            // Attendre que l'avatar commence à parler
            await handleDIDStreaming(lastResponse);
            
            // Petit délai pour synchroniser avec le début de la parole
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        // Ensuite, afficher le texte progressivement
        const typingSound = new Audio('/audio/typing.wav');
        typingSound.loop = true;
        typingSound.play();
        
        responseContainer.textContent = ''; // Use textContent instead of innerHTML
        await streamText(chatText, responseContainer, 50);
        
        typingSound.loop = false;
        typingSound.pause();
        typingSound.currentTime = 0;

    } catch (error) {
        console.error('Error sending query to the server:', error);
        responseContainer.removeChild(thinkingIndicator);
        responseContainer.textContent = error.message.includes('404') 
            ? 'Error: Property ID not found or invalid.'
            : 'Error: Could not get a response.';
    }
  });

  let shouldStreamToDID = false;

  toggleDIDCheckbox.addEventListener('change', () => {
    shouldStreamToDID = toggleDIDCheckbox.checked;
  });

  function streamText(responseText, container, interval = 50) {
    return new Promise((resolve) => {
        const words = responseText.split(' ');
        let currentIndex = 0;

        const wordStreamer = setInterval(() => {
            if (currentIndex < words.length) {
                // Append text node instead of using innerHTML +=
                container.appendChild(document.createTextNode(words[currentIndex] + ' '));
                currentIndex++;
            } else {
                clearInterval(wordStreamer);
                resolve();
            }
        }, interval);
    });
  }




 

  // Function to use local speech synthesis voice to read out text (Voice requested must be installed)
  function speak(text) {
    const synth = window.speechSynthesis; // Reference to speech synthesis interface

    // Function to set the voice and speak the text
    function setVoiceAndSpeak() {
      const voices = synth.getVoices();
      
      //let selectedVoice = voices.find(voice => voice.name === "Microsoft  Vivienne Multilingue (Femme - Adulte) - Français (France)");
      //let selectedVoice = voices.find(voice => voice.name === "Microsoft  Vivienne Multilingue (Femme - Adulte) - Français (France)");
      let selectedVoice = voices.find(voice => voice.name === "Microsoft  Henri (Homme) - Français (France)");
      

      // Default to an English voice if the desired voice isn't found
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'fr-FR');
        console.log('Desired voice not found, using default English voice:', selectedVoice ? selectedVoice.name : 'none found');
      }

      const utterance = new SpeechSynthesisUtterance(text);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Speak the text
      synth.speak(utterance);
    }

    // Handle case where voices haven't loaded yet
    if (synth.getVoices().length === 0) {
      synth.onvoiceschanged = () => {
        setVoiceAndSpeak();
        synth.onvoiceschanged = null; // Remove event listener after setting voice
      };
    } else {
      setVoiceAndSpeak();
    }
  }

});










