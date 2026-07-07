const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const db = require('../db');

const router = express.Router();

const upload = multer({ dest: path.join(__dirname, '../uploads/') });

router.get('/', (req, res) => {
  const { folder_id } = req.query;
  let query = `
    SELECT d.*, COUNT(c.id) as card_count
    FROM decks d
    LEFT JOIN cards c ON c.deck_id = d.id
  `;
  const params = [];
  if (folder_id !== undefined) {
    query += folder_id === 'null' ? ' WHERE d.folder_id IS NULL' : ' WHERE d.folder_id = ?';
    if (folder_id !== 'null') params.push(folder_id);
  }
  query += ' GROUP BY d.id ORDER BY d.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'deck not found' });
  deck.cards = db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY position, id').all(req.params.id);
  res.json(deck);
});

router.post('/', (req, res) => {
  const { name, description, folder_id, user_id } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare(
    'INSERT INTO decks (name, description, folder_id, user_id) VALUES (?, ?, ?, ?)'
  ).run(name, description || null, folder_id || null, user_id || null);
  res.status(201).json(db.prepare('SELECT * FROM decks WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, description, folder_id } = req.body;
  const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'deck not found' });
  db.prepare('UPDATE decks SET name = ?, description = ?, folder_id = ? WHERE id = ?').run(
    name ?? deck.name,
    description !== undefined ? description : deck.description,
    folder_id !== undefined ? (folder_id || null) : deck.folder_id,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM decks WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM decks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'deck not found' });
  res.json({ deleted: req.params.id });
});

router.get('/:id/cards', (req, res) => {
  const cards = db.prepare('SELECT * FROM cards WHERE deck_id = ? ORDER BY position, id').all(req.params.id);
  res.json(cards);
});

router.post('/:id/cards', (req, res) => {
  const { word, translation, position } = req.body;
  if (!word || !translation) return res.status(400).json({ error: 'word and translation required' });
  let pos = position;
  if (pos === undefined) {
    pos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE deck_id = ?')
      .get(req.params.id).next;
  }
  const result = db.prepare(
    'INSERT INTO cards (deck_id, word, translation, position) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, word, translation, pos);
  res.status(201).json(db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid));
});

router.post('/:id/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });

  const deckId = req.params.id;
  const deck = db.prepare('SELECT id FROM decks WHERE id = ?').get(deckId);
  if (!deck) {
    fs.unlinkSync(req.file.path);
    return res.status(404).json({ error: 'deck not found' });
  }

  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const word = (row.word || row.Word || '').trim();
      const translation = (row.translation || row.Translation || '').trim();
      if (word && translation) rows.push({ word, translation });
    })
    .on('end', () => {
      fs.unlinkSync(req.file.path);
      if (rows.length === 0) return res.json({ imported: 0, skipped: 0 });

      const insert = db.prepare('INSERT INTO cards (deck_id, word, translation, position) VALUES (?, ?, ?, ?)');
      const insertMany = db.transaction((items, startPos) => {
        items.forEach((item, i) => insert.run(deckId, item.word, item.translation, startPos + i));
      });
      const startPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS next FROM cards WHERE deck_id = ?')
        .get(deckId).next;
      insertMany(rows, startPos);
      res.json({ imported: rows.length, skipped: 0 });
    })
    .on('error', (err) => {
      fs.unlinkSync(req.file.path);
      res.status(500).json({ error: err.message });
    });
});

// Cards due for spaced repetition today (or never reviewed)
router.get('/:id/due', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const cards = db.prepare(`
    SELECT * FROM cards
    WHERE deck_id = ? AND (due_date IS NULL OR due_date <= ?)
    ORDER BY due_date ASC, id ASC
  `).all(req.params.id, today);
  res.json(cards);
});

// Export deck as CSV
router.get('/:id/export', (req, res) => {
  const deck = db.prepare('SELECT name FROM decks WHERE id = ?').get(req.params.id);
  if (!deck) return res.status(404).json({ error: 'deck not found' });
  const cards = db.prepare(
    'SELECT word, translation FROM cards WHERE deck_id = ? ORDER BY position, id'
  ).all(req.params.id);
  const csv = [
    'word,translation',
    ...cards.map(c => `"${c.word.replace(/"/g, '""')}","${c.translation.replace(/"/g, '""')}"`)
  ].join('\n');
  const safeName = deck.name.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
  const encodedName = encodeURIComponent(deck.name);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}.csv"; filename*=UTF-8''${encodedName}.csv`
  );
  res.send(csv);
});

router.get('/:id/progress', (req, res) => {
  const progress = db.prepare(`
    SELECT c.id, c.word, c.translation,
      COUNT(ls.id) as attempts,
      SUM(CASE WHEN ls.knew_it THEN 1 ELSE 0 END) as correct
    FROM cards c
    LEFT JOIN learn_sessions ls ON ls.card_id = c.id
    WHERE c.deck_id = ?
    GROUP BY c.id
  `).all(req.params.id);
  res.json(progress);
});

module.exports = router;
