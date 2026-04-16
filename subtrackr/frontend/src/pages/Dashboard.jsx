import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptions, useDeleteSubscription } from '../hooks/useSubscriptions';
import { useDebounce } from '../hooks/useDebounce';
import { useToast } from '../context/ToastContext';
import { SubscriptionCard } from '../components/SubscriptionCard';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { SkeletonCard } from '../components/ui/Skeleton';

function EmptyState({ search }) {
  return (
    <div className="empty-state">
      <div className="empty-illustration">
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
          <circle cx="60" cy="60" r="58" stroke="var(--border)" strokeWidth="2" />
          <rect x="35" y="42" width="50" height="8" rx="4" fill="var(--skeleton-base)" />
          <rect x="35" y="58" width="35" height="6" rx="3" fill="var(--skeleton-base)" />
          <rect x="35" y="72" width="42" height="6" rx="3" fill="var(--skeleton-base)" />
          <circle cx="82" cy="38" r="12" fill="var(--primary)" opacity="0.15" />
          <text x="78" y="43" fontSize="14" fill="var(--primary)">+</text>
        </svg>
      </div>
      <h3>{search ? 'No results found' : 'No subscriptions yet'}</h3>
      <p>{search
        ? `No subscriptions match "${search}". Try a different search term.`
        : 'Add your first subscription to start tracking your spending.'
      }</p>
    </div>
  );
}

const CATEGORIES = [
  'Entertainment', 'Software', 'Fitness', 'News',
  'Productivity', 'Education', 'Finance', 'Other'
];

export function Dashboard({ onEdit }) {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [status,   setStatus]   = useState('active');
  const [sortBy,   setSortBy]   = useState('billing_date');
  const [order,    setOrder]    = useState('asc');
  const [confirm,  setConfirm]  = useState(null); // { id, name }

  const debouncedSearch = useDebounce(search, 300);
  const toast           = useToast();

  const { data, isLoading, isError } = useSubscriptions({
    search: debouncedSearch, category, status, sortBy, order
  });

  const deleteMutation = useDeleteSubscription();

  const handleDelete = (id) => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast('Subscription deleted.', 'success');
        setConfirm(null);
      },
      onError: () => toast('Failed to delete. Try again.', 'error')
    });
  };

  const subs = data?.data || [];

  return (
    <div className="dashboard">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            className="search-input"
            type="text"
            placeholder="Search subscriptions…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear">✕</button>
          )}
        </div>

        <div className="filters">
          <select value={category} onChange={e => setCategory(e.target.value)} className="filter-select">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <select value={status} onChange={e => setStatus(e.target.value)} className="filter-select">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={`${sortBy}:${order}`}
            onChange={e => { const [s, o] = e.target.value.split(':'); setSortBy(s); setOrder(o); }}
            className="filter-select"
          >
            <option value="billing_date:asc">Billing date ↑</option>
            <option value="cost:desc">Cost: High → Low</option>
            <option value="cost:asc">Cost: Low → High</option>
            <option value="name:asc">Name A → Z</option>
            <option value="created_at:desc">Newest first</option>
          </select>
        </div>
      </div>

      {/* Result summary */}
      {!isLoading && (
        <p className="result-count">
          {subs.length === 0 ? 'No results' : `${subs.length} subscription${subs.length !== 1 ? 's' : ''}`}
          {data?.pagination?.total > subs.length ? ` of ${data.pagination.total}` : ''}
        </p>
      )}

      {isError && <div className="error-banner">Failed to load subscriptions. Try refreshing.</div>}

      {isLoading ? (
        <div className="subscriptions-grid">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : subs.length === 0 ? (
        <EmptyState search={search} />
      ) : (
        <div className="subscriptions-grid">
          {subs.map(sub => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              onEdit={() => onEdit(sub)}
              onDelete={() => setConfirm({ id: sub.id, name: sub.name })}
            />
          ))}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          title="Delete subscription?"
          message={`"${confirm.name}" will be permanently removed. This cannot be undone.`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
