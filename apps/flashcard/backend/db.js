const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.FLASHCARD_DB_PATH || path.join(__dirname, '../../database/flashcards.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS folders (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    name       TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS decks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id   INTEGER REFERENCES folders(id) ON DELETE SET NULL,
    user_id     INTEGER REFERENCES users(id),
    name        TEXT NOT NULL,
    description TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cards (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    deck_id      INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    word         TEXT NOT NULL,
    translation  TEXT NOT NULL,
    position     INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS learn_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    deck_id    INTEGER REFERENCES decks(id),
    card_id    INTEGER REFERENCES cards(id),
    knew_it    BOOLEAN NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quiz_results (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    deck_id    INTEGER REFERENCES decks(id),
    score      INTEGER,
    total      INTEGER,
    mode       TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// SM-2 spaced repetition columns — safe to run on existing DBs
for (const stmt of [
  'ALTER TABLE cards ADD COLUMN ease_factor REAL DEFAULT 2.5',
  'ALTER TABLE cards ADD COLUMN interval_days INTEGER DEFAULT 0',
  'ALTER TABLE cards ADD COLUMN repetitions INTEGER DEFAULT 0',
  'ALTER TABLE cards ADD COLUMN due_date TEXT',
]) {
  try { db.exec(stmt); } catch (_) { /* column already exists */ }
}

module.exports = db;
