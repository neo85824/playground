process.env.DB_PATH = ':memory:';
process.env.DISCORD_BOT_TOKEN = 'fake-token';
process.env.DISCORD_CHANNEL_ID = 'fake-channel';

const request = require('supertest');
const express = require('express');
const cors = require('cors');

const db = require('../db');
const notificationRoutes = require('../routes/notifications');

const app = express();
app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/notifications', notificationRoutes);

const FUTURE = new Date(Date.now() + 60 * 60 * 1000).toISOString();
const FUTURE2 = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

// ─── Health ──────────────────────────────────────────────────────────────────

describe('Health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

// ─── CREATE ───────────────────────────────────────────────────────────────────

describe('POST /api/notifications — create', () => {
  test('minimal fields: message + scheduled_at', async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'Minimal',
      scheduled_at: FUTURE,
    });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Minimal');
    expect(res.body.status).toBe('pending');
    expect(res.body.title).toBeNull();
    expect(res.body.repeat_interval_min).toBeNull();
    expect(res.body.priority).toBe(0);
    expect(res.body.next_fire_at).toBe(FUTURE);
  });

  test('all fields: title, message, repeat, priority', async () => {
    const res = await request(app).post('/api/notifications').send({
      title: 'My Title',
      message: 'Full notification',
      scheduled_at: FUTURE,
      repeat_interval_min: 30,
      priority: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('My Title');
    expect(res.body.repeat_interval_min).toBe(30);
    expect(res.body.priority).toBe(1);
  });

  test('priority 2 (emergency)', async () => {
    const res = await request(app).post('/api/notifications').send({
      message: 'Emergency!',
      scheduled_at: FUTURE,
      priority: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe(2);
  });

  test('repeat intervals: 1, 15, 60, 1440 minutes', async () => {
    for (const min of [1, 15, 60, 1440]) {
      const res = await request(app).post('/api/notifications').send({
        message: `Repeat ${min}`,
        scheduled_at: FUTURE,
        repeat_interval_min: min,
      });
      expect(res.status).toBe(201);
      expect(res.body.repeat_interval_min).toBe(min);
    }
  });

  test('empty string title is stored as null', async () => {
    const res = await request(app).post('/api/notifications').send({
      title: '',
      message: 'No title',
      scheduled_at: FUTURE,
    });
    expect(res.status).toBe(201);
    expect(res.body.title).toBeNull();
  });

  test('rejects missing message → 400', async () => {
    const res = await request(app).post('/api/notifications').send({ scheduled_at: FUTURE });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('message required');
  });

  test('rejects missing scheduled_at → 400', async () => {
    const res = await request(app).post('/api/notifications').send({ message: 'No time' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('scheduled_at required');
  });

  test('rejects empty body → 400', async () => {
    const res = await request(app).post('/api/notifications').send({});
    expect(res.status).toBe(400);
  });
});

// ─── LIST ─────────────────────────────────────────────────────────────────────

describe('GET /api/notifications — list', () => {
  test('returns array', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('pending notifications appear before cancelled', async () => {
    await request(app).post('/api/notifications').send({ message: 'A', scheduled_at: FUTURE });
    const createRes = await request(app).post('/api/notifications').send({ message: 'B', scheduled_at: FUTURE });
    await request(app).delete(`/api/notifications/${createRes.body.id}`);

    const res = await request(app).get('/api/notifications');
    const statuses = res.body.map(n => n.status);
    const firstCancelled = statuses.indexOf('cancelled');
    const lastPending = statuses.lastIndexOf('pending');
    if (firstCancelled !== -1 && lastPending !== -1) {
      expect(lastPending).toBeLessThan(firstCancelled);
    }
  });
});

// ─── EDIT ─────────────────────────────────────────────────────────────────────

describe('PATCH /api/notifications/:id — edit', () => {
  let id;
  let originalNextFire;

  beforeEach(async () => {
    const res = await request(app).post('/api/notifications').send({
      title: 'Original',
      message: 'Original message',
      scheduled_at: FUTURE,
      repeat_interval_min: 1,
      priority: 0,
    });
    id = res.body.id;
    originalNextFire = res.body.next_fire_at;
  });

  test('edit message only — next_fire_at unchanged', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      message: 'Updated message',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Updated message');
    expect(res.body.next_fire_at).toBe(originalNextFire);
  });

  test('edit repeat_interval_min only — next_fire_at unchanged (bug regression)', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      repeat_interval_min: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.repeat_interval_min).toBe(10);
    // next_fire_at must NOT reset to past scheduled_at
    expect(res.body.next_fire_at).toBe(originalNextFire);
  });

  test('edit scheduled_at — next_fire_at resets to new time', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      scheduled_at: FUTURE2,
    });
    expect(res.status).toBe(200);
    expect(res.body.next_fire_at).toBe(FUTURE2);
    expect(res.body.scheduled_at).toBe(FUTURE2);
  });

  test('edit title to empty string — stored as null', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({ title: '' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBeNull();
  });

  test('edit priority to 2', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({ priority: 2 });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe(2);
  });

  test('edit repeat_interval_min to null (make one-shot)', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      repeat_interval_min: null,
    });
    expect(res.status).toBe(200);
    expect(res.body.repeat_interval_min).toBeNull();
  });

  test('edit all fields at once', async () => {
    const res = await request(app).patch(`/api/notifications/${id}`).send({
      title: 'New title',
      message: 'New message',
      scheduled_at: FUTURE2,
      repeat_interval_min: 60,
      priority: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New title');
    expect(res.body.message).toBe('New message');
    expect(res.body.repeat_interval_min).toBe(60);
    expect(res.body.priority).toBe(1);
    expect(res.body.next_fire_at).toBe(FUTURE2);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).patch('/api/notifications/99999').send({ message: 'x' });
    expect(res.status).toBe(404);
  });
});

// ─── CANCEL ───────────────────────────────────────────────────────────────────

describe('DELETE /api/notifications/:id — cancel', () => {
  test('cancels a pending notification', async () => {
    const create = await request(app).post('/api/notifications').send({
      message: 'To cancel',
      scheduled_at: FUTURE,
    });
    const res = await request(app).delete(`/api/notifications/${create.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.cancelled).toBe(String(create.body.id));
  });

  test('status is cancelled after delete', async () => {
    const create = await request(app).post('/api/notifications').send({
      message: 'Check status',
      scheduled_at: FUTURE,
    });
    await request(app).delete(`/api/notifications/${create.body.id}`);
    const list = await request(app).get('/api/notifications');
    const n = list.body.find(x => x.id === create.body.id);
    expect(n.status).toBe('cancelled');
  });

  test('can cancel an already-cancelled notification', async () => {
    const create = await request(app).post('/api/notifications').send({
      message: 'Double cancel',
      scheduled_at: FUTURE,
    });
    await request(app).delete(`/api/notifications/${create.body.id}`);
    const res = await request(app).delete(`/api/notifications/${create.body.id}`);
    expect(res.status).toBe(200);
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/notifications/99999');
    expect(res.status).toBe(404);
  });
});

// ─── FIRE NOW ─────────────────────────────────────────────────────────────────

describe('POST /api/notifications/:id/fire', () => {
  test('returns 502 with fake Discord creds', async () => {
    const create = await request(app).post('/api/notifications').send({
      message: 'Fire me',
      scheduled_at: FUTURE,
    });
    const res = await request(app).post(`/api/notifications/${create.body.id}/fire`);
    expect(res.status).toBe(502);
    expect(res.body.error).toBeDefined();
  }, 15000);

  test('returns 404 for unknown id', async () => {
    const res = await request(app).post('/api/notifications/99999/fire');
    expect(res.status).toBe(404);
  });
});
