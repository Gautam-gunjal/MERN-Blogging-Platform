import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/App.css';

/**
 * Set a synchronous initial theme attribute on the documentElement to reduce
 * the "flash" of incorrect theme on first paint.
 * This runs before React renders.
 */
(function setInitialTheme() {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
      return;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      return;
    }
    document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {
    try { document.documentElement.setAttribute('data-theme', 'light'); } catch (err) {}
  }
})();

createRoot(document.getElementById('root')).render(<App />);
