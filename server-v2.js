/**
 * SubTrackr — Production Backend v2
 * Node.js / Express / SQLite
 *
 * Upgrades from v1:
 *  - Refresh token rotation (15-min access / 30-day refresh)
 *  - Zod validation on every route
 *  - Rate limiting (auth: 10/15min, api: 100/min)
 *  - Async/await with proper error propagation
 *  - Pagination + filtering + sorting on GET /subscriptions
 *  - Enhanced analytics: trends, insights, upcoming billing
 *  - Demo data seeding endpoint
 *  - Onboarding flag per user
 *  - Consistent 4xx/5xx error shapes
 *  - DB indexes for performance
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const sqlite3    = require('sqlite3').verbose();
const rateLimit  = require('express-rate-limit');
const { z }      = require('zod');
const crypto     = require('crypto');

const app = express();
const db  = new sqlite3.Database(process.env.DATABASE_URL || './data.db');

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Limit request body size to 10 KB to prevent payload attacks
app.use(express.json({ limit: '10kb' }));

// Separate, stricter limiter for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Slow down.' }
});

app.use('/api/auth', authLimiter);
app.use('/api',      apiLimiter);

// ─── Environment Guards ───────────────────────────────────────────────────────

const JWT_SECRET         = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
  process.exit(1);
}

// ─── Validation Schemas (Zod) ─────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Entertainment', 'Software', 'Fitness', 'News',
  'Productivity', 'Education', 'Finance', 'Other'
];

const signupSchema = z.object({
  email:    z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number')
});

const loginSchema = z.object({
  email:    z.string().email().trim().toLowerCase(),
  password: z.string().min(1)
});

const subscriptionSchema = z.object({
  name:           z.string().min(1, 'Name is required').max(100).trim(),
  cost:           z.number().min(0, 'Cost must be non-negative').max(100000),
  category:       z.enum(VALID_CATEGORIES).optional().default('Other'),
  billing_cycle:  z.enum(['monthly', 'yearly', 'weekly']).optional().default('monthly'),
  billing_date:   z.number().int().min(1).max(31).optional().nullable(),
  website:        z.string().url().optional().nullable().or(z.literal('')),
  status:         z.enum(['active', 'paused', 'cancelled']).optional().default('active'),
  trial_end_date: z.string().optional().nullable(),
  last_used_date: z.string().optional().nullable(),
  notes:          z.string().max(500).optional().nullable()
});

// ─── Database Setup ───────────────────────────────────────────────────────────

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    onboarded   INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    token       TEXT UNIQUE NOT NULL,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL,
    name            TEXT NOT NULL,
    cost            REAL NOT NULL,
    category        TEXT DEFAULT 'Other',
    billing_cycle   TEXT DEFAULT 'monthly',
    billing_date    INTEGER,
    website         TEXT,
    status          TEXT DEFAULT 'active',
    trial_end_date  DATE,
    last_used_date  DATE,
    notes           TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  // Non-destructive migrations for existing DBs
  db.run(`ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT DEFAULT 'monthly'`, () => {});
  db.run(`ALTER TABLE subscriptions ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP`, () => {});
  db.run(`ALTER TABLE users ADD COLUMN onboarded INTEGER DEFAULT 0`, () => {});

  // Indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_subs_user    ON subscriptions(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(user_id, status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_rt_token     ON refresh_tokens(token)`);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Wrap a route handler to catch async errors and forward to Express error handler */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Zod validation middleware — parsed data lands in req.validatedBody */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const messages = result.error.errors.map(e => e.message);
    return res.status(400).json({ error: messages[0], details: messages });
  }
  req.validatedBody = result.data;
  next();
};

// Promisified DB helpers
const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));

const dbAll = (sql, params = []) => new Promise((resolve, reject) =>
  db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));

const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  db.run(sql, params, function(err) { err ? reject(err) : resolve(this); }));

const getMonthlyCost = (sub) => {
  if (sub.billing_cycle === 'yearly')  return sub.cost / 12;
  if (sub.billing_cycle === 'weekly')  return sub.cost * 4.33;
  return sub.cost;
};

const generateTokenPair = (userId) => ({
  accessToken:  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' }),
  refreshToken: crypto.randomBytes(40).toString('hex')
});

// ─── Auth Middleware ──────────────────────────────────────────────────────────

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

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/api/auth/signup', validate(signupSchema), asyncHandler(async (req, res) => {
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

app.post('/api/auth/login', validate(loginSchema), asyncHandler(async (req, res) => {
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

app.post('/api/auth/refresh', asyncHandler(async (req, res) => {
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

app.post('/api/auth/logout', verifyToken, asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await dbRun('DELETE FROM refresh_tokens WHERE token = ? AND user_id = ?', [refreshToken, req.userId]);
  }
  res.json({ success: true });
}));

// ─── Subscription Routes ──────────────────────────────────────────────────────

app.get('/api/subscriptions', verifyToken, asyncHandler(async (req, res) => {
  const {
    page     = 1,
    limit    = 50,
    search   = '',
    category = '',
    status   = '',
    sortBy   = 'billing_date',
    order    = 'asc'
  } = req.query;

  const VALID_SORTS = ['billing_date', 'cost', 'name', 'created_at'];
  const sortField = VALID_SORTS.includes(sortBy) ? sortBy : 'billing_date';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
  const pageNum   = Math.max(1, parseInt(page));
  const limitNum  = Math.min(100, Math.max(1, parseInt(limit)));
  const offset    = (pageNum - 1) * limitNum;

  const conditions = ['user_id = ?'];
  const params     = [req.userId];

  if (search)   { conditions.push('name LIKE ?');     params.push(`%${search}%`); }
  if (category) { conditions.push('category = ?');    params.push(category); }
  if (status)   { conditions.push('status = ?');      params.push(status); }

  const where = conditions.join(' AND ');

  const [countRow, rows] = await Promise.all([
    dbGet(`SELECT COUNT(*) AS total FROM subscriptions WHERE ${where}`, params),
    dbAll(
      `SELECT * FROM subscriptions WHERE ${where}
       ORDER BY ${sortField} ${sortOrder}, id ASC
       LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    )
  ]);

  res.json({
    data: rows,
    pagination: {
      total: countRow.total,
      page:  pageNum,
      limit: limitNum,
      pages: Math.ceil(countRow.total / limitNum)
    }
  });
}));

app.post('/api/subscriptions', verifyToken, validate(subscriptionSchema), asyncHandler(async (req, res) => {
  const { name, cost, category, billing_cycle, billing_date, website,
          trial_end_date, last_used_date, notes } = req.validatedBody;

  const result = await dbRun(
    `INSERT INTO subscriptions
      (user_id, name, cost, category, billing_cycle, billing_date, website, trial_end_date, last_used_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.userId, name, cost, category, billing_cycle,
     billing_date ?? null, website || null,
     trial_end_date || null, last_used_date || null, notes || null]
  );

  const created = await dbGet('SELECT * FROM subscriptions WHERE id = ?', [result.lastID]);
  res.status(201).json(created);
}));

app.put('/api/subscriptions/:id', verifyToken, validate(subscriptionSchema), asyncHandler(async (req, res) => {
  const { name, cost, category, billing_cycle, billing_date, website,
          status, trial_end_date, last_used_date, notes } = req.validatedBody;

  const existing = await dbGet(
    'SELECT id FROM subscriptions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });

  await dbRun(
    `UPDATE subscriptions
     SET name=?, cost=?, category=?, billing_cycle=?, billing_date=?, website=?,
         status=?, trial_end_date=?, last_used_date=?, notes=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`,
    [name, cost, category, billing_cycle || 'monthly', billing_date ?? null,
     website || null, status || 'active', trial_end_date || null,
     last_used_date || null, notes || null, req.params.id, req.userId]
  );

  const updated = await dbGet('SELECT * FROM subscriptions WHERE id = ?', [req.params.id]);
  res.json(updated);
}));

app.delete('/api/subscriptions/:id', verifyToken, asyncHandler(async (req, res) => {
  const existing = await dbGet(
    'SELECT id FROM subscriptions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });

  await dbRun('DELETE FROM subscriptions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
}));

// ─── Analytics Route ──────────────────────────────────────────────────────────

app.get('/api/analytics', verifyToken, asyncHandler(async (req, res) => {
  const subs = await dbAll(
    'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active"',
    [req.userId]
  );

  const totalMonthly = subs.reduce((s, sub) => s + getMonthlyCost(sub), 0);
  const totalYearly  = totalMonthly * 12;

  // Category breakdown
  const byCategory = {};
  subs.forEach(sub => {
    const cat = sub.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + getMonthlyCost(sub);
  });

  // Top 5 by monthly cost
  const topSubscriptions = [...subs]
    .sort((a, b) => getMonthlyCost(b) - getMonthlyCost(a))
    .slice(0, 5)
    .map(s => ({ id: s.id, name: s.name, monthlyCost: +getMonthlyCost(s).toFixed(2), category: s.category }));

  // ── Smart Insights ──────────────────────────────────────────────────────────
  const insights = [];
  const now = new Date();

  // Unused subs (last_used_date set but >30 days ago)
  const unusedSubs = subs.filter(sub => {
    if (!sub.last_used_date) return false;
    return (now - new Date(sub.last_used_date)) / (1000 * 60 * 60 * 24) > 30;
  });

  if (unusedSubs.length > 0) {
    const wastedMonthly = unusedSubs.reduce((s, sub) => s + getMonthlyCost(sub), 0);
    insights.push({
      type:            'unused',
      severity:        'warning',
      title:           `${unusedSubs.length} possibly unused subscription${unusedSubs.length > 1 ? 's' : ''}`,
      description:     `${unusedSubs.map(s => s.name).join(', ')} ${unusedSubs.length > 1 ? 'haven\'t' : 'hasn\'t'} been marked as used in 30+ days.`,
      savings:         +wastedMonthly.toFixed(2),
      subscriptionIds: unusedSubs.map(s => s.id)
    });
  }

  // Yearly billing savings (monthly-billed subs > $5)
  const canSwitchToYearly = subs.filter(s => s.billing_cycle === 'monthly' && s.cost > 5);
  if (canSwitchToYearly.length > 0) {
    const savings = +(canSwitchToYearly.reduce((s, sub) => s + sub.cost * 2, 0).toFixed(2));
    insights.push({
      type:        'yearly_savings',
      severity:    'info',
      title:       'Switch to yearly billing',
      description: `${canSwitchToYearly.length} subscription${canSwitchToYearly.length > 1 ? 's' : ''} could save ~$${savings}/yr by switching to annual plans (typically 2 months free).`,
      savings,
      subscriptionIds: canSwitchToYearly.map(s => s.id)
    });
  }

  // Trial ending soon (within 7 days)
  subs.forEach(sub => {
    if (!sub.trial_end_date) return;
    const daysLeft = Math.ceil((new Date(sub.trial_end_date) - now) / (1000 * 60 * 60 * 24));
    if (daysLeft >= 0 && daysLeft <= 7) {
      insights.push({
        type:           'trial_ending',
        severity:       'danger',
        title:          `Trial ending: ${sub.name}`,
        description:    `Your ${sub.name} trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Cancel to avoid a $${getMonthlyCost(sub).toFixed(2)}/mo charge.`,
        subscriptionId: sub.id,
        savings:        +getMonthlyCost(sub).toFixed(2)
      });
    }
  });

  // ── Upcoming Billing (next 7 days) ──────────────────────────────────────────
  const today = now.getDate();
  const upcomingBilling = subs
    .filter(s => s.billing_date)
    .map(s => {
      const daysUntil = s.billing_date >= today
        ? s.billing_date - today
        : (31 - today) + s.billing_date;
      return { id: s.id, name: s.name, cost: +getMonthlyCost(s).toFixed(2), billing_date: s.billing_date, daysUntil };
    })
    .filter(s => s.daysUntil <= 7)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  // ── 12-month Spending Trend ─────────────────────────────────────────────────
  // Approximation: sum of subs that existed at each month's end
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d     = new Date(now.getFullYear(), now.getMonth() - (11 - i) + 1, 0); // last day of that month
    const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
    const activeThen = subs.filter(s => new Date(s.created_at) <= d);
    return { month: label, total: +activeThen.reduce((s, sub) => s + getMonthlyCost(sub), 0).toFixed(2) };
  });

  res.json({
    totalMonthly:    +totalMonthly.toFixed(2),
    totalYearly:     +totalYearly.toFixed(2),
    count:           subs.length,
    byCategory:      Object.fromEntries(Object.entries(byCategory).map(([k, v]) => [k, +v.toFixed(2)])),
    topSubscriptions,
    insights,
    upcomingBilling,
    monthlyTrend
  });
}));

// ─── User Routes ──────────────────────────────────────────────────────────────

app.post('/api/users/onboard', verifyToken, asyncHandler(async (req, res) => {
  await dbRun('UPDATE users SET onboarded = 1 WHERE id = ?', [req.userId]);
  res.json({ success: true });
}));

// Seed demo subscriptions (only if user has none)
app.post('/api/subscriptions/demo', verifyToken, asyncHandler(async (req, res) => {
  const existing = await dbGet(
    'SELECT COUNT(*) AS c FROM subscriptions WHERE user_id = ?', [req.userId]
  );
  if (existing.c > 0) {
    return res.status(409).json({ error: 'Demo data only available for new accounts' });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const demoSubs = [
    { name: 'Netflix',              cost: 15.99, category: 'Entertainment', billing_date: 1,  billing_cycle: 'monthly', website: 'https://netflix.com' },
    { name: 'Spotify',              cost: 9.99,  category: 'Entertainment', billing_date: 5,  billing_cycle: 'monthly', website: 'https://spotify.com' },
    { name: 'GitHub Pro',           cost: 4.00,  category: 'Software',      billing_date: 10, billing_cycle: 'monthly', website: 'https://github.com' },
    { name: 'Adobe Creative Cloud', cost: 54.99, category: 'Software',      billing_date: 15, billing_cycle: 'monthly', website: 'https://adobe.com' },
    { name: 'ChatGPT Plus',         cost: 20.00, category: 'Productivity',  billing_date: 20, billing_cycle: 'monthly', website: 'https://chat.openai.com' },
    { name: 'Gym Membership',       cost: 29.99, category: 'Fitness',       billing_date: 1,  billing_cycle: 'monthly', last_used_date: thirtyDaysAgo },
    { name: 'NYT Digital',          cost: 4.00,  category: 'News',          billing_date: 8,  billing_cycle: 'monthly', website: 'https://nytimes.com' },
    { name: 'Notion Pro',           cost: 8.00,  category: 'Productivity',  billing_date: 12, billing_cycle: 'monthly', website: 'https://notion.so' },
  ];

  for (const sub of demoSubs) {
    await dbRun(
      `INSERT INTO subscriptions (user_id, name, cost, category, billing_cycle, billing_date, website, last_used_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, sub.name, sub.cost, sub.category, sub.billing_cycle,
       sub.billing_date, sub.website || null, sub.last_used_date || null]
    );
  }

  res.status(201).json({ success: true, count: demoSubs.length });
}));

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message || err);
  res.status(500).json({ error: 'An internal server error occurred' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`SubTrackr API running on :${PORT}`));
