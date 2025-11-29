// server/routes/uploads.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

// Ensure uploads dir exists (server/uploads)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage: place files in /server/uploads with a unique name
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 9);
    cb(null, `${base}-${unique}${ext}`);
  }
});

// Restrict file size & types (images only, up to 5MB)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpe?g|gif|webp|bmp|svg\+xml)$/.test(file.mimetype);
    cb(ok ? null : new Error('Only image files are allowed'), ok);
  }
});

// POST /api/uploads  ->  returns { url }
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  // Build a public URL (server serves /uploads statically)
  const publicUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: publicUrl });
});

// Optional: simple health check
router.get('/health', (_req, res) => res.json({ ok: true }));

// Global error handler just for this router (multer errors)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors (size, count, etc.)
    return res.status(400).json({ message: err.message });
  }
  if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
  res.status(500).json({ message: 'Unknown error' });
});

module.exports = router;
