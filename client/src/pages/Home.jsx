// Home.jsx (updated)
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../styles/Home.css';

const API = process.env.REACT_APP_API || '/api';

function toExcerpt(html, len = 200) {
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
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) return match[1];
  return '';
}

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [debouncedQ, setDebouncedQ] = useState(q);
  const debounceRef = useRef(null);
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(q), 450);
    return () => clearTimeout(debounceRef.current);
  }, [q]);

  const loadPosts = useCallback(
    async (cat = category, search = debouncedQ) => {
      try {
        setLoading(true);
        setErr('');
        const url = `${API}/posts?q=${encodeURIComponent(search || '')}&category=${encodeURIComponent(cat || '')}`;
        const res = await axios.get(url);
        const data = res.data || [];
        if (Array.isArray(data)) setPosts(data);
        else setPosts(data.posts || []);
      } catch (e) {
        setErr(e?.response?.data?.message || e.message || 'Failed to load posts');
        setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    [debouncedQ, category]
  );

  useEffect(() => {
    loadPosts(category, debouncedQ);
  }, [category, debouncedQ, loadPosts]);

  const categories = useMemo(() => {
    const s = new Set();
    posts.forEach((p) => (p.categories || []).forEach((c) => c && s.add(c)));
    return Array.from(s);
  }, [posts]);

  function handleCategoryClick(cat) {
    if (cat === category) setCategory('');
    else setCategory(cat);
  }

  return (
    <div className="home">
      <div className="home-header">
        <h2 className="centered-underline">Latest posts</h2>
      </div>

      <div className="content-layout">
        <main className="main-col">
          <form
            className="search-form centered-search"
            onSubmit={(e) => {
              e.preventDefault();
              loadPosts(category, debouncedQ);
            }}
            role="search"
            aria-label="Search posts"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts..."
              aria-label="Search posts"
            />
            <button type="submit" aria-label="Search">
              Search
            </button>
          </form>

          {err && <div className="err">{err}</div>}

          {loading ? (
            <div className="post-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <article className="post-card skeleton" key={i} aria-hidden>
                  <div className="s-media" />
                  <div className="s-title" />
                  <div className="s-excerpt" />
                  <div className="s-meta" />
                </article>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="empty">
              <p>No posts found. Try different search terms or create a new post.</p>
              <Link className="btn primary" to="/new">
                Create first post
              </Link>
            </div>
          ) : (
            <>
              <div className="post-grid">
                {posts.map((p) => {
                  const img = pickImage(p);
                  return (
                    <article key={p._id} className="post-card">
                      <div className="post-card-media">
                        <img
                          src={
                            img ||
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%23eef4fb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2399a8b2" font-family="Arial" font-size="20">No image</text></svg>'
                          }
                          alt={p.title || 'post image'}
                          loading="lazy"
                        />
                      </div>

                      <div className="post-card-body">
                        <div className="card-head">
                          <h3 className="card-title">{p.title}</h3>
                          <div className="card-meta">
                            By <strong>{p.authorName}</strong> · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''}
                          </div>
                        </div>

                        <p className="card-excerpt">{toExcerpt(p.content || '', 220)}</p>

                        <div className="card-footer">
                          <div className="badges">
                            {(p.categories || []).slice(0, 3).map((c) => (
                              <button key={c} className="badge" onClick={() => handleCategoryClick(c)}>
                                {c}
                              </button>
                            ))}
                          </div>

                          <div className="counts">
                            <span className="count">♥ {Array.isArray(p.likes) ? p.likes.length : p.likes || 0}</span>
                            <span className="count">💬 {(p.comments || []).length}</span>
                          </div>
                        </div>
                      </div>

                      <div className="card-actions">
                        <Link className="btn small" to={`/post/${p._id}`}>
                          Read
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <aside className="side-col" aria-label="Popular categories">
          <div className="popular-box">
            <h4>Popular categories</h4>
            {categories.length === 0 ? (
              <p className="muted">No categories yet</p>
            ) : (
              <div className="popular-list">
                {categories.slice(0, 5).map((c) => (
                  <button
                    key={c}
                    className={`popular-pill ${category === c ? 'active' : ''}`}
                    onClick={() => handleCategoryClick(c)}
                    title={`Filter by ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
