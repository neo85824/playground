require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');
const scheduler = require('./scheduler');
const notificationRoutes = require('./routes/notifications');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/notifications', notificationRoutes);

const frontendDist = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Notification app running on http://localhost:${PORT}`);
  scheduler.start();
});
