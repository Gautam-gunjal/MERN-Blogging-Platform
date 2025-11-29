const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
}

// REGISTER
router.post('/register', async (req, res) => {
  try {
    let { username, email, password, adminKey } = req.body;
    username = (username || '').trim();
    email = (email || '').trim().toLowerCase();

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }
    if (password.length < 5) {
      return res.status(400).json({ message: 'Password must be at least 5 characters' });
    }

    // Pre-check
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User exists' });

    const hash = await bcrypt.hash(password, 10);

    // Decide role: only create admin if adminKey matches server ENV ADMIN_KEY
    let role = 'user';
    const serverAdminKey = process.env.ADMIN_KEY;
    if (serverAdminKey && adminKey && String(adminKey) === String(serverAdminKey)) {
      role = 'admin';
    }

    const user = await User.create({ username, email, password: hash, role });

    const token = signToken(user._id);
    return res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    // Handle duplicate key race condition
    if (err && err.code === 11000) {
      return res.status(400).json({ message: 'User exists' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    let { email, password } = req.body;
    email = (email || '').trim().toLowerCase();

    if (!email || !password) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    return res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
