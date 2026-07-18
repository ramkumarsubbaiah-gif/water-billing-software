const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);

  if (!admin) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const passwordMatches = bcrypt.compareSync(password, admin.password_hash);
  if (!passwordMatches) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.isAdmin = true;
  req.session.username = admin.username;

  res.json({ success: true, username: admin.username });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /api/auth/session  -> check if currently logged in as admin
router.get('/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin), username: req.session ? req.session.username : null });
});

module.exports = router;
