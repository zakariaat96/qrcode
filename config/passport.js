// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { pool } = require('../db');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID, 
  clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
  callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    const [user] = await pool.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);

    if (user[0]) {
      return done(null, user[0]);
    } else {
      const newUser = {
        google_id: profile.id,
        display_name: profile.displayName,
        first_name: profile.name.givenName,
        last_name: profile.name.familyName,
        email: (profile.emails[0].value || '').toLowerCase(),
        profile_photo: profile.photos[0].value,
        credits: 2
      };

      const result = await pool.query('INSERT INTO users SET ?', [newUser]);
      const [createdUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result[0].insertId]);
      return done(null, createdUser[0]);
    }
  } catch (error) {
    console.error('Error in Google strategy:', error);
    return done(error);
  }
}
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});
