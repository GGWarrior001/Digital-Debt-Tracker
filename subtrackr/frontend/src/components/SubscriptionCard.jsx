import React from 'react';

export const CATEGORY_COLORS = {
  Entertainment: '#6366f1',
  Software:      '#8b5cf6',
  Fitness:       '#10b981',
  News:          '#f59e0b',
  Productivity:  '#3b82f6',
  Education:     '#ec4899',
  Finance:       '#14b8a6',
  Other:         '#94a3b8'
};

const getOrdinal = (n) => {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function SubscriptionCard({ sub, onEdit, onDelete }) {
  const cycleLabel  = { monthly: '/mo', yearly: '/yr', weekly: '/wk' };
  const accentColor = CATEGORY_COLORS[sub.category] || CATEGORY_COLORS.Other;

  return (
    <div className="subscription-card" style={{ '--accent': accentColor }}>
      <div className="card-header">
        <div className="card-name-row">
          <div className="card-color-dot" style={{ background: accentColor }} />
          <h3>{sub.name}</h3>
        </div>
        <span className={`badge badge-${sub.status}`}>{sub.status}</span>
      </div>

      <p className="card-category">{sub.category}</p>
      <p className="card-cost">
        ${sub.cost.toFixed(2)}
        <span>{cycleLabel[sub.billing_cycle] || '/mo'}</span>
      </p>

      {sub.billing_date && (
        <p className="card-meta">🗓 Bills on the {getOrdinal(sub.billing_date)}</p>
      )}
      {sub.trial_end_date && (
        <p className="card-meta card-trial">⏳ Trial ends {sub.trial_end_date}</p>
      )}
      {sub.website && (
        <p className="card-meta">
          <a href={sub.website} target="_blank" rel="noopener noreferrer">Visit site →</a>
        </p>
      )}

      <div className="card-actions">
        <button className="btn-sm btn-edit" onClick={onEdit}>Edit</button>
        <button className="btn-sm btn-danger-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
