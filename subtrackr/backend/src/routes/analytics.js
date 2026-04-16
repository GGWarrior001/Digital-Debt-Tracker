const express = require('express');
const router  = express.Router();

const { dbAll, dbRun }              = require('../db/client');
const { verifyToken, asyncHandler } = require('../middleware/auth');
const { getMonthlyCost }            = require('../utils/analytics');

// GET /api/analytics
router.get('/', verifyToken, asyncHandler(async (req, res) => {
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

// POST /api/users/onboard  (included here for user-related operations)
// This is mounted separately in server.js under /api/users
module.exports = router;
