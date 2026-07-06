require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../../database/notifications.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    title                TEXT,
    message              TEXT NOT NULL,
    scheduled_at         DATETIME NOT NULL,
    repeat_interval_min  INTEGER,
    priority             INTEGER DEFAULT 0,
    status               TEXT DEFAULT 'pending',
    last_sent_at         DATETIME,
    next_fire_at         DATETIME NOT NULL,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
