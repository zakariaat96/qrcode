// utils/notificationService.js
const admin = require('firebase-admin');
const { pool } = require('../../db');
const nodemailer = require('nodemailer');

// Initialiser Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

class NotificationService {
  static async getUsersByAudience(audience) {
    let sql = 'SELECT id, email, fcm_token FROM users WHERE 1=1';
    
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

  static async sendEmail(users, title, message, priority) {
    for (const user of users) {
      try {
        await transporter.sendMail({
          from: '"Avatar Admin" <kymsaindou@gmail.com>',
          to: user.email,
          subject: priority === 'urgent' ? `🔴 URGENT: ${title}` : title,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #6e48aa;">${title}</h2>
              <p style="white-space: pre-line;">${message}</p>
              <hr>
              <p style="color: #666; font-size: 12px;">Message automatique de Avatar Admin Panel</p>
            </div>
          `
        });
      } catch (error) {
        console.error(`Failed to send email to ${user.email}:`, error);
        throw error;
      }
    }
  }

  static async sendPushNotification(userIds, title, messageContent, priority) {
    try {
      // Récupérer les tokens FCM des utilisateurs
      const [users] = await pool.query(
        'SELECT fcm_token FROM users WHERE id IN (?) AND fcm_token IS NOT NULL',
        [userIds]
      );

      const tokens = users.map(user => user.fcm_token).filter(Boolean);

      if (tokens.length === 0) {
        console.log('Aucun token FCM trouvé pour ces utilisateurs');
        return;
      }

      const message = {
        notification: {
          title: title,
          body: messageContent
        },
        data: {
          priority: priority
        },
        tokens: tokens // Firebase permet d'envoyer à plusieurs tokens à la fois
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Notifications push envoyées avec succès:', response);

      return response;
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }


  static async getUsersByAudience(audience) {
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
    }

    const [rows] = await pool.query(sql);
    return rows;
  }
}


module.exports = NotificationService;