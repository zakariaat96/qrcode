// server.js
require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 3001;
process.on('uncaughtException', (err) => {
  console.error('Erreur non capturée:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('Promesse rejetée non gérée:', err);
});

app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
});
