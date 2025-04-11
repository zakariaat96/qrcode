// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); 
const { authenticateAdmin } = require('./adminAuthRoutes');



router.use('/hidden-admin-orbicall', authenticateAdmin);



// routes/adminRoutes.js
router.get('/hidden-admin-orbicall/stats', async (req, res) => {
    try {
      // 1) Total users
      const [usersCountRows] = await pool.query(`SELECT COUNT(*) AS totalUsers FROM users`);
      const totalUsers = usersCountRows[0].totalUsers;
  
      // 2) Nombre total de QR codes
      const [qrCountRows] = await pool.query(`SELECT COUNT(*) AS totalQRCodes FROM qrcodes`);
      const totalQRCodes = qrCountRows[0].totalQRCodes;
  
      // 3) Scans du jour
      const [todayScansRows] = await pool.query(`
        SELECT COUNT(*) AS totalScansToday
        FROM sessions
        WHERE DATE(date) = CURDATE()
      `);
      const totalScansToday = todayScansRows[0].totalScansToday;
  
      // 4) Revenue = somme des paiements du mois en cours
      // (si tu n'as pas de table "payments", tu peux créer une table
      // ou simplement laisser 0 pour l'instant)
      let totalRevenue = 0;
      try {
        const [revRows] = await pool.query(`
          SELECT SUM(amount) AS monthlyRevenue
          FROM payments
          WHERE MONTH(created_at) = MONTH(CURDATE())
            AND YEAR(created_at) = YEAR(CURDATE())
        `);
        totalRevenue = revRows[0].monthlyRevenue || 0;
      } catch (e) {
        // En cas d'absence de table "payments"
        console.error('Pas de table payments ou autre problème:', e);
      }
  
      return res.json({
        totalUsers,
        totalQRCodes,
        totalScansToday,
        totalRevenue,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erreur stats' });
    }
  });
//
// 2) Récupération de la liste des utilisateurs
//
// routes/adminRoutes.js
router.get('/hidden-admin-orbicall/users', async (req, res) => {
    try {
      // Si on veut juste la table users telle quelle :
      // const [rows] = await pool.query(`SELECT * FROM users ORDER BY created_at DESC`);
  
      // Si on veut le count de qrcodes par user, on fait :
      const [rows] = await pool.query(`
        SELECT 
          u.id,
          u.display_name,
          u.first_name,
          u.last_name,
          u.email,
          u.subscription_type,
          u.created_at AS joinDate,
          COUNT(q.id) AS qrCodesCount
        FROM users AS u
        LEFT JOIN qrcodes q ON q.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `);
  
      res.json(rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  });
  
//
// 3) Récupération de la liste des QR Codes
//
router.get('/hidden-admin-orbicall/qrcodes', async (req, res) => {
  try {
    const [qrcodes] = await pool.query(`
      SELECT id, user_id, property_info, qr_code_data, property_uuid, created_at
      FROM qrcodes
      ORDER BY created_at DESC
    `);

    return res.json(qrcodes);

  } catch (error) {
    console.error('Erreur récupération qrcodes:', error);
    return res.status(500).json({ error: 'Erreur récupération qrcodes' });
  }
});

// routes/adminRoutes.js
router.get('/hidden-admin-orbicall/qrcodes/:id', async (req, res) => {
    try {
      const qrId = req.params.id;
      const [rows] = await pool.query(
        `SELECT * FROM qrcodes WHERE id = ?`,
        [qrId]
      );
      if (!rows || rows.length === 0) {
        return res.status(404).json({ error: 'QR Code non trouvé' });
      }
      // rows[0] contient la ligne
      res.json(rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erreur lors de la récupération du QR code' });
    }
  });


  const nodemailer = require('nodemailer');

  // Email configuration
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER || 'kymsaindou@gmail.com',
      pass: process.env.EMAIL_PASSWORD // You'll need to set this in your .env file
    }
  });
  
  // Enhanced getUsersByAudience function
  async function getUsersByAudience(audience) {
    let sql = 'SELECT id, email, subscription_type FROM users WHERE 1=1';
    
    switch (audience) {
      case 'premium':
        sql += ' AND subscription_type = "monthly"';
        break;
      case 'free':
        sql += ' AND (subscription_type IS NULL OR subscription_type = "")';
        break;
      case 'enterprise':
        sql += ' AND subscription_type = "enterprise"';
        break;
      // 'all' doesn't need additional filtering
    }
  
    const [rows] = await pool.query(sql);
    return rows;
  }
  
// routes/adminRoutes.js - Ajoutez cette route
const NotificationService = require('../public/utils/notificationService');

router.post('/hidden-admin-orbicall/notify', async (req, res) => {
  try {
    const {
      title,
      message,
      targetAudience,
      emailChecked,
      pushChecked,
      priority = 'normal'
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    // Get users based on target audience
    const users = await NotificationService.getUsersByAudience(targetAudience);
    const userIds = users.map(user => user.id);

    // Store notification in database
    const [result] = await pool.query(
      `INSERT INTO notifications (title, message, priority, target_audience) 
       VALUES (?, ?, ?, ?)`,
      [title, message, priority, targetAudience]
    );

    const notificationId = result.insertId;
    const promises = [];

    // Send emails if checked
    if (emailChecked) {
      promises.push(NotificationService.sendEmail(users, title, message, priority));
    }

    // Send push notifications if checked
    if (pushChecked) {
      promises.push(NotificationService.sendPushNotification(userIds, title, message, priority));
    }

    await Promise.all(promises);

    // Log success
    await pool.query(
      `INSERT INTO notification_logs (notification_id, type, status) 
       VALUES (?, ?, 'success')`,
      [notificationId, emailChecked ? 'email' : 'push']
    );

    res.json({ 
      success: true, 
      message: `Notification sent to ${users.length} users`,
      notificationId 
    });

  } catch (error) {
    console.error('Notification error:', error);
    res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
});
  
 
  

module.exports = router;
