const express  = require('express');
const bcrypt   = require('bcryptjs');
const router   = express.Router();

const { dbGet, dbRun }         = require('../db/client');
const { generateTokenPair }    = require('../utils/tokens');
const { asyncHandler }         = require('../middleware/auth');
const { validate }             = require('../middleware/validate');
const { signupSchema, loginSchema } = require('../schemas/subscription');

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;

  const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
  if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

  const hashed = await bcrypt.hash(password, 12);
  const result = await dbRun('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashed]);

  const { accessToken, refreshToken } = generateTokenPair(result.lastID);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [result.lastID, refreshToken, expiresAt]
  );

  res.status(201).json({ accessToken, refreshToken, userId: result.lastID, email, onboarded: false });
}));

// POST /api/auth/login
router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.validatedBody;

  const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
  // Constant-time compare to prevent timing attacks
  const valid = user && await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

  const { accessToken, refreshToken } = generateTokenPair(user.id);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, refreshToken, expiresAt]
  );

  res.json({ accessToken, refreshToken, userId: user.id, email: user.email, onboarded: !!user.onboarded });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const stored = await dbGet(
    `SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime('now')`,
    [refreshToken]
  );
  if (!stored) return res.status(401).json({ error: 'Invalid or expired refresh token' });

  // Rotate: delete old, issue new
  await dbRun('DELETE FROM refresh_tokens WHERE id = ?', [stored.id]);
  const { accessToken, refreshToken: newRefresh } = generateTokenPair(stored.user_id);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await dbRun(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [stored.user_id, newRefresh, expiresAt]
  );

  res.json({ accessToken, refreshToken: newRefresh });
}));

// POST /api/auth/logout
router.post('/logout', require('../middleware/auth').verifyToken, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await dbRun('DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?', [refreshToken, req.userId]);
  }
  res.json({ success: true });
}));

module.exports = router;
