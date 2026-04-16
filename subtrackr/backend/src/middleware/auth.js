const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/tokens');

/** Wrap a route handler to catch async errors and forward to Express error handler */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = { asyncHandler, verifyToken };
