const express = require('express');
const db = require('../db');

const router = express.Router();

function sm2(quality, repetitions, easeFactor, intervalDays) {
  let reps = repetitions;
  let ef = easeFactor;
  let interval = intervalDays;

  if (quality >= 3) {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ef);
    reps++;
  } else {
    reps = 0;
    interval = 1;
  }

  ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  ef = Math.max(1.3, Math.round(ef * 1000) / 1000);

  return { repetitions: reps, easeFactor: ef, intervalDays: interval };
}

router.put('/:id', (req, res) => {
  const { word, translation, position } = req.body;
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'card not found' });
  db.prepare('UPDATE cards SET word = ?, translation = ?, position = ? WHERE id = ?').run(
    word ?? card.word,
    translation ?? card.translation,
    position !== undefined ? position : card.position,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM cards WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'card not found' });
  res.json({ deleted: req.params.id });
});

// SM-2 review: quality 0–5 (0-2 = fail, 3-5 = pass)
router.post('/:id/review', (req, res) => {
  const { quality } = req.body;
  if (quality === undefined || quality < 0 || quality > 5) {
    return res.status(400).json({ error: 'quality must be 0–5' });
  }
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id);
  if (!card) return res.status(404).json({ error: 'card not found' });

  const { repetitions, easeFactor, intervalDays } = sm2(
    quality,
    card.repetitions ?? 0,
    card.ease_factor ?? 2.5,
    card.interval_days ?? 0
  );

  const due = new Date();
  due.setDate(due.getDate() + intervalDays);
  const dueDate = due.toISOString().split('T')[0];

  db.prepare(
    'UPDATE cards SET repetitions = ?, ease_factor = ?, interval_days = ?, due_date = ? WHERE id = ?'
  ).run(repetitions, easeFactor, intervalDays, dueDate, req.params.id);

  res.json({ ...db.prepare('SELECT * FROM cards WHERE id = ?').get(req.params.id), nextReview: dueDate });
});

module.exports = router;
