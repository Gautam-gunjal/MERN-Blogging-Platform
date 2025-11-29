const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware_auth'); // unchanged - used by auth-required routes
const mongoose = require('mongoose'); // ✅ added for ObjectId validation

// === NEW: normalize editor HTML to remove empty paragraphs ===
function normalizeContent(html = '') {
  if (typeof html !== 'string') return html;
  // remove empty <p>, <p><br></p>, <p>&nbsp;</p>, etc.
  let out = html.replace(/<p>(?:\s|&nbsp;|(?:<br\s*\/?>))*<\/p>/gi, '');
  // collapse multiple adjacent paragraph openings if any
  out = out.replace(/(<\/p>\s*)(<p>)+/gi, '</p><p>');
  return out.trim();
}
// ===========================================================

// create post
router.post('/', auth, async (req, res) => {
  try {
    const { title, content, categories, slug } = req.body;
    const post = await Post.create({
      title: title?.trim(),
      content: normalizeContent(content ?? ''),
      categories: Array.isArray(categories) ? categories : [],
      slug: slug || undefined,
      authorId: req.user._id,
      authorName: req.user.username
    });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// edit post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    if (
      post.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Optional: slug uniqueness check
    if (typeof req.body.slug === 'string') {
      const newSlug = req.body.slug.trim();
      if (newSlug && newSlug !== post.slug) {
        const exists = await Post.findOne({ slug: newSlug, _id: { $ne: post._id } });
        if (exists) {
          return res.status(400).json({ message: 'Slug already in use' });
        }
        post.slug = newSlug;
      } else if (newSlug === '') {
        // explicit empty string -> clear slug
        post.slug = undefined;
      }
    }

    if (typeof req.body.title === 'string') post.title = req.body.title.trim() || post.title;
    if (typeof req.body.content === 'string') post.content = normalizeContent(req.body.content);
    if (req.body.categories !== undefined) {
      post.categories = Array.isArray(req.body.categories) ? req.body.categories : post.categories;
    }

    post.updatedAt = new Date();
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    if (
      post.authorId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await post.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// get post by id (NO view increment here anymore)
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      'authorId',
      'username email'
    );
    if (!post) return res.status(404).json({ message: 'Not found' });
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * POST /api/posts/:id/view
 * Increments views once per browser (based on viewed_posts cookie).
 * This is now the ONLY place views are incremented.
 */
router.post('/:id/view', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    const cookieVal = req.cookies ? req.cookies.viewed_posts : null;
    const seen = cookieVal ? String(cookieVal).split(',').filter(Boolean) : [];

    if (!seen.includes(String(post._id))) {
      post.views = (post.views || 0) + 1;
      await post.save();

      const next = [...seen, String(post._id)].slice(-100);
      res.cookie('viewed_posts', next.join(','), {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: false,
        sameSite: 'Lax',
      });
    }

    return res.json({ views: post.views });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// list posts
router.get('/', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (q)
      filter.$or = [
        { title: new RegExp(q, 'i') },
        { content: new RegExp(q, 'i') },
      ];
    if (category) filter.categories = category;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Post.countDocuments(filter);
    res.json({ posts, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// like/unlike
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });
    const idx = post.likes.findIndex(
      (id) => id.toString() === req.user._id.toString()
    );
    if (idx === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();
    res.json({ likes: post.likes.length, liked: idx === -1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    const comment = {
      authorId: req.user._id,
      authorName: req.user.username,
      content: req.body.content,
    };

    post.comments.push(comment);
    await post.save();

    res.json({ comment: post.comments[post.comments.length - 1] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// edit comment
router.patch('/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;

    // ✅ avoid CastError on bad ids
    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // ✅ support both DocumentArray and plain array
    let comment;
    if (typeof post.comments.id === 'function') {
      comment = post.comments.id(commentId);
    } else {
      comment = post.comments.find(
        (c) => c._id && c._id.toString() === commentId
      );
    }

    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // ✅ guard against missing req.user or _id
    const hasUser = req.user && req.user._id;
    const userIdStr = hasUser ? req.user._id.toString() : null;

    const isOwner =
      comment.authorId &&
      userIdStr &&
      comment.authorId.toString() === userIdStr;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not allowed to edit this comment' });
    }

    comment.content = content;
    await post.save();

    res.json({ comment });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to edit comment' });
  }
});

// delete comment
router.delete('/:postId/comment/:commentId', auth, async (req, res) => {
  try {
    const { postId, commentId } = req.params;

    // ✅ avoid CastError on bad ids
    if (
      !mongoose.Types.ObjectId.isValid(postId) ||
      !mongoose.Types.ObjectId.isValid(commentId)
    ) {
      return res.status(400).json({ message: 'Invalid id' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // ✅ support both DocumentArray and plain array
    let comment;
    if (typeof post.comments.id === 'function') {
      comment = post.comments.id(commentId);
    } else {
      comment = post.comments.find(
        (c) => c._id && c._id.toString() === commentId
      );
    }

    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // ✅ guard against missing req.user or _id
    const hasUser = req.user && req.user._id;
    const userIdStr = hasUser ? req.user._id.toString() : null;

    const isOwner =
      comment.authorId &&
      userIdStr &&
      comment.authorId.toString() === userIdStr;

    const isAdmin = req.user && req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ message: 'Not allowed to delete this comment' });
    }

    // ✅ remove subdocument safely
    if (typeof comment.remove === 'function') {
      comment.remove();
    } else {
      post.comments = post.comments.filter(
        (c) => !(c._id && c._id.toString() === commentId)
      );
    }

    await post.save();

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete comment' });
  }
});

module.exports = router;
