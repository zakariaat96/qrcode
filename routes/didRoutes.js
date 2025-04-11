require('dotenv').config();
const express = require('express');
const router = express.Router();
const cors = require('cors');



router.use('/did-proxy', cors(), async (req, res) => {
  try {
    const didApiUrl = `${process.env.DID_API_URL || 'https://api.d-id.com'}${req.path}`;
    const didResponse = await fetch(didApiUrl, {
      method: req.method,
      headers: {
        'Authorization': `Basic ${Buffer.from(process.env.DID_API_KEY).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });

    res.set('Access-Control-Allow-Origin', '*'); // Autorise toutes les origines
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (!didResponse.ok) {
      const errorText = await didResponse.text();
      return res.status(didResponse.status).json({ error: errorText });
    }

    const data = await didResponse.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
