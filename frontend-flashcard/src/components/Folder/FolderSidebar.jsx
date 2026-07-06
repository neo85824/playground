import { useState } from 'react';
import { createFolder, deleteFolder, updateFolder } from '../../api';
import { useTheme } from '../../context/ThemeContext';

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

function FolderIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"/>
    </svg>
  );
}

export default function FolderSidebar({ folders, selectedFolderId, onSelect, onRefresh }) {
  const { dark, toggle } = useTheme();
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    await createFolder(newName.trim());
    setNewName('');
    setAdding(false);
    onRefresh();
  }

  async function handleRename(e) {
    e.preventDefault();
    if (!editName.trim()) return;
    await updateFolder(editId, editName.trim());
    setEditId(null);
    onRefresh();
  }

  async function handleDelete(id) {
    if (!confirm('Delete folder? Decks inside will become top-level.')) return;
    await deleteFolder(id);
    if (selectedFolderId === id) onSelect(null);
    onRefresh();
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 hidden sm:flex flex-col min-h-screen">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h1 className="text-lg font-bold text-indigo-600 tracking-tight">FlashCards</h1>
        <button
          onClick={toggle}
          title="Toggle dark mode"
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedFolderId === null
              ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          All Decks
        </button>

        {folders.length > 0 && (
          <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Folders</p>
        )}

        {folders.map((f) => (
          <div key={f.id} className="group relative">
            {editId === f.id ? (
              <form onSubmit={handleRename} className="px-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => setEditId(null)}
                  className="w-full text-sm border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
                />
              </form>
            ) : (
              <button
                onClick={() => onSelect(f.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  selectedFolderId === f.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <FolderIcon />
                  <span className="truncate">{f.name}</span>
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">{f.deck_count}</span>
              </button>
            )}

            <div className="absolute right-1 top-1.5 hidden group-hover:flex gap-1">
              <button
                onClick={() => { setEditId(f.id); setEditName(f.name); }}
                className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                title="Rename"
              ><PencilIcon /></button>
              <button
                onClick={() => handleDelete(f.id)}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete"
              ><TrashIcon /></button>
            </div>
          </div>
        ))}

        {adding ? (
          <form onSubmit={handleCreate} className="px-2 mt-1">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => setAdding(false)}
              placeholder="Folder name…"
              className="w-full text-sm border border-indigo-300 dark:border-indigo-600 rounded px-2 py-1 outline-none bg-white dark:bg-gray-800 dark:text-gray-100"
            />
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + New Folder
          </button>
        )}
      </nav>
    </aside>
  );
}
