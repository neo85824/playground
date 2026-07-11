import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, updateDeck, addCard, updateCard, deleteCard, bulkAddCards, exportDeckCSV } from '../api';
import CSVImportModal from '../components/Deck/CSVImportModal';

function PasteImportModal({ deckId, onClose, onImported }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function stripQuotes(field) {
    const trimmed = (field || '').trim();
    if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1).replace(/""/g, '"');
    }
    return trimmed;
  }

  function parsePairs(raw) {
    return raw.split('\n')
      .map(line => {
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        const word = stripQuotes(parts[0]);
        const translation = stripQuotes(parts[1]);
        return word && translation ? { word, translation } : null;
      })
      .filter(Boolean);
  }

  function handleChange(val) {
    setText(val);
    setPreview(parsePairs(val).slice(0, 5));
  }

  async function handleImport() {
    const pairs = parsePairs(text);
    if (!pairs.length) return;
    setLoading(true);
    await bulkAddCards(deckId, pairs);
    setResult(pairs.length);
    setLoading(false);
    onImported();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Paste Text</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          One pair per line: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">word{'\t'}translation</code> or <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">word,translation</code>
        </p>
        <textarea
          autoFocus
          value={text}
          onChange={e => handleChange(e.target.value)}
          rows={8}
          placeholder={'hello\thola\ngoodbye\tadiós'}
          className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 resize-none"
        />
        {preview.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">Preview ({preview.length} of {parsePairs(text).length}):</p>
            {preview.map((p, i) => (
              <div key={i} className="flex gap-3 text-xs bg-gray-50 dark:bg-gray-700 rounded px-3 py-1.5">
                <span className="flex-1 text-gray-700 dark:text-gray-200">{p.word}</span>
                <span className="flex-1 text-gray-500 dark:text-gray-400">{p.translation}</span>
              </div>
            ))}
          </div>
        )}
        {result && <p className="mt-3 text-sm text-emerald-600 font-medium">Imported {result} cards!</p>}
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={preview.length === 0 || loading}
              className="flex-1 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50">
              {loading ? 'Importing…' : `Import ${parsePairs(text).length || ''} cards`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DeckView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [search, setSearch] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [editCardId, setEditCardId] = useState(null);
  const [editWord, setEditWord] = useState('');
  const [editTranslation, setEditTranslation] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [editingDeckInfo, setEditingDeckInfo] = useState(false);
  const [editDeckName, setEditDeckName] = useState('');
  const [editDeckDescription, setEditDeckDescription] = useState('');
  const [savingDeckInfo, setSavingDeckInfo] = useState(false);

  useEffect(() => { load(); }, [id]);

  async function load() {
    const data = await getDeck(id);
    setDeck(data);
    setCards(data.cards);
  }

  async function handleAddCard(e) {
    e.preventDefault();
    if (!newWord.trim() || !newTranslation.trim()) return;
    await addCard(id, { word: newWord.trim(), translation: newTranslation.trim() });
    setNewWord('');
    setNewTranslation('');
    setAddingCard(false);
    load();
  }

  function startEditDeckInfo() {
    setEditDeckName(deck.name);
    setEditDeckDescription(deck.description || '');
    setEditingDeckInfo(true);
  }

  async function handleSaveDeckInfo() {
    if (!editDeckName.trim()) return;
    setSavingDeckInfo(true);
    await updateDeck(id, { name: editDeckName.trim(), description: editDeckDescription.trim() || null });
    setSavingDeckInfo(false);
    setEditingDeckInfo(false);
    load();
  }

  async function handleSaveEdit(cardId) {
    await updateCard(cardId, { word: editWord, translation: editTranslation });
    setEditCardId(null);
    load();
  }

  async function handleDelete(cardId) {
    if (!confirm('Delete this card?')) return;
    await deleteCard(cardId);
    load();
  }

  function handleExport() {
    window.location.href = exportDeckCSV(id);
  }

  function enterBulkMode() {
    setBulkMode(true);
    setSelectedCards(new Set());
    setEditCardId(null);
  }

  function exitBulkMode() {
    setBulkMode(false);
    setSelectedCards(new Set());
  }

  function toggleSelectCard(cardId) {
    const next = new Set(selectedCards);
    if (next.has(cardId)) next.delete(cardId);
    else next.add(cardId);
    setSelectedCards(next);
  }

  function toggleSelectAll() {
    if (selectedCards.size === filtered.length && filtered.length > 0) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filtered.map(c => c.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedCards.size} card(s)?`)) return;
    await Promise.all([...selectedCards].map(cid => deleteCard(cid)));
    exitBulkMode();
    load();
  }

  const filtered = search.trim()
    ? cards.filter(c =>
        c.word.toLowerCase().includes(search.toLowerCase()) ||
        c.translation.toLowerCase().includes(search.toLowerCase())
      )
    : cards;

  if (!deck) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;

  const allSelected = filtered.length > 0 && selectedCards.size === filtered.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/')} className="text-sm text-indigo-500 hover:underline mb-2 inline-block">← Back</button>
          {editingDeckInfo ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={editDeckName}
                onChange={e => setEditDeckName(e.target.value)}
                placeholder="Deck name"
                className="w-full text-2xl sm:text-3xl font-bold border border-indigo-200 dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400"
              />
              <textarea
                value={editDeckDescription}
                onChange={e => setEditDeckDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveDeckInfo}
                  disabled={!editDeckName.trim() || savingDeckInfo}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-50"
                >
                  {savingDeckInfo ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setEditingDeckInfo(false)}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group flex items-start gap-2">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{deck.name}</h1>
                {deck.description && <p className="text-gray-400 dark:text-gray-500 mt-1">{deck.description}</p>}
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{cards.length} cards</p>
              </div>
              <button
                onClick={startEditDeckInfo}
                className="text-xs text-gray-400 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1.5"
              >
                Edit
              </button>
            </div>
          )}
        </div>

        {/* Mode buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Card Mode', sub: 'Flip through cards', path: 'cards', color: 'indigo', min: 1 },
            { label: 'Learn Mode', sub: 'Got it / Still learning', path: 'learn', color: 'purple', min: 1 },
            { label: 'Quiz Mode', sub: cards.length < 4 ? 'Need 4+ cards' : 'MC or typed', path: 'quiz', color: 'emerald', min: 4 },
            { label: 'Spaced Rep', sub: 'SM-2 scheduling', path: 'sr', color: 'amber', min: 1 },
          ].map(({ label, sub, path, color, min }) => (
            <button
              key={path}
              onClick={() => navigate(`/decks/${id}/${path}`)}
              disabled={cards.length < min}
              className={`bg-white dark:bg-gray-800 border-2 border-${color}-100 dark:border-${color}-900/50 hover:border-${color}-400 rounded-2xl p-4 text-center transition-all disabled:opacity-40 disabled:cursor-not-allowed group`}
            >
              <div className={`font-semibold text-sm text-gray-700 dark:text-gray-200 group-hover:text-${color}-600`}>{label}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</div>
            </button>
          ))}
        </div>

        {/* Card table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

          {/* Bulk toolbar */}
          {bulkMode && (
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                {selectedCards.size > 0 ? `${selectedCards.size} selected` : 'Select all'}
              </label>
              {selectedCards.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={exitBulkMode}
                className="ml-auto text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Table header */}
          <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-700 dark:text-gray-200 mr-2">Cards</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 min-w-28 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-indigo-400"
            />
            <div className="flex flex-wrap gap-2 ml-auto">
              {!bulkMode && (
                <>
                  <button onClick={handleExport} className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Export CSV</button>
                  <button onClick={() => setShowPaste(true)} className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Paste Text</button>
                  <button onClick={() => setShowImport(true)} className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Import CSV</button>
                  {cards.length > 0 && (
                    <button onClick={enterBulkMode} className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Edit</button>
                  )}
                  <button onClick={() => setAddingCard(true)} className="px-3 py-2 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 transition-colors">+ Add Card</button>
                </>
              )}
            </div>
          </div>

          {addingCard && (
            <form onSubmit={handleAddCard} className="flex flex-wrap items-center gap-3 px-5 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-800">
              <input autoFocus value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Word" className="flex-1 min-w-24 border border-indigo-200 dark:border-indigo-700 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              <input value={newTranslation} onChange={e => setNewTranslation(e.target.value)} placeholder="Translation" className="flex-1 min-w-24 border border-indigo-200 dark:border-indigo-700 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
              <button type="submit" className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600">Save</button>
              <button type="button" onClick={() => setAddingCard(false)} className="px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
            </form>
          )}

          {filtered.length === 0 && !addingCard ? (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <p>{search ? 'No cards match your search' : 'No cards yet — add some or import a CSV'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((card) => (
                <div
                  key={card.id}
                  onClick={() => bulkMode && toggleSelectCard(card.id)}
                  className={`flex items-center gap-4 px-5 py-3 transition-colors group ${bulkMode ? 'cursor-pointer' : 'hover:bg-gray-50 dark:hover:bg-gray-750'} ${bulkMode && selectedCards.has(card.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                >
                  {bulkMode && (
                    <div onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => toggleSelectCard(card.id)}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                    </div>
                  )}
                  {!bulkMode && editCardId === card.id ? (
                    <>
                      <input autoFocus value={editWord} onChange={e => setEditWord(e.target.value)} className="flex-1 border border-indigo-200 dark:border-indigo-700 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-sm outline-none" />
                      <input value={editTranslation} onChange={e => setEditTranslation(e.target.value)} className="flex-1 border border-indigo-200 dark:border-indigo-700 dark:bg-gray-700 dark:text-gray-100 rounded px-2 py-1.5 text-sm outline-none" />
                      <button onClick={() => handleSaveEdit(card.id)} className="text-xs text-indigo-500 hover:text-indigo-700 font-medium px-1">Save</button>
                      <button onClick={() => setEditCardId(null)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{card.word}</span>
                      <span className="flex-1 text-sm text-gray-500 dark:text-gray-400">{card.translation}</span>
                      {!bulkMode && (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditCardId(card.id); setEditWord(card.word); setEditTranslation(card.translation); }} className="text-xs text-gray-400 hover:text-indigo-500 py-1">Edit</button>
                          <button onClick={() => handleDelete(card.id)} className="text-xs text-gray-400 hover:text-red-500 py-1">Delete</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <CSVImportModal deckId={id} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} />
      )}
      {showPaste && (
        <PasteImportModal deckId={id} onClose={() => setShowPaste(false)} onImported={() => { setShowPaste(false); load(); }} />
      )}
    </div>
  );
}
