
const { pool } = require('../../db');

const paymentUtils = {
  async recordPayment(userId, amount, paymentMethod, status = 'completed') {
    try {
      const [result] = await pool.query(
        `INSERT INTO payments (user_id, amount, payment_method, status) 
         VALUES (?, ?, ?, ?)`,
        [userId, amount, paymentMethod, status]
      );
      
      return result.insertId;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du paiement:', error);
      throw error;
    }
  }
};

module.exports = paymentUtils;