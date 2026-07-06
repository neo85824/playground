require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('../apps/notifications/backend/db');
require('../apps/flashcard/backend/db');
const scheduler = require('../apps/notifications/backend/scheduler');
const notificationRoutes = require('../apps/notifications/backend/routes/notifications');
const flashcardAuthRoutes = require('../apps/flashcard/backend/routes/auth');
const flashcardFolderRoutes = require('../apps/flashcard/backend/routes/folders');
const flashcardDeckRoutes = require('../apps/flashcard/backend/routes/decks');
const flashcardCardRoutes = require('../apps/flashcard/backend/routes/cards');
const flashcardSessionRoutes = require('../apps/flashcard/backend/routes/sessions');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/notifications', notificationRoutes);
app.use('/api/auth', flashcardAuthRoutes);
app.use('/api/folders', flashcardFolderRoutes);
app.use('/api/decks', flashcardDeckRoutes);
app.use('/api/cards', flashcardCardRoutes);
app.use('/api/sessions', flashcardSessionRoutes);

const notificationsDist = path.join(__dirname, '../apps/notifications/frontend/dist');
app.use('/notifications', express.static(notificationsDist));
app.get('/notifications/*', (req, res) => {
  res.sendFile(path.join(notificationsDist, 'index.html'));
});

const flashcardDist = path.join(__dirname, '../apps/flashcard/frontend/dist');
app.use('/flashcard', express.static(flashcardDist));
app.get('/flashcard/*', (req, res) => {
  res.sendFile(path.join(flashcardDist, 'index.html'));
});

const portalDir = path.join(__dirname, '../apps/playground/public');
app.use(express.static(portalDir));
app.get('*', (req, res) => {
  res.sendFile(path.join(portalDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Playground running on http://localhost:${PORT}`);
  scheduler.start();
});
