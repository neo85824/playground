import { useState, useEffect } from 'react';

export default function FlipCard({ word, translation, forceFlipped = false, onClick }) {
  const [flipped, setFlipped] = useState(forceFlipped);

  useEffect(() => {
    setFlipped(forceFlipped);
  }, [forceFlipped, word]);

  function handleClick() {
    const next = !flipped;
    setFlipped(next);
    onClick?.(next);
  }

  return (
    <div
      className="flip-card w-full h-72 cursor-pointer select-none"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === ' ' && handleClick()}
      aria-label={flipped ? 'Back: ' + translation : 'Front: ' + word}
    >
      <div className={`flip-card-inner h-full ${flipped ? 'flipped' : ''}`}>
        <div className="flip-card-front rounded-2xl border-2 border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-800 shadow-lg p-8">
          <p className="text-3xl font-semibold text-gray-800 dark:text-gray-100 text-center">{word}</p>
          <p className="mt-4 text-sm text-gray-400 dark:text-gray-500">click to reveal</p>
        </div>
        <div className="flip-card-back rounded-2xl border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 shadow-lg p-8">
          <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400 text-center">{translation}</p>
          <p className="mt-4 text-sm text-emerald-400 dark:text-emerald-600">click to flip back</p>
        </div>
      </div>
    </div>
  );
}
