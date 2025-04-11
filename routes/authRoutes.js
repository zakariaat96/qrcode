// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const path = require('path');
const { pool } = require('../db');

const router = express.Router();

// Middleware pour vérifier si l'utilisateur est authentifié
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Auth Google
router.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/dashboard');
  }
);

router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});



router.get('/dashboard', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'views', 'generate.html'), {
    headers: {
      'Cache-Control': 'no-cache'
    }
  });
});

router.get('/get-profile', isAuthenticated, async (req, res) => {
  try {
    const [results] = await pool.query('SELECT profile_photo FROM users WHERE id = ?', [req.user.id]);
    res.json({ profilePhoto: results[0].profile_photo });
  } catch (err) {
    console.error('Erreur récupération profil:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour l'inscription
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  const { pool } = require('../db');

  const today = new Date();
  const expiryDate = new Date();
  expiryDate.setMonth(today.getMonth() + 1);

  try {
    await pool.query(`
      INSERT INTO users (email, password, credits, subscription_start, subscription_end)
      VALUES (?, ?, ?, ?, ?)
    `, [email, password, 2, today, expiryDate]);
    res.json({ success: true, message: 'Inscription réussie avec 2 crédits gratuits !' });
  } catch (err) {
    console.error('Erreur inscription :', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
});

router.get('/get-credits', isAuthenticated, async (req, res) => {
  const { pool } = require('../db');
  const userId = req.user.id;
  try {
    const [results] = await pool.query('SELECT credits FROM users WHERE id = ?', [userId]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ credits: results[0].credits });
  } catch (err) {
    console.error('Error retrieving credits:', err);
    res.status(500).json({ error: 'Database error' });
  }
});


// nouveau 

router.post('/api/save-fcm-token', isAuthenticated, async (req, res) => {
  try {
    const { token } = req.body;
    
    // Validation du token
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ 
        error: 'Token invalide ou manquant' 
      });
    }

    await pool.query(
      'UPDATE users SET fcm_token = ? WHERE id = ?',
      [token, req.user.id]
    );

    return res.json({ 
      success: true, 
      message: 'Token FCM sauvegardé avec succès' 
    });

  } catch (error) {
    console.error('Erreur lors de la sauvegarde du token FCM:', error);
    return res.status(500).json({ 
      error: 'Erreur serveur',
      details: error.message 
    });
  }
});

module.exports = router;
