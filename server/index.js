// server/index.js
require('dotenv').config();
const path = require('path'); // ✅ added missing import
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ensure uploads folders exist before server starts
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOADS_PROFILE_DIR = path.join(UPLOADS_DIR, 'profile');
try {
  fs.mkdirSync(UPLOADS_PROFILE_DIR, { recursive: true });
} catch (e) {
  console.error('Failed to ensure uploads directory', e);
}

// ✅ Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // bumped limit for image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Import routes (make sure files exist)
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const uploadRoutes = require('./routes/uploads'); // file should exist if you use custom upload endpoints
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

// ✅ Serve uploaded images statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ✅ Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// ✅ Database connection
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mern-blog', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log('Server running on port', PORT));
  })
  .catch((err) => {
    console.error('DB connection error', err);
    process.exit(1);
  });
