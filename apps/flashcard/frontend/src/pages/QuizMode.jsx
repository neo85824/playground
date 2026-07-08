import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeck, saveQuizResult } from '../api';
import ProgressBar from '../components/Shared/ProgressBar';
import { shuffleArray } from '../lib/shuffle';
import { loadSession, saveSession, clearSession } from '../lib/sessionStorage';

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[a.length][b.length];
}

function getChoices(cards, correctCard) {
  const others = cards.filter((c) => c.id !== correctCard.id);
  const picked = shuffleArray(others).slice(0, 3);
  return shuffleArray([...picked, correctCard]);
}

export default function QuizMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deckName, setDeckName] = useState('');
  const [allCards, setAllCards] = useState([]);
  const [mode, setMode] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [correct, setCorrect] = useState(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState([]);
  const [done, setDone] = useState(false);
  const [startTime] = useState(Date.now());
  const [shuffled, setShuffled] = useState(true);
  const [reversed, setReversed] = useState(false);
  const [resumable, setResumable] = useState(null);
  const typedRef = useRef();
  const restored = useRef(false);

  useEffect(() => {
    getDeck(id).then((data) => {
      setDeckName(data.name);
      setAllCards(data.cards);

      const session = loadSession('quiz', id);
      const byId = new Map(data.cards.map((c) => [c.id, c]));
      const questionIds = session?.questionIds;
      const missedIds = session?.missedIds;
      const canResume = !session?.done
        && Array.isArray(questionIds) && questionIds.length > 0
        && questionIds.every((cardId) => byId.has(cardId))
        && Array.isArray(missedIds) && missedIds.every((cardId) => byId.has(cardId))
        && typeof session.qIndex === 'number' && session.qIndex < questionIds.length;

      setResumable(canResume ? session : null);
      restored.current = true;
    });
  }, [id]);

  useEffect(() => {
    if (!restored.current || !mode) return;
    saveSession('quiz', id, {
      mode,
      questionIds: questions.map((c) => c.id),
      qIndex,
      score,
      missedIds: missed.map((c) => c.id),
      shuffled,
      reversed,
      done,
    });
  }, [mode, questions, qIndex, score, missed, shuffled, reversed, done, id]);

  function startQuiz(selectedMode) {
    clearSession('quiz', id);
    setQuestions(shuffled ? shuffleArray(allCards) : allCards);
    setMode(selectedMode);
    setQIndex(0);
    setScore(0);
    setMissed([]);
    setDone(false);
    setAnswered(false);
    setSelected(null);
    setTypedAnswer('');
    setResumable(null);
  }

  function resumeQuiz() {
    if (!resumable) return;
    const byId = new Map(allCards.map((c) => [c.id, c]));
    setQuestions(resumable.questionIds.map((cardId) => byId.get(cardId)));
    setMode(resumable.mode);
    setQIndex(resumable.qIndex);
    setScore(resumable.score);
    setMissed(resumable.missedIds.map((cardId) => byId.get(cardId)));
    setShuffled(!!resumable.shuffled);
    setReversed(!!resumable.reversed);
    setDone(false);
    setAnswered(false);
    setSelected(null);
    setTypedAnswer('');
    setCorrect(null);
    setResumable(null);
  }

  function handleMCAnswer(choice) {
    if (answered) return;
    const isCorrect = choice.id === questions[qIndex].id;
    setSelected(choice.id);
    setAnswered(true);
    setCorrect(isCorrect);
    if (isCorrect) setScore(s => s + 1);
    else setMissed(m => [...m, questions[qIndex]]);
    setTimeout(() => advance(), 1400);
  }

  function handleTypedAnswer(e) {
    e.preventDefault();
    if (answered) return;
    const input = typedAnswer.trim().toLowerCase();
    const target = (reversed ? questions[qIndex].word : questions[qIndex].translation).trim().toLowerCase();
    const isCorrect = levenshtein(input, target) <= 2;
    setAnswered(true);
    setCorrect(isCorrect);
    if (isCorrect) setScore(s => s + 1);
    else setMissed(m => [...m, questions[qIndex]]);
    setTimeout(() => advance(), 1600);
  }

  function advance() {
    if (qIndex + 1 >= questions.length) {
      finishQuiz();
    } else {
      setQIndex(i => i + 1);
      setAnswered(false);
      setSelected(null);
      setTypedAnswer('');
      setCorrect(null);
      setTimeout(() => typedRef.current?.focus(), 50);
    }
  }

  async function finishQuiz() {
    const finalScore = answered && correct ? score + 1 : score;
    await saveQuizResult({ deck_id: Number(id), score: finalScore, total: questions.length, mode });
    setDone(true);
    clearSession('quiz', id);
  }

  const card = questions[qIndex];
  const choices = useMemo(() => {
    if (mode !== 'multiple_choice' || !card) return [];
    return getChoices(allCards, card);
  }, [mode, allCards, card]);

  if (!mode) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 text-center max-w-sm w-full">
          <button onClick={() => navigate(`/decks/${id}`)} className="text-sm text-indigo-500 hover:underline mb-6 block">← Back</button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{deckName}</h2>
          <p className="text-gray-400 dark:text-gray-500 mb-4 text-sm">Choose quiz mode</p>
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setReversed((r) => !r)}
              className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
                reversed
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {reversed ? 'B→A' : 'A→B'}
            </button>
            <button
              onClick={() => setShuffled((s) => !s)}
              className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
                shuffled
                  ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-300'
                  : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              Shuffle {shuffled ? 'on' : 'off'}
            </button>
          </div>
          <div className="space-y-3">
            {resumable && (
              <button onClick={resumeQuiz} className="w-full py-4 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all text-left px-5">
                <div className="font-semibold text-emerald-700 dark:text-emerald-400">Continue Quiz</div>
                <div className="text-sm text-emerald-500 dark:text-emerald-500 mt-0.5">Resume at question {resumable.qIndex + 1} of {resumable.questionIds.length}</div>
              </button>
            )}
            <button onClick={() => startQuiz('multiple_choice')} className="w-full py-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all text-left px-5">
              <div className="font-semibold text-gray-700 dark:text-gray-200">Multiple Choice</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Pick the correct translation</div>
            </button>
            <button onClick={() => startQuiz('typed')} className="w-full py-4 rounded-2xl border-2 border-purple-100 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left px-5">
              <div className="font-semibold text-gray-700 dark:text-gray-200">Typed Answer</div>
              <div className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Type the translation (typos OK)</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-10 max-w-md w-full">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Quiz complete!</h2>
            <p className="text-4xl font-bold text-indigo-600 mt-2">{score}/{questions.length}</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Time: {mins > 0 ? `${mins}m ` : ''}{secs}s</p>
          </div>
          {missed.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Missed cards:</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {missed.map((c) => (
                  <div key={c.id} className="flex justify-between text-sm bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                    <span className="text-gray-700 dark:text-gray-300">{c.word}</span>
                    <span className="text-red-500 dark:text-red-400">{c.translation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => navigate(`/decks/${id}`)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm">Back to Deck</button>
            <button onClick={() => startQuiz(mode)} className="flex-1 py-2.5 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 text-sm font-medium">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setMode(null)} className="text-sm text-indigo-500 hover:underline">← Change Mode</button>
          <h2 className="font-semibold text-gray-700 dark:text-gray-200">{deckName}</h2>
          <span className="text-sm text-gray-400 dark:text-gray-500">{score} correct</span>
        </div>

        <div className="mb-5">
          <ProgressBar current={qIndex} total={questions.length} />
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mt-1">{qIndex + 1} / {questions.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-6 text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Translate</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{reversed ? card.translation : card.word}</p>
        </div>

        {mode === 'multiple_choice' && (
          <div className="grid grid-cols-2 gap-3">
            {choices.map((choice) => {
              let cls = 'w-full py-4 px-4 rounded-2xl border-2 text-sm font-medium transition-all text-center ';
              if (!answered) {
                cls += 'border-gray-100 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer text-gray-700 dark:text-gray-200';
              } else if (choice.id === card.id) {
                cls += 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400';
              } else if (choice.id === selected) {
                cls += 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
              } else {
                cls += 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600';
              }
              return (
                <button key={choice.id} onClick={() => handleMCAnswer(choice)} className={cls} disabled={answered}>
                  {reversed ? choice.word : choice.translation}
                </button>
              );
            })}
          </div>
        )}

        {mode === 'typed' && (
          <form onSubmit={handleTypedAnswer} className="space-y-3">
            <input
              ref={typedRef}
              autoFocus
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
              disabled={answered}
              placeholder="Type the translation…"
              className={`w-full border-2 rounded-2xl px-5 py-4 text-lg outline-none transition-colors dark:bg-gray-800 ${
                answered
                  ? correct
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                  : 'border-gray-200 dark:border-gray-600 focus:border-indigo-400 dark:text-gray-100'
              }`}
            />
            {answered && (
              <div className={`text-center text-sm font-medium ${correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                {correct ? '✓ Correct!' : `✗ Answer: ${reversed ? card.word : card.translation}`}
              </div>
            )}
            {!answered && (
              <button type="submit" className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors">
                Check
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
