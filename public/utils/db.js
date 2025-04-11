// public/utils/db.js
const { pool } = require('../../db');

async function insertQRCode(userId, propertyInfo, qrCodeDataUrl, propertyUuid) {
  const [result] = await pool.execute(
    'INSERT INTO qrcodes (user_id, property_info, qr_code_data, property_uuid) VALUES (?, ?, ?, ?)',
    [userId, propertyInfo, qrCodeDataUrl, propertyUuid]
  );
  return result.insertId;
}

async function getUserQRCodes(userId, filter = 'all', search = '', page = 1, itemsPerPage = 10) {
  userId = Number(userId);
  const p = Number(page);
  const ipp = Number(itemsPerPage);
  const offset = (p - 1) * ipp;

  let where = 'WHERE q.user_id = ?';
  const params = [userId];

  if (search && search.trim() !== '') {
    where += ' AND q.property_info LIKE ?';
    params.push(`%${search}%`);
  }

  const countQuery = `SELECT COUNT(DISTINCT q.id) as total FROM qrcodes q ${where}`;
  const [countRows] = await pool.query(countQuery, params);
  const total = countRows[0].total;
  let totalPages = Math.ceil(total / ipp);

  let mainQuery = 'SELECT q.id, q.property_info, q.qr_code_data, q.property_uuid, q.created_at, ' +
                  'COUNT(s.id) as session_count, ' +
                  'COALESCE(SUM(s.interactions), 0) as total_interactions ' +
                  'FROM qrcodes q ' +
                  'LEFT JOIN sessions s ON q.id = s.qrcode_id ' +
                  where + ' ' +
                  'GROUP BY q.id, q.property_info, q.qr_code_data, q.property_uuid, q.created_at ' +
                  'ORDER BY q.created_at DESC';

  if (filter === 'recent') {
    mainQuery += ' LIMIT 5';
    totalPages = 1;
  } else {
    mainQuery += ' LIMIT ? OFFSET ?';
    params.push(ipp, offset);
  }

  const [rows] = await pool.query(mainQuery, params);

  return { rows, page: p, totalPages };
}

async function getQRSessions(qrcodeId) {
  const [rows] = await pool.execute('SELECT * FROM sessions WHERE qrcode_id = ? ORDER BY date DESC', [qrcodeId]);
  return rows;
}

async function insertSession(qrcodeId, interactions, duration, status = 'InProgress', transcript = '[]') {
  const [result] = await pool.execute(
    'INSERT INTO sessions (qrcode_id, date, duration, interactions, status, transcript) VALUES (?, NOW(), ?, ?, ?, ?)',
    [qrcodeId, duration, interactions, status, transcript]
  );
  return result.insertId;
}

async function updateSessionTranscript(sessionId, userMessage, botMessage) {
  const [rows] = await pool.execute('SELECT transcript, interactions FROM sessions WHERE id = ?', [sessionId]);
  if (rows.length === 0) {
    throw new Error('Session non trouvée');
  }

  let { transcript, interactions } = rows[0];
  if (!transcript) transcript = '[]';
  let chatData = [];
  try {
    chatData = JSON.parse(transcript);
  } catch (e) {
    console.error('Erreur parsing transcript JSON:', e);
    chatData = [];
  }

  chatData.push({ type: 'user', message: userMessage, timestamp: new Date().toISOString() });
  chatData.push({ type: 'bot', message: botMessage, timestamp: new Date().toISOString() });

  interactions = interactions + 1;
  const updatedTranscript = JSON.stringify(chatData);

  await pool.execute('UPDATE sessions SET transcript = ?, interactions = ? WHERE id = ?', [updatedTranscript, interactions, sessionId]);
}

async function getQRCodeByUuid(propertyUuid) {
  const [rows] = await pool.execute('SELECT * FROM qrcodes WHERE property_uuid = ?', [propertyUuid]);
  return rows[0] || null;
}

async function getChatDataForSession(sessionId) {
  const [rows] = await pool.execute('SELECT transcript FROM sessions WHERE id = ? LIMIT 1', [sessionId]);
  if (rows.length === 0) {
    return [];
  }

  const { transcript } = rows[0];
  if (!transcript) {
    return [];
  }

  try {
    const chatData = JSON.parse(transcript);
    return chatData;
  } catch (error) {
    console.error('Erreur parse transcript:', error);
    return [];
  }
}

module.exports = {
  insertQRCode,
  getUserQRCodes,
  getQRSessions,
  insertSession,
  updateSessionTranscript,
  getQRCodeByUuid,
  getChatDataForSession
};
