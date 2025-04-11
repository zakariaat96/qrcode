require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser'); // Importez cookie-parser
const cron = require('node-cron');
require('./config/passport'); // Load Passport configuration
const { pool } = require('./db');
const compression = require('compression')

// Create Express app
const app = express();

app.use(compression())


function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/');
}

// Middleware pour parser les cookies
app.use(cookieParser()); // Utilisez cookie-parser avant les routes

// Webhook routes before JSON parsing
const webhookRoutes = require('./routes/webhookRoutes');
app.use('/', webhookRoutes);

// JSON parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [process.env.DOMAINE, process.env.DID_API_URL],
  credentials: true // Autorise les cookies cross-origin
}));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, 
    httpOnly: true
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const didRoutes = require('./routes/didRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const contactRoutes = require('./routes/contactRoutes');
const transcriptionRoutes = require('./routes/transcriptionRoutes');
const qrRoutes = require('./routes/qrRoute');
const adminRoutes = require('./routes/adminRoutes');
const { router: adminAuthRoutes, authenticateAdmin } = require('./routes/adminAuthRoutes');

app.use('/', didRoutes);
app.use('/', authRoutes);
app.use('/', paymentRoutes);
app.use('/', contactRoutes);
app.use('/', transcriptionRoutes);
app.use('/', qrRoutes);
app.use('/', adminRoutes);
app.use('/', adminAuthRoutes); // Routes d'authentification admin

// Basic pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'home.html'));
});

app.get('/plans', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'pricing.html'));
});

app.get('/confirmation', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'success.html'));
});

app.get('/echec', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'cancel.html'));
});



// Route protégée pour le tableau de bord admin
app.get('/hidden-admin-orbicall/dashboard', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Route pour les détails du QR code
app.get('/hidden-admin-orbicall/qrcode-details.html', authenticateAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'qrcode-details.html'));
});


// app.js ou qrRoute.js (selon votre organisation)
app.get('/update-data', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'update-data.html'));
});





// Route pour l'API JSON
app.get('/api.json', (req, res) => {
  const apiPath = path.join(__dirname, 'api.json');
  if (fs.existsSync(apiPath)) {
    res.type('application/json');
    res.sendFile(apiPath);
  } else {
    res.status(404).send('API configuration file not found');
  }
});

// Cron job to reset credits for expired subscriptions
cron.schedule('0 0 * * *', () => {
  const today = new Date().toISOString().split('T')[0];
  pool.query(`
    UPDATE users 
    SET credits = 0, subscription_type = NULL 
    WHERE subscription_end < ?`, [today], (err) => {
    if (err) {
      console.error('Cron error:', err);
    } else {
      console.log('Credits reset for expired subscriptions.');
    }
  });
});




// Désactiver les headers qui peuvent révéler des informations
app.disable('x-powered-by');

// Middleware pour gérer toutes les routes non trouvées - à mettre à la fin de vos routes
app.use((req, res, next) => {
  res
    .status(200)  // Renvoie 200 au lieu de 404
    .sendFile(path.join(__dirname, 'views', '404.html'));
});

// Middleware de gestion d'erreur global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(200).sendFile(path.join(__dirname, 'views', '404.html'));
});

app.get('/api/stripe-links', (req, res) => {
  res.json({
    monthly: {
      price: process.env.MONTHLY_PRICE,
      link: process.env.MONTHLY_LINK
    },
    yearly: {
      price: process.env.YEARLY_PRICE,
      link: process.env.YEARLY_LINK
    }
  });
});


module.exports = app;