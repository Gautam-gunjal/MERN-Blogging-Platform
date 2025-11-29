import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import "../styles/Profile.css"

const API = process.env.REACT_APP_API || '/api';

// same helper you use in Home.jsx
function pickImage(p) {
  if (!p) return '';

  const fromFields =
    p.image ||
    p.coverImage ||
    p.imageUrl ||
    p.thumbnail ||
    p.cover;

  if (fromFields) return fromFields;

  const html = p.content || '';
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match && match[1]) {
    return match[1];
  }

  return '';
}

export default function Profile() {
  const nav = useNavigate();
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // new state for edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    linkedin: '',
    github: '',
    description: '',
    picture: null
  });
  const [editPreview, setEditPreview] = useState(null); // preview URL for selected picture
  const [editErr, setEditErr] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // which side tab is selected (profile, blogs, comments)
  const [selectedTab, setSelectedTab] = useState('profile');

  // menu state for action dots (posts)
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setErr('');

        const res = await axios.get(`${API}/users/me`, {
          headers: { Authorization: 'Bearer ' + token }
        });
        const data = res.data;
        const loadedUser = data.user || data;
        setUser(loadedUser);
        setPosts(data.posts || data.authoredPosts || []);
        setStats(data.stats || {
          totalBlogs: (data.posts || []).length,
          totalLikes: 0,
          totalComments: 0,
          totalViews: 0
        });
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || e.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // close action menus on outside click
  useEffect(() => {
    const onDocClick = () => setOpenMenuId(null);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  // clean up preview url on unmount
  useEffect(() => {
    return () => {
      if (editPreview) {
        URL.revokeObjectURL(editPreview);
      }
    };
  }, [editPreview]);

  const openEdit = () => {
    if (!user) return;
    const parts = (user.username || '').trim().split(' ');
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ');
    setEditData({
      firstName,
      lastName,
      linkedin: user.linkedin || '',
      github: user.github || '',
      description: user.bio || '',
      picture: null
    });
    if (editPreview) {
      URL.revokeObjectURL(editPreview);
      setEditPreview(null);
    }
    setEditErr('');
    setShowEdit(true);
  };

  const closeEdit = () => {
    setShowEdit(false);
    setEditErr('');
    if (editPreview) {
      URL.revokeObjectURL(editPreview);
      setEditPreview(null);
    }
    // clear file from state
    setEditData(d => ({ ...d, picture: null }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData(d => ({ ...d, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    // revoke previous preview
    if (editPreview) {
      URL.revokeObjectURL(editPreview);
      setEditPreview(null);
    }
    if (file) {
      const url = URL.createObjectURL(file);
      setEditPreview(url);
      setEditData(d => ({ ...d, picture: file }));
    } else {
      setEditData(d => ({ ...d, picture: null }));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditErr('');
    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      formData.append('firstName', editData.firstName);
      formData.append('lastName', editData.lastName);
      formData.append('linkedin', editData.linkedin);
      formData.append('github', editData.github);
      formData.append('description', editData.description);
      if (editData.picture) {
        formData.append('picture', editData.picture);
      }

      const res = await axios.put(`${API}/users/me`, formData, {
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'multipart/form-data'
        }
      });

      const updatedUser = res.data.user || res.data;
      setUser(updatedUser);

      // clear preview + file
      if (editPreview) {
        URL.revokeObjectURL(editPreview);
        setEditPreview(null);
      }
      setEditData(d => ({ ...d, picture: null }));
      setShowEdit(false);
    } catch (e) {
      console.error(e);
      setEditErr(e?.response?.data?.message || e.message || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setOpenMenuId(prev => (prev === id ? null : id));
  };

  const handleEditPost = (e, post) => {
    e.stopPropagation();
    setOpenMenuId(null);
    nav('/new', { state: { post } });
  };

  const handleDeletePost = async (e, id) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    try {
      setDeletingId(id);
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/posts/${id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setPosts(prev => prev.filter(p => p._id !== id));
    } catch (error) {
      console.error(error);
      setErr(error?.response?.data?.message || error.message || 'Failed to delete post');
    } finally {
      setDeletingId(null);
    }
  };

  // derive comments received on user's posts (flattened list)
  const receivedComments = useMemo(() => {
    const rows = [];
    posts.forEach(post => {
      (post.comments || []).forEach(c => {
        rows.push({
          commentId: c._id || `${c.authorName}-${c.createdAt}`,
          postId: post._id,
          postTitle: post.title,
          commentAuthor: c.authorName,
          commentContent: c.content,
          commentCreatedAt: c.createdAt
        });
      });
    });
    // newest first by commentCreatedAt if available
    rows.sort((a, b) => {
      const ta = a.commentCreatedAt ? new Date(a.commentCreatedAt).getTime() : 0;
      const tb = b.commentCreatedAt ? new Date(b.commentCreatedAt).getTime() : 0;
      return tb - ta;
    });
    return rows;
  }, [posts]);

  if (loading) {
    return <div className="profile page-loading">Loading profile…</div>;
  }
  if (!user) {
    return (
      <div className="profile profile-empty">
        <p>Please login to view your profile.</p>
        <Link to="/login" className="btn primary">Sign in</Link>
      </div>
    );
  }

  const initials = (user.username || 'U').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();

  // build avatar src for profile picture only
  const apiBase = (API || '').replace(/\/api$/, '');
  const avatarSrc = user.avatarUrl
    ? (user.avatarUrl.startsWith('http') ? user.avatarUrl : `${apiBase}${user.avatarUrl}`)
    : null;

  return (
    <>
      <div className="profile dashboard">
        <aside className="sidebar">
          <div className="sidebar-inner">
            <div className="avatar-large">
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.username} className="avatar-large-img" />
              ) : (
                initials
              )}
            </div>
            <h4 className="side-name">{user.username}</h4>
            <div className="side-role">{user.role === 'admin' ? 'Administrator' : 'Web Developer'}</div>

            <nav className="side-nav">
              <Link
                to="/profile"
                className={`side-link ${selectedTab === 'profile' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setSelectedTab('profile'); }}
              >
                Profile
              </Link>

              <Link
                to="/home"
                className={`side-link ${selectedTab === 'blogs' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setSelectedTab('blogs'); }}
              >
                Your Blogs
              </Link>

              {/* changed: prevent redirect and show comments tab */}
              <Link
                to="/home"
                className={`side-link ${selectedTab === 'comments' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setSelectedTab('comments'); }}
              >
                Comments
              </Link>

              <Link to="/new" className="side-link">Create Blog</Link>
            </nav>
          </div>
        </aside>

        <main className="content">
          {selectedTab === 'profile' && (
            <>
              <header className="profile-header">
                <div className="header-left">
                  <div className="avatar-hero">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={user.username} className="avatar-hero-img" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="header-info">
                    <h1>{user.username}!</h1>
                    <div className="sub">Email : {user.email}</div>
                    <div className="about">
                      <label>About Me</label>
                      <div className="about-box">{user.bio || 'Tell the world about yourself.'}</div>
                      <div className="header-actions">
                        <button className="btn edit" onClick={openEdit}>Edit Profile</button>
                      </div>
                    </div>
                  </div>
                </div>
              </header>

              {err && <div className="profile-error">{err}</div>}

              <section className="stats-row">
                <div className="stat-card">
                  <div className="stat-title">Total Views</div>
                  <div className="stat-value">{(stats?.totalViews ?? 0).toLocaleString()}</div>
                  <div className="stat-note">— aggregated from your posts</div>
                </div>

                <div className="stat-card">
                  <div className="stat-title">Total Blogs</div>
                  <div className="stat-value">{stats?.totalBlogs ?? posts.length}</div>
                  <div className="stat-note">your authored posts</div>
                </div>

                <div className="stat-card">
                  <div className="stat-title">Comments</div>
                  <div className="stat-value">{stats?.totalComments ?? 0}</div>
                  <div className="stat-note">received on your posts</div>
                </div>

                <div className="stat-card">
                  <div className="stat-title">Likes</div>
                  <div className="stat-value">{stats?.totalLikes ?? 0}</div>
                  <div className="stat-note">received on your posts</div>
                </div>
              </section>
            </>
          )}

          {selectedTab === 'blogs' && (
            <section className="posts-section">
              <div className="posts-head">
                <h3>Your posts</h3>
                <Link to="/new" className="btn primary">Create New</Link>
              </div>

              <div className="blogs-table">
                <div className="blogs-table-head">
                  <div className="col col-title">Title</div>
                  <div className="col col-category">Category</div>
                  <div className="col col-date">Date</div>
                  <div className="col col-action">Action</div>
                </div>

                <div className="blogs-table-body">
                  {posts.length === 0 && (
                    <div className="blogs-empty">You haven't written any posts yet.</div>
                  )}

                  {posts.map(p => {
                    const img = pickImage(p);
                    const thumbSrc =
                      img ||
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="360"><rect width="100%" height="100%" fill="%230b1220"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%2399a8b2" font-family="Arial" font-size="20">No image</text></svg>';

                    const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';

                    return (
                      <div
                        key={p._id}
                        className="blogs-row"
                        onClick={() => setOpenMenuId(null)}
                      >
                        <div className="col col-title">
                          <div className="blog-thumb">
                            <img
                              src={thumbSrc}
                              alt={p.title || 'post image'}
                              loading="lazy"
                            />
                          </div>
                          <div className="blog-title">
                            <Link
                              to={`/post/${p._id}`}
                              className="title-text-link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="title-text">{p.title}</div>
                            </Link>
                            <div className="title-sub">
                              {(p.excerpt || '').slice(0, 140)}
                            </div>
                          </div>
                        </div>

                        <div className="col col-category">
                          {(p.categories && p.categories.join(', ')) || (p.category || '—')}
                        </div>
                        <div className="col col-date">{dateStr}</div>

                        <div className="col col-action">
                          <button
                            className="dots-btn"
                            onClick={(e) => toggleMenu(e, p._id)}
                            aria-label="Open actions"
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              aria-hidden
                            >
                              <circle cx="12" cy="5" r="1.8" fill="currentColor" />
                              <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                              <circle cx="12" cy="19" r="1.8" fill="currentColor" />
                            </svg>
                          </button>

                          {openMenuId === p._id && (
                            <div
                              className="action-menu"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="action-item"
                                onClick={(e) => handleEditPost(e, p)}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"
                                    fill="currentColor"
                                  />
                                </svg>
                                Edit
                              </button>
                              <button
                                className="action-item danger"
                                onClick={(e) => handleDeletePost(e, p._id)}
                                disabled={deletingId === p._id}
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  aria-hidden
                                >
                                  <path
                                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                    fill="currentColor"
                                  />
                                </svg>
                                {deletingId === p._id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="blogs-footer">A list of your recent blogs.</div>
              </div>
            </section>
          )}

          {selectedTab === 'comments' && (
            <section className="posts-section">
              <div className="posts-head">
                <h3>Comments received</h3>
              </div>

              <div className="blogs-table">
                <div className="blogs-table-head">
                  <div className="col col-title">Blog Title</div>
                  <div className="col col-category">Comment</div>
                  <div className="col col-date">Author</div>
                  <div className="col col-action">Action</div>
                </div>

                <div className="blogs-table-body">
                  {receivedComments.length === 0 && (
                    <div className="blogs-empty">No comments on your posts yet.</div>
                  )}

                  {receivedComments.map(row => (
                    <div
                      key={row.commentId}
                      className="blogs-row"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <div className="col col-title">
                        <div className="blog-title">
                          <Link
                            to={`/post/${row.postId}`}
                            className="title-text-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="title-text">{row.postTitle}</div>
                          </Link>
                        </div>
                      </div>

                      <div className="col col-category">
                        <div className="title-sub">{row.commentContent}</div>
                      </div>

                      <div className="col col-date">{row.commentAuthor}</div>

                      <div className="col col-action">
                        <button
                          className="dots-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            nav(`/post/${row.postId}`);
                          }}
                          aria-label="View post"
                          title="View post"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                            <path d="M12 5c-7 0-11 6-11 7s4 7 11 7 11-6 11-7-4-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8z" fill="currentColor"/>
                            <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="blogs-footer">A list of your recent comments.</div>
              </div>
            </section>
          )}
        </main>
      </div>

      {showEdit && (
        <div className="profile edit-modal-overlay">
          <div className="edit-modal">
            <button className="edit-modal-close" onClick={closeEdit}>×</button>
            <h2 className="edit-modal-title">Edit Profile</h2>
            <p className="edit-modal-subtitle">Make changes to your profile here.</p>

            {editErr && <div className="edit-modal-error">{editErr}</div>}

            <form className="edit-modal-form" onSubmit={handleEditSubmit}>
              <div className="edit-row">
                <div className="edit-field">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editData.firstName}
                    onChange={handleEditChange}
                    required
                  />
                </div>
                <div className="edit-field">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editData.lastName}
                    onChange={handleEditChange}
                  />
                </div>
              </div>

              <div className="edit-field">
                <label>Linkedin</label>
                <input
                  type="url"
                  name="linkedin"
                  placeholder="https://www.linkedin.com/..."
                  value={editData.linkedin}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Github</label>
                <input
                  type="url"
                  name="github"
                  placeholder="https://github.com/username"
                  value={editData.github}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Description</label>
                <textarea
                  name="description"
                  rows="4"
                  value={editData.description}
                  onChange={handleEditChange}
                />
              </div>

              <div className="edit-field">
                <label>Picture</label>
                {editPreview && (
                  <div style={{ marginBottom: 8 }}>
                    <img
                      src={editPreview}
                      alt="preview"
                      style={{
                        width: 86,
                        height: 86,
                        borderRadius: 12,
                        objectFit: 'cover',
                        border: '1px solid #e5e7eb'
                      }}
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </div>

              <div className="edit-modal-actions">
                <button
                  type="button"
                  className="btn edit-modal-cancel"
                  onClick={closeEdit}
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary edit-modal-save"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
