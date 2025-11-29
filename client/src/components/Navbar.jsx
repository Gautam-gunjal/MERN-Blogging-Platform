import React, { useEffect, useState, useRef, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';
import { ThemeContext } from '../App';

export default function Navbar() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const nav = useNavigate();
  const userMenuRef = useRef(null);

  // Theme context (read + toggle). App.js provides ThemeContext.
  const { theme, toggleTheme } = useContext(ThemeContext);

  useEffect(() => {
    // sync across tabs
    function onStorage(e) {
      if (e.key === 'token') setToken(localStorage.getItem('token'));
      if (e.key === 'user') {
        try { setUser(JSON.parse(localStorage.getItem('user') || 'null')); } catch { setUser(null); }
      }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    // close menus on outside click
    function onDoc(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  useEffect(() => {
    // Poll localStorage for changes in the same tab (detect login/logout without needing other files to emit events).
    // This is intentionally lightweight and only updates state when values actually change.
    const last = {
      token: localStorage.getItem('token'),
      userJson: localStorage.getItem('user'),
    };

    function tryParseUser(json) {
      try { return JSON.parse(json || 'null'); } catch { return null; }
    }

    const check = () => {
      const t = localStorage.getItem('token');
      const ujson = localStorage.getItem('user');

      if (t !== last.token) {
        last.token = t;
        setToken(t);
      }

      if (ujson !== last.userJson) {
        last.userJson = ujson;
        setUser(tryParseUser(ujson));
      }
    };

    const id = setInterval(check, 500); // check twice a second
    return () => clearInterval(id);
  }, []);

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUserMenuOpen(false);
    nav('/');
  }

  function avatarInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return initials.toUpperCase().slice(0, 2);
  }

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* Left: Brand */}
        <div className="nav-left">
          <Link to="/" className="brand" aria-label="MERN Blog home">
            <span className="logo-mark">MB</span>
            <span className="brand-text">MERN Blog</span>
          </Link>
        </div>

        {/* Center (pushed to right via CSS) - holds primary nav links like Home / New */}
        <nav className={`nav-center ${mobileOpen ? 'open' : ''}`} aria-label="Primary">
          <Link to="/home" className="nav-link" onClick={() => setMobileOpen(false)}>Home</Link>

          {/* New Post link for logged-in users */}
          {token && <Link to="/new" className="nav-link" onClick={() => setMobileOpen(false)}>New Post</Link>}

          {/* ADMIN: show primary Admin link for users with admin role */}
          {token && user?.role === 'admin' && (
            <Link to="/admin" className="nav-link" onClick={() => setMobileOpen(false)}>Admin</Link>
          )}
        </nav>

        {/* Right: auth area (sign in / register) OR avatar + logout when logged in */}
        <div className="nav-right">
          {!token ? (
            <>
              <Link to="/login" className="btn ghost">Sign in</Link>
              <Link to="/register" className="btn solid">Register</Link>

              {/* Theme toggle placed before hamburger for unauthenticated users */}
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </>
          ) : (
            <>
              <div className="user-area" ref={userMenuRef}>
                <button
                  type="button"
                  className="avatar-btn"
                  onClick={() => setUserMenuOpen(s => !s)}
                  aria-haspopup="true"
                  aria-expanded={userMenuOpen}
                  title={user?.username || 'Profile'}
                >
                  <span className="avatar">{avatarInitials(user?.username)}</span>
                  <span className="username">{user?.username?.split(' ')[0]}</span>
                  <svg className={`chev ${userMenuOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>

                {userMenuOpen && (
                  <div className="user-menu" role="menu">
                    <Link className="user-item" to="/profile" onClick={() => setUserMenuOpen(false)}>Profile</Link>
                    <Link className="user-item" to="/new" onClick={() => setUserMenuOpen(false)}>New Post</Link>
                    {user?.role === 'admin' && <Link className="user-item" to="/admin" onClick={() => setUserMenuOpen(false)}>Admin</Link>}
                    {/* Note: logout moved to visible red button to the right of avatar (no duplicate here) */}
                  </div>
                )}
              </div>

              {/* Theme toggle now appears before Logout (per request) */}
              <button
                type="button"
                className="theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>

              {/* Visible red logout button on the right of avatar (desktop & mobile) */}
              <button
                type="button"
                className="btn danger logout-visible"
                onClick={logout}
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          )}

          {/* Hamburger stays at the far right (mobile) */}
          <button
            type="button"
            className={`hamburger ${mobileOpen ? 'open' : ''}`}
            onClick={() => setMobileOpen(s => !s)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
