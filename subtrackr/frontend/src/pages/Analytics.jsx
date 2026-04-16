import React from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAnalytics } from '../hooks/useAnalytics';
import { InsightsPanel } from '../components/InsightsPanel';
import { SkeletonMetric } from '../components/ui/Skeleton';
import { CATEGORY_COLORS } from '../components/SubscriptionCard';

export function Analytics() {
  const { data: analytics, isLoading } = useAnalytics();

  if (isLoading) {
    return (
      <div className="analytics">
        <div className="metrics-grid">
          <SkeletonMetric /><SkeletonMetric /><SkeletonMetric />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const pieData = Object.entries(analytics.byCategory || {}).map(([name, value]) => ({
    name, value, color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other
  }));

  const savingsInsight = analytics.insights?.find(i => i.type === 'yearly_savings');

  return (
    <div className="analytics">
      {/* KPI Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <p className="metric-label">Monthly Spend</p>
          <p className="metric-value">${analytics.totalMonthly.toFixed(2)}</p>
          <p className="metric-sub">{analytics.count} active subscriptions</p>
        </div>
        <div className="metric-card">
          <p className="metric-label">Yearly Projection</p>
          <p className="metric-value">${analytics.totalYearly.toFixed(2)}</p>
          <p className="metric-sub">At current rate</p>
        </div>
        <div className="metric-card metric-card-highlight">
          <p className="metric-label">Potential Savings</p>
          <p className="metric-value metric-savings">
            ${savingsInsight ? savingsInsight.savings.toFixed(2) : '0.00'}
          </p>
          <p className="metric-sub">By switching to yearly</p>
        </div>
      </div>

      {/* Upcoming billing */}
      {analytics.upcomingBilling?.length > 0 && (
        <div className="upcoming-billing-banner">
          <span className="upcoming-icon">📅</span>
          <span className="upcoming-label">Upcoming:</span>
          {analytics.upcomingBilling.slice(0, 3).map((b, i) => (
            <span key={b.id} className="upcoming-item">
              {b.name} — ${b.cost.toFixed(2)} {b.daysUntil === 0 ? 'today' : `in ${b.daysUntil}d`}
              {i < Math.min(analytics.upcomingBilling.length, 3) - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Insights */}
      <InsightsPanel insights={analytics.insights} />

      {/* Charts row */}
      <div className="charts-row">
        {/* Monthly trend */}
        <div className="chart-card">
          <h3>12-Month Spending Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics.monthlyTrend} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickFormatter={v => `$${v}`} />
              <Tooltip
                formatter={(v) => [`$${v}`, 'Monthly']}
                contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}
              />
              <Line
                type="monotone" dataKey="total" stroke="var(--primary)"
                strokeWidth={2.5} dot={{ r: 3, fill: 'var(--primary)' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category pie */}
        <div className="chart-card">
          <h3>By Category</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`$${v.toFixed(2)}`, '']}
                    contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {pieData.map(d => (
                  <div key={d.name} className="pie-legend-item">
                    <span className="pie-dot" style={{ background: d.color }} />
                    <span>{d.name}</span>
                    <span className="pie-amount">${d.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="chart-empty">No data yet.</p>
          )}
        </div>
      </div>

      {/* Top subscriptions */}
      {analytics.topSubscriptions?.length > 0 && (
        <div className="chart-card top-subs-card">
          <h3>Most Expensive</h3>
          {analytics.topSubscriptions.map((s, i) => (
            <div key={s.id} className="top-sub-row">
              <span className="top-sub-rank">#{i + 1}</span>
              <span className="top-sub-name">{s.name}</span>
              <div className="top-sub-bar-wrap">
                <div
                  className="top-sub-bar"
                  style={{
                    width: `${(s.monthlyCost / analytics.topSubscriptions[0].monthlyCost) * 100}%`,
                    background: CATEGORY_COLORS[s.category] || CATEGORY_COLORS.Other
                  }}
                />
              </div>
              <span className="top-sub-cost">${s.monthlyCost.toFixed(2)}/mo</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
