import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, getDueCards, reviewCard } from '../api';
import FlipCard from '../components/Card/FlipCard';
import ProgressBar from '../components/Shared/ProgressBar';
import { shuffleArray } from '../lib/shuffle';
import { loadSession, saveSession, clearSession } from '../lib/sessionStorage';

const GRADES = [
  { quality: 1, label: 'Again',  sub: 'Forgot',       cls: 'border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' },
  { quality: 3, label: 'Hard',   sub: 'Nearly',        cls: 'border-orange-200 dark:border-orange-800 text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20' },
  { quality: 4, label: 'Good',   sub: 'Got it',        cls: 'border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' },
  { quality: 5, label: 'Easy',   sub: 'Too easy',      cls: 'border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20' },
];

export default function SpacedRepetitionMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deckName, setDeckName] = useState('');
  const [queue, setQueue] = useState([]);
  const [reviewed, setReviewed] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastNext, setLastNext] = useState(null);
  const [shuffled, setShuffled] = useState(false);
  const restored = useRef(false);
  const allCardsRef = useRef([]);

  useEffect(() => {
    Promise.all([getDeck(id), getDueCards(id)]).then(([deck, due]) => {
      setDeckName(deck.name);
      allCardsRef.current = deck.cards;

      const session = loadSession('spaced-repetition', id);
      const byId = new Map(deck.cards.map((c) => [c.id, c]));
      const queueIds = session?.queueIds;
      const reviewedEntries = session?.reviewed;
      const canRestore = !session?.done
        && Array.isArray(queueIds) && queueIds.length > 0
        && queueIds.every((cardId) => byId.has(cardId))
        && Array.isArray(reviewedEntries)
        && reviewedEntries.every((r) => byId.has(r.id));

      if (canRestore) {
        setQueue(queueIds.map((cardId) => byId.get(cardId)));
        setReviewed(reviewedEntries.map((r) => ({ ...byId.get(r.id), quality: r.quality })));
        setTotal(queueIds.length + reviewedEntries.length);
        setShuffled(!!session.shuffled);
      } else {
        setQueue(due);
        setTotal(due.length);
      }
      restored.current = true;
    });
  }, [id]);

  useEffect(() => {
    if (!restored.current) return;
    saveSession('spaced-repetition', id, {
      queueIds: queue.map((c) => c.id),
      reviewed: reviewed.map((r) => ({ id: r.id, quality: r.quality })),
      shuffled,
      done,
    });
  }, [queue, reviewed, shuffled, done, id]);

  function toggleShuffle() {
    setQueue((q) => {
      if (q.length <= 1) return q;
      const [head, ...rest] = q;
      if (shuffled) {
        const restIds = new Set(rest.map((c) => c.id));
        const ordered = allCardsRef.current.filter((c) => restIds.has(c.id));
        return [head, ...ordered];
      }
      return [head, ...shuffleArray(rest)];
    });
    setShuffled(!shuffled);
  }

  const grade = useCallback(async (quality) => {
    const card = queue[0];
    const result = await reviewCard(card.id, quality);
    setLastNext(result.nextReview);
    setReviewed(r => [...r, { ...card, quality }]);
    const remaining = queue.slice(1);
    // For quality < 3 (fail), requeue at end so user sees it again this session
    if (quality < 3) remaining.push(card);
    setRevealed(false);
    if (remaining.length === 0) {
      setDone(true);
      clearSession('spaced-repetition', id);
    } else {
      setQueue(remaining);
    }
  }, [queue, id]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (revealed) {
        if (e.key === '1') grade(1);
        if (e.key === '2') grade(3);
        if (e.key === '3') grade(4);
        if (e.key === '4') grade(5);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, grade]);

  if (!queue.length && !done && total === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">All caught up!</h2>
          <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">No cards due for review today. Come back tomorrow!</p>
          <button onClick={() => navigate(`/decks/${id}`)} className="w-full py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 text-sm font-medium">Back to Deck</button>
        </div>
      </div>
    );
  }

  if (!queue.length && !done) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;

  if (done) {
    const passed = reviewed.filter(r => r.quality >= 3).length;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Session done!</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
            <strong className="text-emerald-600">{passed}</strong> / {total} cards passed
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Cards are scheduled for future review based on your ratings.</p>
          <button onClick={() => navigate(`/decks/${id}`)} className="mt-6 w-full py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 text-sm font-medium">Back to Deck</button>
        </div>
      </div>
    );
  }

  const card = queue[0];
  const progress = total - queue.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(`/decks/${id}`)} className="text-sm text-indigo-500 hover:underline">← Back</button>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">{deckName} — Spaced Rep</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 dark:text-gray-500">{progress}/{total} done</span>
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
        </div>

        <div className="mb-4">
          <ProgressBar current={progress} total={total} />
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">{queue.length} remaining</p>
        </div>

        {card.interval_days > 0 && (
          <p className="text-center text-xs text-gray-300 dark:text-gray-600 mb-2">
            Last interval: {card.interval_days}d · EF: {(card.ease_factor ?? 2.5).toFixed(2)}
          </p>
        )}

        <FlipCard
          key={card.id}
          word={card.word}
          translation={card.translation}
          forceFlipped={revealed}
          onClick={(isFlipped) => setRevealed(isFlipped)}
        />

        {revealed ? (
          <>
            <div className="grid grid-cols-4 gap-2 mt-6">
              {GRADES.map(({ quality, label, sub, cls }, i) => (
                <button key={quality} onClick={() => grade(quality)}
                  className={`py-3 rounded-2xl border-2 font-medium text-sm transition-colors ${cls}`}>
                  <span className="text-xs block text-gray-300 dark:text-gray-600">{i + 1}</span>
                  {label}
                  <span className="block text-xs opacity-60">{sub}</span>
                </button>
              ))}
            </div>
            <p className="text-center text-xs text-gray-300 dark:text-gray-600 mt-2">Keys 1–4 to grade</p>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">Click or press Space to reveal</p>
        )}
      </div>
    </div>
  );
}
