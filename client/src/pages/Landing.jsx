import '../styles/Landing.css';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API || '/api';

export default function Landing() {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErr('');
    axios
      .get(`${API}/posts`, {
        params: {
          page: 1,
          limit: 4, // fetch latest 6 posts
        },
      })
      .then(res => {
        if (!mounted) return;
        const data = res.data;
        // route returns { posts, total } — handle both shapes
        const posts = Array.isArray(data) ? data : data.posts || [];
        setRecent(posts);
      })
      .catch(e => {
        if (!mounted) return;
        setErr(e?.response?.data?.message || e.message || 'Failed to load recent posts');
        setRecent([]);
      })
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  function toExcerpt(html, len = 120) {
    const text = (html || '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > len ? text.slice(0, len) + '…' : text;
  }

  function pickImage(p) {
    if (!p) return '';
    const fromFields = p.image || p.coverImage || p.imageUrl || p.thumbnail || p.cover;
    if (fromFields) return fromFields;
    const html = p.content || '';
    const match = html.match(/<img[^>]+src=(?:["'])([^"']+)(?:["'])/i);
    return match ? match[1] : '';
  }

  return (
    <div className="landing">
      <header className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <h1 className="hero-title">Write. Share. Inspire.</h1>
            <p className="hero-sub">
              A minimal blogging platform — create rich posts, get feedback with comments & likes,
              and manage everything from your profile.
            </p>

            <div className="cta">
              <Link to="/register" className="btn primary" aria-label="Sign up — Get started">
                Get Started
              </Link>
              <Link to="/home" className="btn ghost" aria-label="Explore posts">
                Explore
              </Link>
            </div>

            <ul className="quick-stats" aria-hidden>
              <li>
                <strong>Rich editor</strong>
                <span>Quill-powered writing</span>
              </li>
              <li>
                <strong>Social</strong>
                <span>Comments & likes</span>
              </li>
              <li>
                <strong>Admin</strong>
                <span>Moderation tools</span>
              </li>
            </ul>
          </div>

          <div className="hero-art" role="img" aria-label="Illustration of writing and sharing">
            {/* lightweight SVG illustration */}
            <svg viewBox="0 0 520 360" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="#dbeafe" />
                  <stop offset="1" stopColor="#c7f9d7" />
                </linearGradient>
              </defs>
              <rect x="12" y="24" rx="16" ry="16" width="496" height="312" fill="url(#g1)"/>
              <rect x="44" y="62" rx="6" ry="6" width="420" height="18" fill="#0b5cff"/>
              <rect x="44" y="90" rx="6" ry="6" width="360" height="12" fill="#ffffff"/>
              <rect x="44" y="110" rx="6" ry="6" width="300" height="12" fill="#ffffff"/>
              <circle cx="420" cy="250" r="36" fill="#fff" opacity="0.9"/>
              <path d="M396 240c10-12 28-18 40-8" stroke="#0b5cff" strokeWidth="6" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
        </div>
      </header>

      {/* ---------- NEW: Recent posts section (between hero and features) ---------- */}
      <section className="recent-blogs" aria-label="Recent posts">
        <div className="recent-inner">
          <div className="recent-header">
            <h2>Recent posts</h2>
            <Link to="/home" className="view-all">View all</Link>
          </div>

          {loading ? (
            <div className="blog-grid loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <div className="blog-card skeleton" key={i} aria-hidden>
                  <div className="s-thumb" />
                  <div className="s-title" />
                  <div className="s-excerpt" />
                </div>
              ))}
            </div>
          ) : err ? (
            <div className="recent-error">{err}</div>
          ) : recent.length === 0 ? (
            <div className="recent-empty">No posts yet — be the first to write one!</div>
          ) : (
            <div className="blog-grid">
              {recent.map(p => {
                const img = pickImage(p);
                return (
                  <article className="blog-card" key={p._id}>
                    <Link to={`/post/${p._id}`} className="thumb-link" aria-label={`Read ${p.title}`}>
                      {img ? (
                        <img src={img} alt={p.title || 'post image'} loading="lazy" />
                      ) : (
                        <div className="thumb-placeholder" aria-hidden />
                      )}
                    </Link>

                    <div className="blog-body">
                      <h3 className="blog-title">
                        <Link to={`/post/${p._id}`}>{p.title}</Link>
                      </h3>
                      <p className="blog-excerpt">{toExcerpt(p.content || '', 100)}</p>
                      <div className="blog-meta">
                        <span className="author">{p.authorName}</span>
                        <span className="dot">•</span>
                        <span className="date">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}</span>
                        <Link to={`/post/${p._id}`} className="btn small read-btn">Read</Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
      {/* ---------- end recent posts ---------- */}

      <section className="features">
        <article className="feature">
          <div className="feature-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h10M4 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <h3>Rich text editor</h3>
          <p>Powerful WYSIWYG editor with images, links and formatting.</p>
        </article>

        <article className="feature">
          <div className="feature-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 20v-6M6 12l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <h3>Comments & likes</h3>
          <p>Get feedback and build community around your posts.</p>
        </article>

        <article className="feature">
          <div className="feature-icon" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <h3>Admin dashboard</h3>
          <p>Moderate content, manage users and keep your site healthy.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <div className="footer-inner">
          <p>Made with ❤️ • Simple & lightweight MERN blog</p>
          <small>© {new Date().getFullYear()} Your Blog</small>
        </div>
      </footer>
    </div>
  );
}
