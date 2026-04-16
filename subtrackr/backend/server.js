require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const { runMigrations }           = require('./src/db/migrations');
const { authLimiter, apiLimiter } = require('./src/middleware/rateLimiter');
const { verifyToken, asyncHandler } = require('./src/middleware/auth');
const { dbRun }                   = require('./src/db/client');

const authRouter          = require('./src/routes/auth');
const subscriptionsRouter = require('./src/routes/subscriptions');
const analyticsRouter     = require('./src/routes/analytics');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Limit request body size to 10 KB to prevent payload attacks
app.use(express.json({ limit: '10kb' }));

// Rate limiters
app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

// ─── Database Setup ───────────────────────────────────────────────────────────

runMigrations();

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',          authRouter);
app.use('/api/subscriptions', subscriptionsRouter);
app.use('/api/analytics',     analyticsRouter);

// User routes
app.post('/api/users/onboard', verifyToken, asyncHandler(async (req, res) => {
  await dbRun('UPDATE users SET onboarded = 1 WHERE id = ?', [req.userId]);
  res.json({ success: true });
}));

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message || err);
  res.status(500).json({ error: 'An internal server error occurred' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SubTrackr API running on :${PORT}`));
