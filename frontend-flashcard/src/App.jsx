import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Home from './pages/Home';
import DeckView from './pages/DeckView';
import CardMode from './pages/CardMode';
import LearnMode from './pages/LearnMode';
import QuizMode from './pages/QuizMode';
import SpacedRepetitionMode from './pages/SpacedRepetitionMode';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter basename="/flashcard">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decks/:id" element={<DeckView />} />
          <Route path="/decks/:id/cards" element={<CardMode />} />
          <Route path="/decks/:id/learn" element={<LearnMode />} />
          <Route path="/decks/:id/quiz" element={<QuizMode />} />
          <Route path="/decks/:id/sr" element={<SpacedRepetitionMode />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
