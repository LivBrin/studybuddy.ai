import type { Quiz } from './types';

const HISTORY_KEY = 'study-guide:history';
const CURRENT_KEY = 'study-guide:current';

export function loadHistory(): Quiz[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistory(quizzes: Quiz[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(quizzes));
}

export function upsertQuiz(quiz: Quiz) {
  const history = loadHistory();
  const idx = history.findIndex((q) => q.id === quiz.id);
  if (idx >= 0) history[idx] = quiz;
  else history.unshift(quiz);
  saveHistory(history);
}

export function deleteQuiz(id: string) {
  saveHistory(loadHistory().filter((q) => q.id !== id));
}

export function setCurrent(quiz: Quiz) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(CURRENT_KEY, JSON.stringify(quiz));
}

export function loadCurrent(): Quiz | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CURRENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCurrent() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(CURRENT_KEY);
}
