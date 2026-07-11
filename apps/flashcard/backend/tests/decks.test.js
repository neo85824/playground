process.env.FLASHCARD_DB_PATH = ':memory:';

const request = require('supertest');
const express = require('express');
const cors = require('cors');

const deckRoutes = require('../routes/decks');
const cardRoutes = require('../routes/cards');
const folderRoutes = require('../routes/folders');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/decks', deckRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/folders', folderRoutes);

async function createDeck(overrides = {}) {
  const res = await request(app).post('/api/decks').send({
    name: 'Spanish Basics',
    description: 'Everyday words',
    ...overrides,
  });
  return res.body;
}

// ─── CREATE ─────────────────────────────────────────────────────────────────

describe('POST /api/decks — create', () => {
  test('creates a deck with name + description', async () => {
    const res = await request(app).post('/api/decks').send({
      name: 'French Basics',
      description: 'Bonjour!',
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('French Basics');
    expect(res.body.description).toBe('Bonjour!');
  });

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/decks').send({ description: 'No name' });
    expect(res.status).toBe(400);
  });

  test('description is optional', async () => {
    const res = await request(app).post('/api/decks').send({ name: 'No Description' });
    expect(res.status).toBe(201);
    expect(res.body.description).toBeNull();
  });
});

// ─── EDIT NAME/DESCRIPTION ──────────────────────────────────────────────────

describe('PUT /api/decks/:id — edit name/description', () => {
  test('updates both name and description', async () => {
    const deck = await createDeck();
    const res = await request(app).put(`/api/decks/${deck.id}`).send({
      name: 'Spanish Advanced',
      description: 'Harder words',
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Spanish Advanced');
    expect(res.body.description).toBe('Harder words');

    const reread = await request(app).get(`/api/decks/${deck.id}`);
    expect(reread.body.name).toBe('Spanish Advanced');
    expect(reread.body.description).toBe('Harder words');
  });

  test('updates name only, leaving description untouched', async () => {
    const deck = await createDeck({ description: 'Keep me' });
    const res = await request(app).put(`/api/decks/${deck.id}`).send({ name: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Renamed');
    expect(res.body.description).toBe('Keep me');
  });

  test('can clear description by sending an empty/null value', async () => {
    const deck = await createDeck({ description: 'Will be cleared' });
    const res = await request(app).put(`/api/decks/${deck.id}`).send({
      name: deck.name,
      description: null,
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
  });

  test('does not clear name when name is omitted', async () => {
    const deck = await createDeck();
    const res = await request(app).put(`/api/decks/${deck.id}`).send({ description: 'Only description changes' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(deck.name);
    expect(res.body.description).toBe('Only description changes');
  });

  test('404s for a nonexistent deck', async () => {
    const res = await request(app).put('/api/decks/999999').send({ name: 'Ghost' });
    expect(res.status).toBe(404);
  });

  test('updating name/description does not affect folder_id or cards', async () => {
    const folder = await request(app).post('/api/folders').send({ name: 'Languages' });
    const deck = await createDeck({ folder_id: folder.body.id });
    await request(app).post(`/api/decks/${deck.id}/cards`).send({ word: 'hola', translation: 'hello' });

    const res = await request(app).put(`/api/decks/${deck.id}`).send({ name: 'Renamed Again' });
    expect(res.status).toBe(200);
    expect(res.body.folder_id).toBe(folder.body.id);

    const reread = await request(app).get(`/api/decks/${deck.id}`);
    expect(reread.body.cards).toHaveLength(1);
  });
});

// ─── READ / DELETE (existing behavior, guarded so edits above don't regress) ─

describe('GET /api/decks/:id and DELETE /api/decks/:id', () => {
  test('404s for a nonexistent deck', async () => {
    const res = await request(app).get('/api/decks/999999');
    expect(res.status).toBe(404);
  });

  test('deletes a deck', async () => {
    const deck = await createDeck();
    const res = await request(app).delete(`/api/decks/${deck.id}`);
    expect(res.status).toBe(200);
    expect(await request(app).get(`/api/decks/${deck.id}`)).toHaveProperty('status', 404);
  });
});
