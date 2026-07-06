const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    const result = stmt.run(username, hash);
    res.status(201).json({ id: result.lastInsertRowid, username });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'username already taken' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) return res.status(401).json({ error: 'invalid credentials' });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'invalid credentials' });

  res.json({ id: user.id, username: user.username });
});

module.exports = router;
