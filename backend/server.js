require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');
require('./flashcard/db');
const scheduler = require('./scheduler');
const notificationRoutes = require('./routes/notifications');
const flashcardAuthRoutes = require('./flashcard/routes/auth');
const flashcardFolderRoutes = require('./flashcard/routes/folders');
const flashcardDeckRoutes = require('./flashcard/routes/decks');
const flashcardCardRoutes = require('./flashcard/routes/cards');
const flashcardSessionRoutes = require('./flashcard/routes/sessions');

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

const flashcardDist = path.join(__dirname, '../frontend-flashcard/dist');
app.use('/flashcard', express.static(flashcardDist));
app.get('/flashcard/*', (req, res) => {
  res.sendFile(path.join(flashcardDist, 'index.html'));
});

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Notification app running on http://localhost:${PORT}`);
  scheduler.start();
});
