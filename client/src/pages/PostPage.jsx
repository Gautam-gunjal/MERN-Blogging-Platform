// ⬇️ SAME IMPORTS AS YOUR ORIGINAL
import React, { useCallback, useEffect, useState, useRef } from 'react';
import axios from 'axios';
import '../styles/Post.css';
import { useParams, useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API || '/api';

export default function PostPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [comment, setComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [liking, setLiking] = useState(false);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editingLoading, setEditingLoading] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  const [menuOpenId, setMenuOpenId] = useState(null);
  const commentsRef = useRef(null);

  // current user from localStorage
  const rawUser = localStorage.getItem('user');
  let currentUser;
  try {
    currentUser = rawUser ? JSON.parse(rawUser) : null;
  } catch (e) {
    currentUser = null;
  }

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await axios.get(`${API}/posts/${id}`);
      setPost(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load post');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  // --------------- NEW VIEW FIX (ONLY THING ADDED) -----------------
  useEffect(() => {
    if (!post) return;

    // get user id safely
    const userId = currentUser?._id || currentUser?.id;

    // extract authorId safely
    const authorId =
      typeof post.authorId === 'object'
        ? post.authorId._id || post.authorId.id
        : post.authorId;

    // ❌ DO NOT COUNT VIEW IF VIEWER IS AUTHOR
    if (userId && String(userId) === String(authorId)) {
      return;
    }

    // otherwise count a view
    axios.post(`${API}/posts/${post._id}/view`).catch(() => {});
  }, [post, currentUser]);
  // ---------------------------------------------------------------

  // close menu when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!commentsRef.current || commentsRef.current.contains(e.target)) {
        const menuElements = commentsRef.current
          ? commentsRef.current.querySelectorAll('.comment-menu, .dots-btn')
          : [];
        for (const el of menuElements) {
          if (el.contains(e.target)) return;
        }
        setMenuOpenId(null);
      } else {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  function toggleMenu(e, commentId) {
    e.stopPropagation?.();
    setMenuOpenId(prev => (prev === commentId ? null : commentId));
  }

  const isAuthorOrAdmin = () => {
    if (!currentUser || !post) return false;
    if (currentUser.role === 'admin') return true;

    const uid = currentUser._id || currentUser.id;
    if (!uid || !post.authorId) return false;

    const postAuthorId =
      typeof post.authorId === 'object'
        ? (post.authorId._id || post.authorId.id)
        : post.authorId;

    return String(postAuthorId) === String(uid);
  };

  const userLiked = () => {
    if (!currentUser || !post) return false;
    const uid = currentUser.id || currentUser._id;
    return (post.likes || []).some(l => String(l) === String(uid));
  };

  async function toggleLike() {
    const token = localStorage.getItem('token');
    if (!token) return alert('Login required');

    const liked = userLiked();
    setLiking(true);
    setPost(prev => {
      if (!prev) return prev;
      const uid = currentUser.id || currentUser._id;
      const likes = Array.isArray(prev.likes) ? [...prev.likes] : [];
      return liked
        ? { ...prev, likes: likes.filter(l => String(l) !== String(uid)) }
        : { ...prev, likes: [...likes, uid] };
    });

    try {
      await axios.post(
        `${API}/posts/${id}/like`,
        {},
        { headers: { Authorization: 'Bearer ' + token } }
      );
    } catch (e) {
      setPost(prev => {
        if (!prev) return prev;
        const uid = currentUser.id || currentUser._id;
        const likes = Array.isArray(prev.likes) ? [...prev.likes] : [];
        return liked
          ? { ...prev, likes: [...likes, uid] }
          : { ...prev, likes: likes.filter(l => String(l) !== String(uid)) };
      });
      setErr(e?.response?.data?.message || 'Failed to toggle like');
    } finally {
      setLiking(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('Login required');
    if (!comment.trim()) return;

    setPostingComment(true);
    setErr('');
    try {
      const res = await axios.post(
        `${API}/posts/${id}/comment`,
        { content: comment.trim() },
        { headers: { Authorization: 'Bearer ' + token } }
      );

      const newComment = res.data.comment;
      if (!newComment) throw new Error('No comment returned from server');

      setPost(prev =>
        prev ? { ...prev, comments: [...(prev.comments || []), newComment] } : prev
      );
      setComment('');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this post? This action cannot be undone.')) return;
    const token = localStorage.getItem('token');
    if (!token) return alert('Login required');

    try {
      await axios.delete(`${API}/posts/${id}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      nav('/home');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to delete post');
    }
  }

  function handleEdit() {
    nav('/new', { state: { post } });
  }

  function canModifyComment(c) {
    if (!currentUser || !c) return false;
    if (currentUser.role === 'admin') return true;

    const uid = currentUser._id || currentUser.id;
    if (!uid) return false;

    const commentAuthorId =
      c.authorId && typeof c.authorId === 'object'
        ? (c.authorId._id || c.authorId.id)
        : c.authorId;

    if (!commentAuthorId) return false;

    return String(commentAuthorId) === String(uid);
  }

  function startEditComment(c) {
    setMenuOpenId(null);
    if (!c._id) return;
    setEditingCommentId(c._id);
    setEditingCommentText(c.content || '');
    setErr('');
  }

  function cancelEditComment() {
    setEditingCommentId(null);
    setEditingCommentText('');
    setEditingLoading(false);
  }

  async function submitEditComment(e, commentObj) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) return alert('Login required');
    if (!editingCommentText.trim()) return;
    if (!commentObj._id) return;

    const commentId = commentObj._id;
    setEditingLoading(true);
    setErr('');

    const prevComments = post ? (post.comments || []) : [];

    setPost(prev => {
      if (!prev) return prev;
      const updated = (prev.comments || []).map(c =>
        c._id === commentId ? { ...c, content: editingCommentText } : c
      );
      return { ...prev, comments: updated };
    });

    try {
      await axios.patch(
        `${API}/posts/${id}/comment/${commentId}`,
        { content: editingCommentText.trim() },
        { headers: { Authorization: 'Bearer ' + token } }
      );
      cancelEditComment();
    } catch (e) {
      setPost(prev => (prev ? { ...prev, comments: prevComments } : prev));
      setErr(e?.response?.data?.message || 'Failed to edit comment');
      setEditingLoading(false);
    }
  }

  async function deleteComment(commentObj) {
    if (!commentObj._id) return;
    const commentId = commentObj._id;
    if (!window.confirm('Delete this comment?')) return;
    const token = localStorage.getItem('token');
    if (!token) return alert('Login required');

    setDeletingCommentId(commentId);
    setErr('');
    setMenuOpenId(null);

    const prevComments = post ? (post.comments || []) : [];

    setPost(prev =>
      prev
        ? { ...prev, comments: (prev.comments || []).filter(c => c._id !== commentId) }
        : prev
    );

    try {
      await axios.delete(`${API}/posts/${id}/comment/${commentId}`, {
        headers: { Authorization: 'Bearer ' + token }
      });
      setDeletingCommentId(null);
    } catch (e) {
      setPost(prev => (prev ? { ...prev, comments: prevComments } : prev));
      setErr(e?.response?.data?.message || 'Failed to delete comment');
      setDeletingCommentId(null);
    }
  }

  if (loading) return <div className="postpage loading">Loading...</div>;
  if (err && !post) return <div className="postpage error">{err}</div>;
  if (!post) return <div className="postpage">No post found.</div>;

  const avatarFor = (name) => {
    const n = name || 'U';
    const parts = n.split(' ');
    const initials = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    return initials.toUpperCase().slice(0, 2);
  };

  return (
    <div className="postpage">
      <article className="post-card">
        <header className="post-header">
          <h1 className="post-title">{post.title}</h1>

          <div className="post-meta">
            <div className="author">
              <div className="avatar">{avatarFor(post.authorName)}</div>
              <div className="author-info">
                <div className="author-name">{post.authorName}</div>
                <div className="post-date">
                  {new Date(post.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="post-actions">
              <button
                className={`like-btn ${userLiked() ? 'liked' : ''}`}
                onClick={toggleLike}
                disabled={liking}
                aria-pressed={userLiked()}
                title={userLiked() ? 'Unlike' : 'Like'}
              >
                ♥ {post.likes ? post.likes.length : 0}
              </button>

              {isAuthorOrAdmin() && (
                <>
                  <button className="edit-btn" onClick={handleEdit}>
                    Edit
                  </button>
                  <button className="del-btn" onClick={handleDelete}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <section
          className="post-content"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <footer className="post-footer">
          <div className="tags">
            {(post.categories || []).map(c => (
              <span className="tag" key={c}>
                {c}
              </span>
            ))}
          </div>
        </footer>
      </article>

      <section className="comments" ref={commentsRef}>
        <h3>Comments ({(post.comments || []).length})</h3>

        {(post.comments || []).map(c => {
          const canModify = canModifyComment(c);
          const isEditing = editingCommentId === c._id;
          const isDeleting = deletingCommentId === c._id;
          const menuOpen = menuOpenId === c._id;

          return (
            <div
              key={c._id || `${c.authorName}-${c.createdAt}`}
              className="comment"
            >
              <div className="comment-avatar">{avatarFor(c.authorName)}</div>
              <div className="comment-body">
                <div className="comment-head">
                  <strong className="comment-author">{c.authorName}</strong>
                  <span className="comment-date">
                    {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                  </span>
                </div>

                {!isEditing ? (
                  <div className="comment-content">{c.content}</div>
                ) : (
                  <form
                    className="comment-edit-form"
                    onSubmit={e => submitEditComment(e, c)}
                  >
                    <input
                      value={editingCommentText}
                      onChange={e => setEditingCommentText(e.target.value)}
                      aria-label="Edit comment"
                      disabled={editingLoading}
                    />
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button
                        type="submit"
                        disabled={editingLoading || !editingCommentText.trim()}
                      >
                        {editingLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditComment}
                        disabled={editingLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {canModify && (
                  <>
                    <button
                      className="dots-btn"
                      onClick={(e) => toggleMenu(e, c._id)}
                      aria-haspopup="true"
                      aria-expanded={menuOpen}
                      title="Actions"
                    >
                      ⋯
                    </button>

                    {menuOpen && (
                      <div className="comment-menu" role="menu" aria-label="Comment actions">
                        <button
                          className="menu-item"
                          type="button"
                          onClick={() => startEditComment(c)}
                        >
                          Edit
                        </button>
                        <button
                          className="menu-item"
                          type="button"
                          onClick={() => deleteComment(c)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        <form className="comment-form" onSubmit={submitComment}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Write a comment..."
            aria-label="Write a comment"
            disabled={postingComment}
          />
          <button
            type="submit"
            disabled={postingComment || !comment.trim()}
          >
            {postingComment ? 'Posting…' : 'Post'}
          </button>
        </form>
      </section>
    </div>
  );
}
