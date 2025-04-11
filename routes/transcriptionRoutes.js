// routes/transcriptionRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { transcribeAudio } = require('../public/utils/transcript.js');

// Multer configuration
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/flac', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/mpga', 'audio/m4a', 'audio/ogg', 'audio/opus', 'audio/wav', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a valid audio file.'));
    }
  }
});

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error('No file uploaded or unsupported file type.');
    }

    const originalExtension = path.extname(req.file.originalname) || '';
    const newFilePath = `${req.file.path}${originalExtension}`;
    fs.renameSync(req.file.path, newFilePath);

    const transcriptionText = await transcribeAudio(newFilePath);

    res.json({ success: true, text: transcriptionText });
  } catch (error) {
    console.error('Transcription error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
