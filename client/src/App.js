import React, { createContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import NewPost from './pages/NewPost';
import PostPage from './pages/PostPage';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

/**
 * Synchronously set an initial theme on documentElement to reduce FOUC.
 * This runs immediately when this module is imported.
 */
const _initialTheme = (() => {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.setAttribute('data-theme', saved);
      return saved;
    }
    // fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
      return 'dark';
    }
    document.documentElement.setAttribute('data-theme', 'light');
    return 'light';
  } catch (e) {
    // if anything fails, default to light
    try { document.documentElement.setAttribute('data-theme', 'light'); } catch {}
    return 'light';
  }
})();

/**
 * ThemeContext: components can use this to read theme or toggle it.
 * Example in Navbar: const { theme, toggleTheme } = useContext(ThemeContext);
 */
export const ThemeContext = createContext({
  theme: _initialTheme,
  toggleTheme: () => {},
});

function AdminRoute({ children }) {
  // small synchronous guard reading from localStorage
  const raw = localStorage.getItem('user');
  let user = null;
  try {
    user = raw ? JSON.parse(raw) : null;
  } catch (e) {
    user = null;
  }
  if (!user || user.role !== 'admin') {
    return <Navigate to="/home" replace />;
  }
  return children;
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    // use the precomputed initial theme (already set to documentElement)
    return _initialTheme || 'light';
  });

  useEffect(() => {
    // keep the document attribute and localStorage in sync
    try {
      document.documentElement.setAttribute('data-theme', theme);
    } catch (e) {}
    try {
      localStorage.setItem('theme', theme);
    } catch (e) {}
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path='/' element={<Landing/>} />
          <Route path='/home' element={<Home/>} />
          <Route path='/login' element={<Login/>} />
          <Route path='/register' element={<Register/>} />
          <Route path='/new' element={<NewPost/>} />
          <Route path='/post/:id' element={<PostPage/>} />
          <Route path='/profile' element={<Profile/>} />
          <Route path='/admin' element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          } />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
