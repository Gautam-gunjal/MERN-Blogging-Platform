const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Post = require('../models/Post');
const auth = require('../middleware_auth');

// simple admin check: role === 'admin'
// Note: middleware_auth now supports adminKey fallback (x-admin-key) which will
// populate req.user with an admin (real DB user if ADMIN_EMAIL set, otherwise synthetic).
router.use(auth, (req,res,next)=>{
  if(req.user.role !== 'admin') return res.status(403).json({message:'Admin only'});
  next();
});

router.get('/users', async (req,res)=>{
  const users = await User.find().select('-password');
  res.json(users);
});

router.get('/posts', async (req,res)=>{
  const posts = await Post.find().sort({createdAt:-1});
  res.json(posts);
});

router.delete('/users/:id', async (req,res)=>{
  await User.findByIdAndDelete(req.params.id);
  res.json({message:'Deleted'});
});

router.delete('/posts/:id', async (req,res)=>{
  await Post.findByIdAndDelete(req.params.id);
  res.json({message:'Deleted'});
});

module.exports = router;
