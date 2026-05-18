process.env.DB_PATH = ':memory:';
process.env.DISCORD_BOT_TOKEN = 'fake-token';
process.env.DISCORD_CHANNEL_ID = 'fake-channel';

const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Must require db AFTER setting DB_PATH so it uses :memory:
const db = require('../db');
const notificationRoutes = require('../routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/notifications', notificationRoutes);

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1hr from now

describe('Health', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/notifications', () => {
  test('creates a notification with required fields', async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'Hello world',
      scheduled_at: FUTURE,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Hello world');
    expect(res.body.status).toBe('pending');
    expect(res.body.next_fire_at).toBe(FUTURE);
    expect(res.body.repeat_interval_min).toBeNull();
    expect(res.body.priority).toBe(0);
  });

  test('creates a repeating notification', async () => {
    const res = await request(app).post('/api/notifications').send({
      title: 'Repeat test',
      message: 'Every 30 minutes',
      scheduled_at: FUTURE,
      repeat_interval_min: 30,
      priority: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.repeat_interval_min).toBe(30);
    expect(res.body.priority).toBe(1);
    expect(res.body.title).toBe('Repeat test');
  });

  test('rejects missing message', async () => {
    const res = await request(app).post('/api/notifications').send({
      scheduled_at: FUTURE,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('message required');
  });

  test('rejects missing scheduled_at', async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'No time',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('scheduled_at required');
  });
});

describe('GET /api/notifications', () => {
  test('returns a list', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('pending notifications appear first', async () => {
    const res = await request(app).get('/api/notifications');
    const statuses = res.body.map(n => n.status);
    const firstNonPending = statuses.findIndex(s => s !== 'pending');
    const lastPending = statuses.lastIndexOf('pending');
    if (firstNonPending !== -1 && lastPending !== -1) {
      expect(lastPending).toBeLessThan(firstNonPending);
    }
  });
});

describe('PATCH /api/notifications/:id', () => {
  let id;

  beforeAll(async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'Original message',
      scheduled_at: FUTURE,
    });
    id = res.body.id;
  });

  test('updates message', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      message: 'Updated message',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Updated message');
  });

  test('updates scheduled_at and resets next_fire_at', async () => {
    const newTime = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      scheduled_at: newTime,
    });
    expect(res.status).toBe(200);
    expect(res.body.next_fire_at).toBe(newTime);
    expect(res.body.status).toBe('pending');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/api/notifications/99999').send({ message: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/notifications/:id', () => {
  let id;

  beforeAll(async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'To be cancelled',
      scheduled_at: FUTURE,
    });
    id = res.body.id;
  });

  test('cancels a notification', async () => {
    const res = await request(app).delete(`/api/notifications/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(String(id));
  });

  test('status is cancelled after delete', async () => {
    const all = await request(app).get('/api/notifications');
    const n = all.body.find(x => x.id === id);
    expect(n.status).toBe('cancelled');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/notifications/99999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/notifications/:id/fire', () => {
  let id;

  beforeAll(async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'Fire test',
      scheduled_at: FUTURE,
    });
    id = res.body.id;
  });

  test('returns 502 when Discord creds are fake', async () => {
    const res = await request(app).post(`/api/notifications/${id}/fire`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).post('/api/notifications/99999/fire');
    expect(res.status).toBe(404);
  });
});
