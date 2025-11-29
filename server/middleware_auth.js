const jwt = require('jsonwebtoken');
const User = require('./models/User');

module.exports = async function(req, res, next){
  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];

  // Allow adminKey fallback for admin-only requests:
  // - header: x-admin-key: <key>
  // - or query param: ?adminKey=...
  // - or body field (for POST): { adminKey: ... }
  const adminKeyProvided =
    req.headers['x-admin-key'] ||
    (req.query && req.query.adminKey) ||
    (req.body && req.body.adminKey);

  const ADMIN_KEY = process.env.ADMIN_KEY;

  // If no token present, but an admin key was provided that matches, set req.user as admin
  if (!token) {
    if (adminKeyProvided && ADMIN_KEY && String(adminKeyProvided) === String(ADMIN_KEY)) {
      // Try to resolve a real admin user from the DB if ADMIN_EMAIL is set (recommended).
      // If not found, fallback to a synthetic admin object (still has role:'admin').
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
          const adminUser = await User.findOne({ email: adminEmail }).select('-password');
          if (adminUser) {
            req.user = adminUser;
            return next();
          }
        }

        // fallback synthetic admin user (no _id)
        req.user = {
          _id: null,
          username: process.env.ADMIN_USERNAME || 'admin',
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          role: 'admin'
        };
        return next();
      } catch (err) {
        console.error('Admin-key auth lookup failed', err);
        return res.status(500).json({ message: 'Server error' });
      }
    }

    return res.status(401).json({ message: 'No token' });
  }

  // Normal JWT-based auth path (unchanged)
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-password');
    if(!req.user) return res.status(401).json({ message: 'Invalid token' });
    next();
  }catch(err){
    return res.status(401).json({ message: 'Token invalid' });
  }
}
