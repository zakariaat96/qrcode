const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const { pool } = require('../db');

// Middleware d'authentification admin
const authenticateAdmin = async (req, res, next) => {
  const token = req.cookies.admin_token; // Accédez au cookie admin_token
  if (!token) {
    return res.redirect('/hidden-admin-orbicall');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query('SELECT * FROM admins WHERE id = ?', [decoded.id]);

    if (!rows.length) {
      res.clearCookie('admin_token'); // Supprimez le cookie invalide
      return res.redirect('/hidden-admin-orbicall');
    }

    req.admin = rows[0];
    next();
  } catch (error) {
    res.clearCookie('admin_token'); // Supprimez le cookie invalide
    return res.redirect('/hidden-admin-orbicall');
  }
};

// Page d'authentification
router.get('/hidden-admin-orbicall', (req, res) => {
  const token = req.cookies.admin_token;
  if (token) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      return res.redirect('/hidden-admin-orbicall/dashboard');
    } catch (error) {
      res.clearCookie('admin_token');
    }
  }
  res.sendFile(path.join(__dirname, '../views', 'admin-auth.html'));
});




// Création compte admin
router.post('/api/hidden-admin-orbicall/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const [existing] = await pool.query('SELECT id FROM admins WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'INSERT INTO admins (email, password, username) VALUES (?, ?, ?)',
      [email, hashedPassword, username]
    );

    res.status(201).json({ message: 'Compte admin créé avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
});

// Connexion admin
router.post('/api/hidden-admin-orbicall/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const [admins] = await pool.query('SELECT * FROM admins WHERE email = ?', [email]);
    if (!admins.length) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const admin = admins[0];

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const token = jwt.sign(
      { id: admin.id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    await pool.query(
      'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id]
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Utilisez secure en production
      maxAge: 24 * 60 * 60 * 1000, // 24 heures
    });

    res.json({ message: 'Connexion réussie' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
});

// Déconnexion
router.get('/api/hidden-admin-orbicall/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.redirect('/hidden-admin-orbicall');
});

// Dashboard admin (protégé)
router.get('/hidden-admin-orbicall/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'admin.html'));
});

module.exports = {
  router,
  authenticateAdmin,
};