import React from 'react';

export function SkeletonCard() {
  return (
    <div className="subscription-card skeleton-card" aria-hidden="true">
      <div className="sk sk-title" />
      <div className="sk sk-badge" />
      <div className="sk sk-cost" />
      <div className="sk sk-line" />
      <div className="sk sk-line sk-short" />
    </div>
  );
}

export function SkeletonMetric() {
  return (
    <div className="metric-card" aria-hidden="true">
      <div className="sk sk-label" />
      <div className="sk sk-value" />
    </div>
  );
}
