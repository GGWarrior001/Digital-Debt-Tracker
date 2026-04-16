const express = require('express');
const router  = express.Router();

const { dbGet, dbAll, dbRun }    = require('../db/client');
const { verifyToken, asyncHandler } = require('../middleware/auth');
const { validate }               = require('../middleware/validate');
const { subscriptionSchema }     = require('../schemas/subscription');

// GET /api/subscriptions
router.get('/', verifyToken, asyncHandler(async (req, res) => {
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

// POST /api/subscriptions
router.post('/', verifyToken, validate(subscriptionSchema), asyncHandler(async (req, res) => {
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

// POST /api/subscriptions/demo  (must come before /:id routes)
router.post('/demo', verifyToken, asyncHandler(async (req, res) => {
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

// PUT /api/subscriptions/:id
router.put('/:id', verifyToken, validate(subscriptionSchema), asyncHandler(async (req, res) => {
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

// DELETE /api/subscriptions/:id
router.delete('/:id', verifyToken, asyncHandler(async (req, res) => {
  const existing = await dbGet(
    'SELECT id FROM subscriptions WHERE id = ? AND user_id = ?',
    [req.params.id, req.userId]
  );
  if (!existing) return res.status(404).json({ error: 'Subscription not found' });

  await dbRun('DELETE FROM subscriptions WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
}));

module.exports = router;
