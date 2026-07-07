const PREFIX = 'flashcard:session:';

function key(mode, deckId) {
  return `${PREFIX}${mode}:${deckId}`;
}

export function loadSession(mode, deckId) {
  try {
    const raw = localStorage.getItem(key(mode, deckId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(mode, deckId, state) {
  try {
    localStorage.setItem(key(mode, deckId), JSON.stringify(state));
  } catch {
    // localStorage unavailable/full — session just won't persist, not fatal
  }
}

export function clearSession(mode, deckId) {
  try {
    localStorage.removeItem(key(mode, deckId));
  } catch {
    // ignore
  }
}
