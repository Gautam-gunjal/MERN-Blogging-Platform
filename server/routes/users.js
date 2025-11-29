// server/routes/users.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const User = require('../models/User');
const Post = require('../models/Post');          // <-- import Post to compute stats
const auth = require('../middleware_auth');

/**
 * Ensure uploads/profile directory exists
 */
const UPLOADS_PROFILE_DIR = path.join(__dirname, '..', 'uploads', 'profile');
try {
  fs.mkdirSync(UPLOADS_PROFILE_DIR, { recursive: true });
} catch (e) {
  // ignore - if it fails the upload will error later
  console.error('Failed to create uploads dir', e);
}

/**
 * Multer storage config for profile pictures
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_PROFILE_DIR);
  },
  filename: (req, file, cb) => {
    // sanitize filename and prepend timestamp
    const safeName = file.originalname.replace(/\s+/g, '_').replace(/[^\w.\-]/g, '');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

/**
 * GET /api/users/me
 * Returns:
 * {
 *   user: {...},                 // current user (no password)
 *   posts: [ ... ],              // posts authored by the user (newest first)
 *   stats: {                     // aggregated stats across user's posts
 *     totalBlogs,
 *     totalViews,
 *     totalLikes,
 *     totalComments
 *   }
 * }
 */
router.get('/me', auth, async (req, res) => {
  try {
    // req.user is expected to be populated by middleware_auth and already safe (no password)
    const user = req.user;

    // authored posts
    const posts = await Post.find({ authorId: user._id }).sort({ createdAt: -1 });

    // aggregate stats
    const totalBlogs = posts.length;
    let totalViews = 0;
    let totalLikes = 0;
    let totalComments = 0;

    posts.forEach(p => {
      totalViews += (p.views || 0);
      totalLikes += Array.isArray(p.likes) ? p.likes.length : (p.likes || 0);
      totalComments += Array.isArray(p.comments) ? p.comments.length : 0;
    });

    return res.json({
      user,
      posts,
      stats: { totalBlogs, totalViews, totalLikes, totalComments }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PUT /api/users/me
 * Accepts multipart/form-data:
 * - firstName
 * - lastName
 * - linkedin
 * - github
 * - description
 * - picture (file)
 *
 * Returns { user: { ... } } (user returned without password)
 */
router.put('/me', auth, upload.single('picture'), async (req, res) => {
  try {
    const { firstName, lastName, linkedin, github, description } = req.body;

    const update = {};

    // combine first + last into username if provided
    const nameParts = [
      (firstName || '').toString().trim(),
      (lastName || '').toString().trim()
    ].filter(Boolean);
    if (nameParts.length > 0) {
      update.username = nameParts.join(' ');
    }

    if (typeof description !== 'undefined') {
      update.bio = description;
    }
    if (typeof linkedin !== 'undefined') {
      update.linkedin = linkedin;
    }
    if (typeof github !== 'undefined') {
      update.github = github;
    }

    if (req.file) {
      // use a relative URL that the server serves from /uploads
      update.avatarUrl = `/uploads/profile/${req.file.filename}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: updatedUser });
  } catch (err) {
    console.error(err);
    // multer file filter errors come here as well
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

module.exports = router;
