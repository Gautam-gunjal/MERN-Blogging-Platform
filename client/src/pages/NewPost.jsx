import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import '../styles/NewPost.css';
import { useNavigate, useLocation } from 'react-router-dom';

const API = process.env.REACT_APP_API || '/api';
const DRAFT_KEY = 'mern_blog_draft_v2';

function htmlToText(html = '') {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(text = '') {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

// === NEW: normalize editor HTML to remove empty paragraphs ===
function normalizeContent(html = '') {
  if (typeof html !== 'string') return html;
  // remove empty <p>, <p><br></p>, <p>&nbsp;</p> etc.
  let out = html.replace(/<p>(?:\s|&nbsp;|(?:<br\s*\/?>))*<\/p>/gi, '');
  // collapse consecutive paragraph boundaries if any
  out = out.replace(/(<\/p>\s*)(<p>)+/gi, '</p><p>');
  return out.trim();
}
// ============================================================

const TITLE_MAX = 200;
const MIN_WORDS = 2;
const MAX_TAGS = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function NewPost() {
  const nav = useNavigate();
  const location = useLocation();

  // If PostPage sent a post via nav state, we treat this as edit mode
  const editingPost = location?.state?.post || null;
  const isEditing = Boolean(editingPost && (editingPost._id || editingPost.id));
  const editingId = editingPost?._id || editingPost?.id || null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const quillRef = useRef(null);

  // If we're editing, initialize form from editingPost. This runs before draft load.
  useEffect(() => {
    if (!editingPost) return;
    setTitle(editingPost.title || '');
    setContent(editingPost.content || '');
    setTags(editingPost.categories || editingPost.tags || []);
    setInfo('Editing existing post');
    // Do not return here; other effects remain, but draft load will skip when editing.
  }, [editingPost]);

  // load draft (skip when editing an existing post)
  useEffect(() => {
    if (isEditing) return; // don't clobber edit form with a draft
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.content) setContent(draft.content);
      if (Array.isArray(draft.tags)) setTags(draft.tags);
      if (draft.lastSaved) setLastSaved(new Date(draft.lastSaved));
      setInfo('Draft loaded from last time.');
    } catch {
      // ignore
    }
  }, [isEditing]);

  // autosave (still works in edit mode but uses a different key to avoid clobbering new-post drafts)
  useEffect(() => {
    // keep the same key for now; it's fine to autosave edits too. If you prefer separate keys, change DRAFT_KEY when isEditing is true.
    if (!title && !content && tags.length === 0) return;
    setSavingDraft(true);
    const id = setTimeout(() => {
      try {
        const nowIso = new Date().toISOString();
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, content, tags, lastSaved: nowIso })
        );
        setSavingDraft(false);
        setLastSaved(new Date(nowIso));
      } catch {
        setSavingDraft(false);
      }
    }, 800);
    return () => clearTimeout(id);
  }, [title, content, tags]);

  // beforeunload
  useEffect(() => {
    const handler = (e) => {
      if (!title && !content && tags.length === 0) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [title, content, tags]);

  // word count
  const wordCount = useMemo(() => {
    const text = htmlToText(content || '');
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [content]);

  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const slug = useMemo(() => slugify(title).slice(0, 80), [title]);

  // tags
  const addTag = useCallback(
    (value) => {
      const t = (value || '').trim();
      if (!t) return;
      if (tags.length >= MAX_TAGS) {
        setErr(`You can add up to ${MAX_TAGS} categories only.`);
        return;
      }
      const exists = tags.some((tag) => tag.toLowerCase() === t.toLowerCase());
      if (!exists) setTags((prev) => [...prev, t]);
      setTagInput('');
    },
    [tags]
  );

  const removeTag = (value) => setTags((prev) => prev.filter((t) => t !== value));

  const onTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const parts = tagInput
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 1) parts.forEach((p) => addTag(p));
      else addTag(tagInput);
    } else if (e.key === 'Backspace' && !tagInput) {
      setTags((prev) => prev.slice(0, -1));
    }
  };

  // upload helper for toolbar image button
  const uploadImageToServer = useCallback(async (file) => {
    const token = localStorage.getItem('token');
    const fd = new FormData();
    fd.append('image', file);
    const res = await axios.post(`${API}/uploads`, fd, {
      headers: {
        Authorization: token ? 'Bearer ' + token : undefined,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 30000,
    });
    return res.data?.url || null;
  }, []);

  // toolbar image handler: quick insert (no separate panel)
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > MAX_IMAGE_BYTES) {
        setErr('Image too large (max 5 MB).');
        return;
      }
      setErr('');
      let url = null;
      try {
        url = await uploadImageToServer(file);
      } catch {
        try {
          url = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        } catch {
          setErr('Failed to handle image.');
          return;
        }
      }
      const quill = quillRef.current?.getEditor?.();
      if (!quill) return;
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.insertEmbed(index, 'image', url, 'user');
      quill.setSelection(index + 1);
    };
    input.click();
  }, [uploadImageToServer]);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ align: [] }],
          ['link', 'image'],
          ['clean'],
        ],
        handlers: { image: imageHandler },
      },
      clipboard: { matchVisual: false },
    }),
    [imageHandler]
  );

  const formats = [
    'header',
    'bold',
    'italic',
    'underline',
    'strike',
    'list',
    'bullet',
    'align',
    'link',
    'image',
  ];

  const validate = () => {
    if (!title.trim()) return 'Please provide a title.';
    if (title.trim().length < 3) return 'Title is too short.';
    if (wordCount < MIN_WORDS) {
      return `Please write at least ${MIN_WORDS} words. Currently: ${wordCount}.`;
    }
    return '';
  };

  async function submit(e) {
    e?.preventDefault();
    setErr('');
    setInfo('');

    const v = validate();
    if (v) {
      setErr(v);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setErr('You must be logged in to publish a post.');
      nav('/login');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        title: title.trim(),
        // === USE NORMALIZED CONTENT HERE ===
        content: normalizeContent(content),
        // ===================================
        categories: tags,
        slug: slug || undefined,
      };

      let res;
      if (isEditing && editingId) {
        // update existing post
        res = await axios.put(`${API}/posts/${editingId}`, payload, {
          headers: { Authorization: 'Bearer ' + token },
        });
      } else {
        // create new post
        res = await axios.post(`${API}/posts`, payload, {
          headers: { Authorization: 'Bearer ' + token },
        });
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      const newId = res?.data?._id || editingId || res?.data?.id;
      if (newId) nav('/post/' + newId);
      else nav('/home');
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2.message || 'Failed to publish.');
    } finally {
      setLoading(false);
    }
  }

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) {
        setInfo('No draft to restore.');
        return;
      }
      const draft = JSON.parse(raw);
      setTitle(draft.title || '');
      setContent(draft.content || '');
      setTags(draft.tags || []);
      setLastSaved(draft.lastSaved ? new Date(draft.lastSaved) : null);
      setInfo('Draft restored.');
      setErr('');
    } catch {
      setErr('Failed to restore draft.');
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      setInfo('Draft cleared.');
      setErr('');
    } catch {
      setErr('Failed to clear draft.');
    }
  };

  const openPreview = () => {
    const w = window.open('', '_blank');
    if (!w) {
      setErr('Popup blocked. Please allow popups for preview.');
      return;
    }
    const safeTitle = escapeHtml(title || (isEditing ? 'Preview (editing)' : 'Preview'));
    const html = `
      <!DOCTYPE html><html lang="en"><head><meta charset="utf-8" />
      <title>${safeTitle}</title><meta name="viewport" content="width=device-width,initial-scale=1" />
      <style>
        body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:24px;background:#f3f4f6}
        .preview-container{max-width:800px;margin:0 auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 10px 30px rgba(15,23,42,0.08)}
        h1{font-size:2rem;margin-bottom:16px}
        .meta{color:#6b7280;font-size:0.875rem;margin-bottom:20px}
        .content{line-height:1.7;font-size:1rem}
        img{max-width:100%;height:auto;display:block;margin:12px 0}
        figure.blog-image-figure{margin:16px 0;text-align:center}
        figure.blog-image-figure img{border-radius:8px}
        figcaption.blog-image-caption{font-size:0.875rem;color:#6b7280;margin-top:6px}
      </style></head><body>
      <div class="preview-container"><h1>${safeTitle}</h1>
      <div class="meta">${wordCount} words · ~${readTime} min read</div>
      <article class="content">${content || '<p><em>No content yet.</em></p>'}</article>
      </div></body></html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const publishDisabled = loading || !!validate();

  return (
    <div className="newpost">
      <form className="newpost-form" onSubmit={submit}>
        {/* Header */}
        <div className="row top-row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 style={{ margin: 0 }}>{isEditing ? 'Edit Post' : 'New Post'}</h1>
            <div className="title-wrap">
              <label className="field-label" htmlFor="post-title">
                Title
              </label>
              <input
                id="post-title"
                className="title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (err) setErr('');
                }}
                placeholder="Post title"
                maxLength={TITLE_MAX}
              />
              <div className="title-meta">
                <span className="muted">
                  {title.trim().length}/{TITLE_MAX}
                </span>
                {slug && (
                  <span className="muted slug-preview">
                    URL preview: <code>/post/{slug}</code>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="draft-actions">
            <button
              type="button"
              className="small"
              onClick={restoreDraft}
              title="Restore latest saved draft"
            >
              Restore
            </button>
            <button
              type="button"
              className="small"
              onClick={clearDraft}
              title="Clear saved draft from browser"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="row tags-row">
          <label className="field-label">Categories</label>
          <div className="tags-input-wrap">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={onTagKey}
              placeholder="Add a category and press Enter (you can paste comma-separated too)"
            />
            <button
              type="button"
              className="small"
              onClick={() => {
                const parts = tagInput
                  .split(',')
                  .map((p) => p.trim())
                  .filter(Boolean);
                if (parts.length > 1) parts.forEach((p) => addTag(p));
                else addTag(tagInput);
              }}
            >
              Add
            </button>
          </div>
          <div className="chips">
            {tags.map((t) => (
              <span className="chip" key={t}>
                {t}
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => removeTag(t)}
                  aria-label={`Remove category ${t}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="editor-wrap">
          <ReactQuill
            ref={quillRef}
            value={content}
            onChange={(val) => {
              setContent(val);
              if (err) setErr('');
            }}
            modules={modules}
            formats={formats}
            placeholder="Write your post here…"
          />
        </div>

        {/* Meta + Actions */}
        <div className="meta-row">
          <div className="meta-left">
            <span className="muted">
              {wordCount} words · ~{readTime} min read
            </span>
            {savingDraft && <span className="muted"> · saving draft…</span>}
            {!savingDraft && lastSaved && (
              <span className="muted"> {' '}
                · saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="meta-right">
            <button
              type="button"
              className="ghost"
              onClick={openPreview}
              disabled={!title && !content}
            >
              Preview
            </button>
            <button
              type="submit"
              className="primary"
              disabled={publishDisabled}
            >
              {loading ? (isEditing ? 'Updating…' : 'Publishing…') : (isEditing ? 'Update' : 'Publish')}
            </button>
          </div>
        </div>

        {err && <div className="err">{err}</div>}
        {info && <div className="info">{info}</div>}
      </form>
    </div>
  );
}
