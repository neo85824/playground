import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, saveLearnResult } from '../api';
import FlipCard from '../components/Card/FlipCard';
import ProgressBar from '../components/Shared/ProgressBar';

export default function LearnMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deckName, setDeckName] = useState('');
  const [queue, setQueue] = useState([]);
  const [known, setKnown] = useState([]);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [totalCards, setTotalCards] = useState(0);

  useEffect(() => {
    getDeck(id).then((data) => {
      setDeckName(data.name);
      const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
      setQueue(shuffled);
      setTotalCards(data.cards.length);
    });
  }, [id]);

  const respond = useCallback(async (knewIt) => {
    const card = queue[0];
    if (!card) return;
    await saveLearnResult({ deck_id: Number(id), card_id: card.id, knew_it: knewIt });
    const remaining = queue.slice(1);
    if (knewIt) {
      setKnown(k => [...k, card]);
    } else {
      const pos = Math.floor(Math.random() * (remaining.length + 1));
      remaining.splice(pos, 0, card);
    }
    setRevealed(false);
    if (remaining.length === 0) setDone(true);
    else setQueue(remaining);
  }, [queue, id]);

  // Keyboard shortcuts: Space to reveal, 1 = still learning, 2 = got it
  useEffect(() => {
    function onKey(e) {
      if (e.key === ' ') { e.preventDefault(); setRevealed(r => !r); }
      if (e.key === '1' && revealed) respond(false);
      if (e.key === '2' && revealed) respond(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, respond]);

  if (!queue.length && !done) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 text-center max-w-sm w-full">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Session complete!</h2>
          <p className="text-gray-400 dark:text-gray-400 mb-2">
            You learned <strong className="text-emerald-600">{known.length}</strong> of <strong>{totalCards}</strong> cards.
          </p>
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate(`/decks/${id}`)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Back to Deck</button>
            <button
              onClick={() => { setQueue([...known].sort(() => Math.random() - 0.5)); setKnown([]); setDone(false); setRevealed(false); }}
              className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 text-sm font-medium"
            >Study Again</button>
          </div>
        </div>
      </div>
    );
  }

  const card = queue[0];
  const progress = totalCards - queue.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(`/decks/${id}`)} className="text-sm text-indigo-500 hover:underline">← Back</button>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">{deckName} — Learn</h2>
          <span className="text-sm text-gray-400 dark:text-gray-500">{known.length}/{totalCards} known</span>
        </div>

        <div className="mb-4">
          <ProgressBar current={progress} total={totalCards} />
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-2">{queue.length} card{queue.length !== 1 ? 's' : ''} remaining</p>
        </div>

        <FlipCard
          key={card.id}
          word={card.word}
          translation={card.translation}
          forceFlipped={revealed}
          onClick={(isFlipped) => setRevealed(isFlipped)}
        />

        {revealed ? (
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={() => respond(false)}
              className="flex-1 max-w-48 py-3 rounded-2xl border-2 border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="text-xs block text-red-300 dark:text-red-600">press 1</span>
              Still learning
            </button>
            <button
              onClick={() => respond(true)}
              className="flex-1 max-w-48 py-3 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <span className="text-xs block text-emerald-300 dark:text-emerald-600">press 2</span>
              Got it
            </button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-6">Click or press Space to reveal · 1 = still learning · 2 = got it</p>
        )}
      </div>
    </div>
  );
}
