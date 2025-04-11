// routes/contactRoutes.js
const express = require('express');
const router = express.Router();
const { handleContactForm } = require('../public/utils/contact.js');

router.post('/contact', handleContactForm);

module.exports = router;
