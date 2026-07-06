import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getFolders = () => api.get('/folders').then(r => r.data);
export const createFolder = (name) => api.post('/folders', { name }).then(r => r.data);
export const updateFolder = (id, name) => api.put(`/folders/${id}`, { name }).then(r => r.data);
export const deleteFolder = (id) => api.delete(`/folders/${id}`).then(r => r.data);

export const getDecks = (folder_id) => {
  const params = folder_id !== undefined ? { folder_id } : {};
  return api.get('/decks', { params }).then(r => r.data);
};
export const getDeck = (id) => api.get(`/decks/${id}`).then(r => r.data);
export const createDeck = (data) => api.post('/decks', data).then(r => r.data);
export const updateDeck = (id, data) => api.put(`/decks/${id}`, data).then(r => r.data);
export const deleteDeck = (id) => api.delete(`/decks/${id}`).then(r => r.data);

export const getCards = (deckId) => api.get(`/decks/${deckId}/cards`).then(r => r.data);
export const addCard = (deckId, data) => api.post(`/decks/${deckId}/cards`, data).then(r => r.data);
export const updateCard = (id, data) => api.put(`/cards/${id}`, data).then(r => r.data);
export const deleteCard = (id) => api.delete(`/cards/${id}`).then(r => r.data);
export const importCSV = (deckId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/decks/${deckId}/import`, form).then(r => r.data);
};
export const getDeckProgress = (deckId) => api.get(`/decks/${deckId}/progress`).then(r => r.data);

export const saveLearnResult = (data) => api.post('/sessions/learn', data).then(r => r.data);
export const saveQuizResult = (data) => api.post('/sessions/quiz', data).then(r => r.data);

export const reviewCard = (id, quality) => api.post(`/cards/${id}/review`, { quality }).then(r => r.data);
export const getDueCards = (deckId) => api.get(`/decks/${deckId}/due`).then(r => r.data);
export const exportDeckCSV = (deckId) => `/api/decks/${deckId}/export`;

export const pasteImport = (deckId, pairs) =>
  api.post(`/decks/${deckId}/cards`, null, { params: { bulk: true } })
    .catch(() => null); // bulk handled client-side via individual calls

export const bulkAddCards = async (deckId, pairs) => {
  const results = [];
  for (const p of pairs) {
    results.push(await api.post(`/decks/${deckId}/cards`, p).then(r => r.data));
  }
  return results;
};
