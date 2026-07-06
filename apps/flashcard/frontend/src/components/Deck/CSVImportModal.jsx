import { useState, useRef } from 'react';
import { importCSV } from '../../api';

export default function CSVImportModal({ deckId, onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef();

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const lines = e.target.result.split('\n').filter(Boolean);
      setPreview(lines.slice(0, 6));
    };
    reader.readAsText(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const data = await importCSV(deckId, file);
      setResult(data);
      onImported?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Import CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          CSV must have <code className="bg-gray-100 px-1 rounded">word</code> and{' '}
          <code className="bg-gray-100 px-1 rounded">translation</code> columns.
        </p>

        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => inputRef.current.click()}
        >
          <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
          {file ? (
            <p className="text-indigo-600 font-medium">{file.name}</p>
          ) : (
            <p className="text-gray-400">Drop CSV here or click to browse</p>
          )}
        </div>

        {preview.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Preview (first {Math.min(preview.length - 1, 5)} rows):</p>
            <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
              {preview.map((line, i) => (
                <div key={i} className={i === 0 ? 'text-gray-400' : 'text-gray-700'}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        {result && (
          <div className="mt-3 text-sm text-emerald-600 font-medium">
            Imported {result.imported} cards successfully!
          </div>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            {result ? 'Close' : 'Cancel'}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="flex-1 py-2 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Importing…' : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
