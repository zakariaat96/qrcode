// transcript.js
const fs = require("fs");
const Groq = require("groq-sdk");

// Initialize the Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function transcribeAudio(filePath) {
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath), // Path to the audio file
      model: "whisper-large-v3", // Transcription model
      response_format: "json", // Response format
      temperature: 0.0, // Temperature setting
       language:"fr",
    });

    return transcription.text; // Return the transcribed text
  } catch (error) {
    console.error("Error during transcription:", error);
    throw error;
  }
}

module.exports = { transcribeAudio };
