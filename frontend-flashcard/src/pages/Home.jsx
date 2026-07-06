import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFolders, getDecks, createDeck, deleteDeck, updateDeck, createFolder, updateFolder, deleteFolder } from '../api';
import FolderSidebar from '../components/Folder/FolderSidebar';
import { useTheme } from '../context/ThemeContext';

function TrashIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"/>
    </svg>
  );
}

function FolderIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
    </svg>
  );
}

function PencilIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
    </svg>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const [folders, setFolders] = useState([]);
  const [decks, setDecks] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [newDeckFolder, setNewDeckFolder] = useState('');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('deckViewMode') || 'grid');
  const [editMode, setEditMode] = useState(false);
  const [selectedDecks, setSelectedDecks] = useState(new Set());
  const [showMoveDropdown, setShowMoveDropdown] = useState(false);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [mobileNewFolderName, setMobileNewFolderName] = useState('');
  const [mobileEditFolderId, setMobileEditFolderId] = useState(null);
  const [mobileEditFolderName, setMobileEditFolderName] = useState('');

  useEffect(() => { loadFolders(); }, []);
  useEffect(() => { loadDecks(); }, [selectedFolder]);

  async function loadFolders() {
    const data = await getFolders();
    setFolders(data);
  }

  async function loadDecks() {
    const data = await getDecks(selectedFolder === null ? undefined : selectedFolder);
    setDecks(data);
  }

  async function handleCreateDeck(e) {
    e.preventDefault();
    if (!newDeckName.trim()) return;
    const deck = await createDeck({
      name: newDeckName.trim(),
      description: newDeckDesc.trim(),
      folder_id: newDeckFolder || selectedFolder,
    });
    setNewDeckName('');
    setNewDeckDesc('');
    setNewDeckFolder('');
    setShowNewDeck(false);
    navigate(`/decks/${deck.id}`);
  }

  async function handleDeleteDeck(e, id) {
    e.stopPropagation();
    if (!confirm('Delete this deck and all its cards?')) return;
    await deleteDeck(id);
    loadDecks();
  }

  function setView(mode) {
    setViewMode(mode);
    localStorage.setItem('deckViewMode', mode);
  }

  function enterEditMode() {
    setEditMode(true);
    setSelectedDecks(new Set());
  }

  function exitEditMode() {
    setEditMode(false);
    setSelectedDecks(new Set());
    setShowMoveDropdown(false);
  }

  function toggleSelectDeck(id) {
    const next = new Set(selectedDecks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedDecks(next);
  }

  function toggleSelectAll() {
    if (selectedDecks.size === decks.length && decks.length > 0) {
      setSelectedDecks(new Set());
    } else {
      setSelectedDecks(new Set(decks.map(d => d.id)));
    }
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedDecks.size} deck(s) and all their cards?`)) return;
    await Promise.all([...selectedDecks].map(id => deleteDeck(id)));
    exitEditMode();
    loadDecks();
  }

  async function handleBulkMoveToFolder(folderId) {
    await Promise.all([...selectedDecks].map(id => updateDeck(id, { folder_id: folderId || null })));
    exitEditMode();
    loadDecks();
  }

  async function handleCreateFolder(e) {
    e.preventDefault();
    if (!mobileNewFolderName.trim()) return;
    await createFolder(mobileNewFolderName.trim());
    setMobileNewFolderName('');
    setShowFolderManager(false);
    loadFolders();
  }

  function startMobileRename(folder) {
    setMobileEditFolderId(folder.id);
    setMobileEditFolderName(folder.name);
  }

  function cancelMobileRename() {
    setMobileEditFolderId(null);
    setMobileEditFolderName('');
  }

  async function handleRenameFolder(e) {
    e.preventDefault();
    if (!mobileEditFolderName.trim()) return;
    await updateFolder(mobileEditFolderId, mobileEditFolderName.trim());
    cancelMobileRename();
    loadFolders();
  }

  async function handleDeleteFolder(id) {
    if (!confirm('Delete folder? Decks inside will become top-level.')) return;
    await deleteFolder(id);
    if (selectedFolder === id) {
      setSelectedFolder(null);
    }
    cancelMobileRename();
    loadFolders();
  }

  const folderName = selectedFolder
    ? folders.find(f => f.id === selectedFolder)?.name
    : 'All Decks';

  const allSelected = decks.length > 0 && selectedDecks.size === decks.length;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Desktop sidebar — hidden on mobile */}
      <FolderSidebar
        folders={folders}
        selectedFolderId={selectedFolder}
        onSelect={setSelectedFolder}
        onRefresh={loadFolders}
      />

      {/* Main content */}
      <main className="flex-1 p-4 sm:p-8 pb-20 sm:pb-8">

        {/* Mobile top bar */}
        <div className="sm:hidden flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-indigo-600">FlashCards</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFolderManager(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300"
            >
              <FolderIcon className="w-3.5 h-3.5" />
              Folders
            </button>
            <button
              onClick={toggle}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 transition-colors"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{folderName}</h2>
          <div className="flex items-center gap-2">
            {/* View toggle — desktop only */}
            {!editMode && (
              <div className="hidden sm:flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  title="Grid view"
                  className={`p-1.5 transition-colors ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <GridIcon />
                </button>
                <button
                  onClick={() => setView('list')}
                  title="List view"
                  className={`p-1.5 transition-colors ${viewMode === 'list' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  <ListIcon />
                </button>
              </div>
            )}
            {/* Edit button */}
            {decks.length > 0 && !editMode && (
              <button
                onClick={enterEditMode}
                className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            )}
            {/* New Deck — desktop only (mobile uses FAB) */}
            {!editMode && (
              <button
                onClick={() => setShowNewDeck(true)}
                className="hidden sm:block px-4 py-2 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors shadow-sm text-sm"
              >
                + New Deck
              </button>
            )}
          </div>
        </div>

        {/* Bulk action toolbar */}
        {editMode && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
              {selectedDecks.size > 0 ? `${selectedDecks.size} selected` : 'Select all'}
            </label>

            {selectedDecks.size > 0 && (
              <>
                {/* Move to folder dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowMoveDropdown(!showMoveDropdown)}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Move to Folder
                  </button>
                  {showMoveDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg z-20 min-w-40 py-1">
                      <button
                        onClick={() => handleBulkMoveToFolder(null)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        No Folder
                      </button>
                      {folders.map(f => (
                        <button
                          key={f.id}
                          onClick={() => handleBulkMoveToFolder(f.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </>
            )}

            <button
              onClick={exitEditMode}
              className="ml-auto px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Deck list */}
        {decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium">No decks yet</p>
            <p className="text-sm mt-1">Create your first deck to get started</p>
          </div>

        ) : viewMode === 'list' ? (
          /* ── List view (desktop) ── */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                  {editMode && (
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                    </th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">Cards</th>
                  <th className="hidden sm:table-cell text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Folder</th>
                  {!editMode && <th className="w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {decks.map(deck => (
                  <tr
                    key={deck.id}
                    onClick={() => editMode ? toggleSelectDeck(deck.id) : navigate(`/decks/${deck.id}`)}
                    className={`cursor-pointer transition-colors ${
                      editMode && selectedDecks.has(deck.id)
                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                    }`}
                  >
                    {editMode && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedDecks.has(deck.id)} onChange={() => toggleSelectDeck(deck.id)} className="rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800 dark:text-gray-100">{deck.name}</div>
                      {deck.description && <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{deck.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{deck.card_count}</td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      {deck.folder_id ? (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {folders.find(f => f.id === deck.folder_id)?.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300 dark:text-gray-600">—</span>
                      )}
                    </td>
                    {!editMode && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => handleDeleteDeck(e, deck.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          title="Delete deck"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        ) : (
          /* ── Grid view ── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <div
                key={deck.id}
                onClick={() => editMode ? toggleSelectDeck(deck.id) : navigate(`/decks/${deck.id}`)}
                className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm transition-all cursor-pointer p-5 group relative ${
                  editMode && selectedDecks.has(deck.id)
                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-500'
                }`}
              >
                {editMode && (
                  <div className="absolute top-3 left-3 z-10" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedDecks.has(deck.id)}
                      onChange={() => toggleSelectDeck(deck.id)}
                      className="w-4 h-4 rounded"
                    />
                  </div>
                )}
                <div className={`flex items-start justify-between ${editMode ? 'pl-7' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{deck.name}</h3>
                    {deck.description && (
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 truncate">{deck.description}</p>
                    )}
                  </div>
                  {!editMode && (
                    <button
                      onClick={(e) => handleDeleteDeck(e, deck.id)}
                      className="ml-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                      title="Delete deck"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-400 dark:text-gray-500">{deck.card_count} cards</span>
                  {deck.folder_id && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {folders.find(f => f.id === deck.folder_id)?.name}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Deck modal */}
      {showNewDeck && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateDeck} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">New Deck</h3>
            <input
              autoFocus
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            <input
              value={newDeckDesc}
              onChange={(e) => setNewDeckDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
            {folders.length > 0 && (
              <select
                value={newDeckFolder || selectedFolder || ''}
                onChange={(e) => setNewDeckFolder(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
              >
                <option value="">No folder</option>
                {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setShowNewDeck(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors text-sm">Create</button>
            </div>
          </form>
        </div>
      )}

      {showFolderManager && (
        <div className="sm:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white dark:bg-gray-800 p-4 pb-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Folders</h3>
                <p className="text-sm text-gray-400 dark:text-gray-500">Select, add, rename, or delete folders.</p>
              </div>
              <button
                onClick={() => {
                  setShowFolderManager(false);
                  cancelMobileRename();
                }}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400"
              >
                Close
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedFolder(null);
                setShowFolderManager(false);
              }}
              className={`mb-3 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                selectedFolder === null
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                  : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="font-medium">All Decks</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{decks.length}</span>
            </button>

            <div className="space-y-3">
              {folders.map((folder) => (
                <div key={folder.id} className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  {mobileEditFolderId === folder.id ? (
                    <form onSubmit={handleRenameFolder} className="space-y-2">
                      <input
                        autoFocus
                        value={mobileEditFolderName}
                        onChange={(e) => setMobileEditFolderName(e.target.value)}
                        className="w-full rounded-xl border border-indigo-300 bg-white px-3 py-2 text-sm outline-none dark:border-indigo-600 dark:bg-gray-800 dark:text-gray-100"
                        placeholder="Folder name"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 rounded-xl bg-indigo-500 px-3 py-2 text-sm font-medium text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelMobileRename}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setSelectedFolder(folder.id);
                          setShowFolderManager(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-2 py-2 text-left ${
                          selectedFolder === folder.id
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                            : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <FolderIcon className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate font-medium">{folder.name}</span>
                        </span>
                        <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">{folder.deck_count}</span>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => startMobileRename(folder)}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300"
                        >
                          <span className="inline-flex items-center gap-2">
                            <PencilIcon className="w-3.5 h-3.5" />
                            Rename
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="flex-1 rounded-xl border border-red-200 px-3 py-2 text-sm text-red-500 dark:border-red-900/60"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateFolder} className="mt-4 rounded-2xl border border-dashed border-gray-300 p-3 dark:border-gray-600">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">New folder</label>
              <input
                value={mobileNewFolderName}
                onChange={(e) => setMobileNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <button
                type="submit"
                className="mt-3 w-full rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white"
              >
                Add Folder
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile FAB — above bottom nav */}
      {!editMode && (
        <button
          onClick={() => setShowNewDeck(true)}
          className="sm:hidden fixed bottom-20 right-4 w-14 h-14 bg-indigo-500 text-white rounded-full shadow-lg flex items-center justify-center z-40 text-2xl font-light hover:bg-indigo-600 active:bg-indigo-700 transition-colors"
        >
          +
        </button>
      )}

      {/* Mobile bottom nav — folder tabs */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 z-40 flex items-stretch h-14 overflow-x-auto">
        <button
          onClick={() => setSelectedFolder(null)}
          className={`flex-shrink-0 px-4 flex items-center text-sm font-medium transition-colors ${
            selectedFolder === null ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          All
        </button>
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFolder(f.id)}
            className={`flex-shrink-0 px-3 flex items-center text-sm transition-colors whitespace-nowrap ${
              selectedFolder === f.id ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {f.name}
          </button>
        ))}
      </nav>
    </div>
  );
}
