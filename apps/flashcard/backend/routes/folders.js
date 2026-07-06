const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const folders = db.prepare(`
    SELECT f.*, COUNT(d.id) as deck_count
    FROM folders f
    LEFT JOIN decks d ON d.folder_id = f.id
    GROUP BY f.id
    ORDER BY f.created_at DESC
  `).all();
  res.json(folders);
});

router.post('/', (req, res) => {
  const { name, user_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('INSERT INTO folders (name, user_id) VALUES (?, ?)').run(name, user_id || null);
  const folder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(folder);
});

router.put('/:id', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare('UPDATE folders SET name = ? WHERE id = ?').run(name, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'folder not found' });
  res.json(db.prepare('SELECT * FROM folders WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  // Decks referencing this folder become top-level (folder_id = NULL via ON DELETE SET NULL)
  const result = db.prepare('DELETE FROM folders WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'folder not found' });
  res.json({ deleted: req.params.id });
});

module.exports = router;
