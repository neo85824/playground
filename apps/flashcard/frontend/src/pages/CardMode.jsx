import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck } from '../api';
import FlipCard from '../components/Card/FlipCard';
import ProgressBar from '../components/Shared/ProgressBar';
import { shuffleArray } from '../lib/shuffle';
import { loadSession, saveSession } from '../lib/sessionStorage';

export default function CardMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cards, setCards] = useState([]);
  const [deckName, setDeckName] = useState('');
  const [index, setIndex] = useState(0);
  const [shuffled, setShuffled] = useState(false);
  const [order, setOrder] = useState([]);
  const restored = useRef(false);

  useEffect(() => {
    getDeck(id).then((data) => {
      setDeckName(data.name);
      setCards(data.cards);

      const session = loadSession('card', id);
      const validIds = new Set(data.cards.map((c) => c.id));
      const savedOrderIds = session?.orderIds;
      const canRestore = Array.isArray(savedOrderIds)
        && savedOrderIds.length === data.cards.length
        && savedOrderIds.every((cardId) => validIds.has(cardId));

      if (canRestore) {
        const idToIndex = new Map(data.cards.map((c, i) => [c.id, i]));
        setOrder(savedOrderIds.map((cardId) => idToIndex.get(cardId)));
        setIndex(Math.min(session.index ?? 0, savedOrderIds.length - 1));
        setShuffled(!!session.shuffled);
      } else {
        setOrder(data.cards.map((_, i) => i));
      }
      restored.current = true;
    });
  }, [id]);

  useEffect(() => {
    if (!restored.current || !order.length) return;
    saveSession('card', id, {
      orderIds: order.map((i) => cards[i]?.id).filter((v) => v !== undefined),
      index,
      shuffled,
    });
  }, [order, index, shuffled, cards, id]);

  const handleKey = useCallback((e) => {
    if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, order.length - 1));
    if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
  }, [order.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  function toggleShuffle() {
    if (shuffled) {
      setOrder(cards.map((_, i) => i));
    } else {
      setOrder(shuffleArray(cards.map((_, i) => i)));
    }
    setShuffled(!shuffled);
    setIndex(0);
  }

  if (!cards.length) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;

  const card = cards[order[index]];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(`/decks/${id}`)} className="text-sm text-indigo-500 hover:underline">← Back</button>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">{deckName}</h2>
          <button
            onClick={toggleShuffle}
            className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
              shuffled
                ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            Shuffle
          </button>
        </div>

        <div className="mb-4">
          <ProgressBar current={index + 1} total={order.length} />
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">Card {index + 1} of {order.length}</p>
        </div>

        <FlipCard key={`${order[index]}-${index}`} word={card.word} translation={card.translation} />

        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(i + 1, order.length - 1))}
            disabled={index === order.length - 1}
            className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            Next →
          </button>
        </div>
        <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-3">Space to flip · Arrow keys to navigate</p>
      </div>
    </div>
  );
}
