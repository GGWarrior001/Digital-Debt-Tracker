import React from 'react';

export function InsightsPanel({ insights }) {
  if (!insights || insights.length === 0) return null;

  const icons = { warning: '⚠️', info: '💡', danger: '🚨' };

  return (
    <div className="insights-panel">
      <h3 className="insights-title">Smart Insights</h3>
      <div className="insights-list">
        {insights.map((ins, i) => (
          <div key={i} className={`insight-card insight-${ins.severity}`}>
            <span className="insight-icon">{icons[ins.severity]}</span>
            <div className="insight-body">
              <p className="insight-title">{ins.title}</p>
              <p className="insight-desc">{ins.description}</p>
            </div>
            {ins.savings > 0 && (
              <span className="insight-savings">
                Save ${ins.savings.toFixed(2)}{ins.type === 'yearly_savings' ? '/yr' : '/mo'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
