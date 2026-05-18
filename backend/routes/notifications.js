const express = require('express');
const db = require('../db');
const { send } = require('../discord');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications ORDER BY
      CASE status WHEN 'pending' THEN 0 WHEN 'sent' THEN 1 ELSE 2 END,
      next_fire_at ASC
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { title, message, scheduled_at, repeat_interval_min, priority } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  if (!scheduled_at) return res.status(400).json({ error: 'scheduled_at required' });

  const result = db.prepare(`
    INSERT INTO notifications (title, message, scheduled_at, repeat_interval_min, priority, next_fire_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title || null,
    message,
    scheduled_at,
    repeat_interval_min || null,
    priority ?? 0,
    scheduled_at
  );

  res.status(201).json(db.prepare('SELECT * FROM notifications WHERE id = ?').get(result.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'not found' });

  const { title, message, scheduled_at, repeat_interval_min, priority } = req.body;
  const newScheduled = scheduled_at ?? n.scheduled_at;
  // Only reset next_fire_at when scheduled_at explicitly changes — otherwise keep
  // the current next_fire_at so repeating intervals aren't disrupted
  const newNextFire = scheduled_at !== undefined ? scheduled_at : n.next_fire_at;

  db.prepare(`
    UPDATE notifications
    SET title = ?, message = ?, scheduled_at = ?, repeat_interval_min = ?,
        priority = ?, next_fire_at = ?, status = 'pending'
    WHERE id = ?
  `).run(
    title !== undefined ? (title || null) : n.title,
    message ?? n.message,
    newScheduled,
    repeat_interval_min !== undefined ? (repeat_interval_min || null) : n.repeat_interval_min,
    priority !== undefined ? priority : n.priority,
    newNextFire,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare(`
    UPDATE notifications SET status = 'cancelled' WHERE id = ?
  `).run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'not found' });
  res.json({ cancelled: req.params.id });
});

router.post('/:id/fire', async (req, res) => {
  const n = db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id);
  if (!n) return res.status(404).json({ error: 'not found' });

  try {
    await send(n.title, n.message);
    db.prepare(`UPDATE notifications SET last_sent_at = datetime('now') WHERE id = ?`).run(n.id);
    res.json({ fired: true });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;
