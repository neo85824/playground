const express = require('express');
const db = require('../db');

const router = express.Router();

router.post('/learn', (req, res) => {
  const { user_id, deck_id, card_id, knew_it } = req.body;
  if (deck_id === undefined || card_id === undefined || knew_it === undefined) {
    return res.status(400).json({ error: 'deck_id, card_id, and knew_it required' });
  }
  const result = db.prepare(
    'INSERT INTO learn_sessions (user_id, deck_id, card_id, knew_it) VALUES (?, ?, ?, ?)'
  ).run(user_id || null, deck_id, card_id, knew_it ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/quiz', (req, res) => {
  const { user_id, deck_id, score, total, mode } = req.body;
  if (deck_id === undefined || score === undefined || total === undefined) {
    return res.status(400).json({ error: 'deck_id, score, and total required' });
  }
  const result = db.prepare(
    'INSERT INTO quiz_results (user_id, deck_id, score, total, mode) VALUES (?, ?, ?, ?, ?)'
  ).run(user_id || null, deck_id, score, total, mode || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

module.exports = router;
