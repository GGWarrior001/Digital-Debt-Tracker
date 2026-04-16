/**
 * SubTrackr — Production Frontend v2
 *
 * What's new vs v1:
 *  - TanStack Query (React Query v5) — caching, optimistic updates, background refetch
 *  - Refresh-token rotation with transparent retry on 401
 *  - Dark mode (persisted in localStorage)
 *  - Toast notification system (zero dependencies)
 *  - Skeleton loaders on every data-fetching surface
 *  - Confirmation modal for destructive actions
 *  - Search (debounced 300 ms), filter by category/status, sort by cost/name/date
 *  - Smart Insights panel from analytics API
 *  - Upcoming billing alerts banner
 *  - Recharts: line chart (monthly trend) + pie chart (category breakdown)
 *  - Onboarding wizard for first-time users
 *  - billing_cycle field (monthly / yearly / weekly)
 *  - Empty-state with CTA illustration
 *  - Mobile-first responsive layout
 */

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query';
import {
  LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './App.css';

// ─── Config ───────────────────────────────────────────────────────────────────

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORIES = [
  'Entertainment', 'Software', 'Fitness', 'News',
  'Productivity', 'Education', 'Finance', 'Other'
];

const CATEGORY_COLORS = {
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   60_000,
      gcTime:      5 * 60_000,
      retry:       1,
      refetchOnWindowFocus: false
    }
  }
});

// ─── Auth API Layer ───────────────────────────────────────────────────────────

let _accessToken  = localStorage.getItem('accessToken');
let _refreshToken = localStorage.getItem('refreshToken');

const setTokens = (access, refresh) => {
  _accessToken  = access;
  _refreshToken = refresh;
  if (access)  localStorage.setItem('accessToken',  access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
};

const clearTokens = () => {
  _accessToken = _refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Transparent token refresh — intercepts 401 TOKEN_EXPIRED once per request
const apiFetch = async (path, options = {}) => {
  const doFetch = (token) => fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  let res = await doFetch(_accessToken);

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED' && _refreshToken) {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: _refreshToken })
      });
      if (refreshRes.ok) {
        const { accessToken, refreshToken } = await refreshRes.json();
        setTokens(accessToken, refreshToken);
        res = await doFetch(accessToken);
      } else {
        clearTokens();
        window.location.reload();
        return;
      }
    }
  }

  return res;
};

// ─── Toast Context ────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span className="toast-icon">
              {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
            </span>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const useToast = () => useContext(ToastContext);

// ─── Dark Mode Context ────────────────────────────────────────────────────────

const DarkModeContext = createContext(null);

function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('darkMode', dark);
  }, [dark]);

  return (
    <DarkModeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </DarkModeContext.Provider>
  );
}

const useDarkMode = () => useContext(DarkModeContext);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function SkeletonCard() {
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

function SkeletonMetric() {
  return (
    <div className="metric-card" aria-hidden="true">
      <div className="sk sk-label" />
      <div className="sk sk-value" />
    </div>
  );
}

// ─── Confirmation Modal ───────────────────────────────────────────────────────

function ConfirmModal({ title, message, onConfirm, onCancel, danger = true }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-body-text">{message}</p>
        <div className="form-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding Wizard ────────────────────────────────────────────────────────

function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const toast = useToast();
  const qc = useQueryClient();

  const steps = [
    {
      emoji: '👋',
      title: 'Welcome to SubTrackr',
      body:  'Your personal subscription command center. Track spending, catch unused services, and stop money leaking out every month.'
    },
    {
      emoji: '📊',
      title: 'Smart Insights',
      body:  'We automatically flag unused subscriptions, upcoming trials, and show you how much you could save by switching to yearly billing.'
    },
    {
      emoji: '🚀',
      title: 'Ready to go',
      body:  'Start by adding your first subscription — or load sample data to explore the app instantly.'
    }
  ];

  const handleDemoLoad = async () => {
    const res = await apiFetch('/subscriptions/demo', { method: 'POST' });
    if (res.ok) {
      toast('Demo data loaded! Explore your dashboard.', 'success');
      qc.invalidateQueries(['subscriptions']);
      qc.invalidateQueries(['analytics']);
    }
    onComplete();
  };

  return (
    <div className="modal-overlay">
      <div className="modal onboarding-modal">
        <div className="onboarding-steps-indicator">
          {steps.map((_, i) => (
            <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="onboarding-content">
          <div className="onboarding-emoji">{steps[step].emoji}</div>
          <h2>{steps[step].title}</h2>
          <p>{steps[step].body}</p>
        </div>

        <div className="onboarding-actions">
          {step < steps.length - 1 ? (
            <button className="btn-primary" onClick={() => setStep(s => s + 1)}>
              Next →
            </button>
          ) : (
            <div className="onboarding-final-actions">
              <button className="btn-secondary" onClick={onComplete}>Start fresh</button>
              <button className="btn-primary"   onClick={handleDemoLoad}>Load demo data</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Subscription Form ────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', cost: '', category: 'Entertainment', billing_cycle: 'monthly',
  billing_date: 1, website: '', trial_end_date: '', last_used_date: '', notes: '', status: 'active'
};

function SubscriptionModal({ editData, onClose }) {
  const [form, setForm]     = useState(editData || EMPTY_FORM);
  const [error, setError]   = useState('');
  const toast               = useToast();
  const qc                  = useQueryClient();
  const isEdit              = !!editData;

  const mutation = useMutation({
    mutationFn: async (data) => {
      const res = await apiFetch(
        isEdit ? `/subscriptions/${editData.id}` : '/subscriptions',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(data) }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Request failed');
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries(['subscriptions']);
      qc.invalidateQueries(['analytics']);
      toast(isEdit ? 'Subscription updated!' : 'Subscription added!', 'success');
      onClose();
    },
    onError: (err) => setError(err.message)
  });

  const set = (key) => (e) => {
    const val = e.target.type === 'number' ? (e.target.value === '' ? '' : +e.target.value) : e.target.value;
    setForm(f => ({ ...f, [key]: val }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    const payload = {
      ...form,
      cost:         parseFloat(form.cost),
      billing_date: form.billing_date ? parseInt(form.billing_date) : null
    };
    mutation.mutate(payload);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit' : 'Add'} Subscription</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text" required autoFocus
              value={form.name} onChange={set('name')}
              placeholder="Netflix, Spotify, AWS…"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost *</label>
              <div className="input-prefix-wrap">
                <span className="input-prefix">$</span>
                <input
                  type="number" required step="0.01" min="0"
                  value={form.cost} onChange={set('cost')} placeholder="9.99"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Billing Cycle</label>
              <select value={form.billing_cycle} onChange={set('billing_cycle')}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={form.category} onChange={set('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Billing Day (1–31)</label>
              <input
                type="number" min="1" max="31"
                value={form.billing_date} onChange={set('billing_date')}
              />
            </div>
            <div className="form-group">
              <label>Trial Ends</label>
              <input type="date" value={form.trial_end_date} onChange={set('trial_end_date')} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Website</label>
              <input type="url" value={form.website} onChange={set('website')} placeholder="https://…" />
            </div>
            <div className="form-group">
              <label>Last Used</label>
              <input type="date" value={form.last_used_date} onChange={set('last_used_date')} />
            </div>
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Any notes…" />
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending
                ? <span className="btn-spinner" />
                : (isEdit ? 'Save Changes' : 'Add Subscription')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Insights Panel ───────────────────────────────────────────────────────────

function InsightsPanel({ insights }) {
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

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function Dashboard({ onEdit }) {
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [status,   setStatus]   = useState('active');
  const [sortBy,   setSortBy]   = useState('billing_date');
  const [order,    setOrder]    = useState('asc');
  const [confirm,  setConfirm]  = useState(null); // { id, name }

  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();
  const qc    = useQueryClient();

  const params = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(category        && { category }),
    ...(status          && { status }),
    sortBy, order
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['subscriptions', debouncedSearch, category, status, sortBy, order],
    queryFn:  async () => {
      const res = await apiFetch(`/subscriptions?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      qc.invalidateQueries(['subscriptions']);
      qc.invalidateQueries(['analytics']);
      toast('Subscription deleted.', 'success');
      setConfirm(null);
    },
    onError: () => toast('Failed to delete. Try again.', 'error')
  });

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
          onConfirm={() => deleteMutation.mutate(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ─── Subscription Card ────────────────────────────────────────────────────────

function SubscriptionCard({ sub, onEdit, onDelete }) {
  const cycleLabel = { monthly: '/mo', yearly: '/yr', weekly: '/wk' };
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

// ─── Empty State ──────────────────────────────────────────────────────────────

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

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function Analytics() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn:  async () => {
      const res = await apiFetch('/analytics');
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    }
  });

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
              {b.name} — ${b.cost.toFixed(2)} in {b.daysUntil === 0 ? 'today' : `${b.daysUntil}d`}
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

// ─── Auth Page ────────────────────────────────────────────────────────────────

function AuthPage({ onLogin }) {
  const [isSignup,  setIsSignup]  = useState(false);
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPass,  setShowPass]  = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const { dark, toggle }          = useDarkMode();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isSignup ? 'signup' : 'login';
      const res  = await fetch(`${API_URL}/auth/${endpoint}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'An error occurred');
      } else {
        onLogin(data);
      }
    } catch {
      setError('Connection error. Is the backend running?');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <button className="dark-toggle auth-dark-toggle" onClick={toggle} aria-label="Toggle dark mode">
        {dark ? '☀️' : '🌙'}
      </button>
      <div className="auth-container">
        <div className="auth-box">
          <div className="auth-logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">SubTrackr</span>
          </div>
          <h2 className="auth-heading">{isSignup ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-subheading">Track subscriptions. Kill waste. Save money.</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="form-group">
              <label>Password {isSignup && <span className="label-hint">(8+ chars, 1 uppercase, 1 number)</span>}</label>
              <div className="password-wrap">
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button" className="show-pass"
                  onClick={() => setShowPass(s => !s)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn-primary btn-block" disabled={loading}>
              {loading ? <span className="btn-spinner" /> : (isSignup ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}
            <button className="link-btn" onClick={() => { setIsSignup(s => !s); setError(''); }}>
              {isSignup ? 'Sign in' : 'Sign up free'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

function AppShell() {
  const [user,          setUser]          = useState(null);
  const [activeTab,     setActiveTab]     = useState('dashboard');
  const [showModal,     setShowModal]     = useState(false);
  const [editData,      setEditData]      = useState(null);
  const [showOnboard,   setShowOnboard]   = useState(false);
  const { dark, toggle }                  = useDarkMode();
  const toast                             = useToast();
  const qc                                = useQueryClient();

  // Restore session
  useEffect(() => {
    const access  = localStorage.getItem('accessToken');
    const refresh = localStorage.getItem('refreshToken');
    const email   = localStorage.getItem('userEmail');
    if (access && refresh && email) {
      setUser({ email });
    }
  }, []);

  const handleLogin = ({ accessToken, refreshToken, email, onboarded }) => {
    setTokens(accessToken, refreshToken);
    localStorage.setItem('userEmail', email);
    setUser({ email });
    if (!onboarded) setShowOnboard(true);
  };

  const handleLogout = async () => {
    await apiFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: _refreshToken })
    }).catch(() => {});
    clearTokens();
    localStorage.removeItem('userEmail');
    setUser(null);
    qc.clear();
    toast('Signed out.', 'info');
  };

  const handleOnboardComplete = async () => {
    await apiFetch('/users/onboard', { method: 'POST' });
    setShowOnboard(false);
    qc.invalidateQueries(['subscriptions']);
    qc.invalidateQueries(['analytics']);
  };

  const openAdd  = ()    => { setEditData(null); setShowModal(true); };
  const openEdit = (sub) => { setEditData(sub);  setShowModal(true); };

  if (!user) return <AuthPage onLogin={handleLogin} />;

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-brand">
            <span className="logo-icon">📊</span>
            <span className="logo-text">SubTrackr</span>
          </div>
          <div className="header-actions">
            <button className="dark-toggle" onClick={toggle} title="Toggle dark mode">
              {dark ? '☀️' : '🌙'}
            </button>
            {activeTab === 'dashboard' && (
              <button className="btn-primary btn-add" onClick={openAdd}>
                + Add
              </button>
            )}
            <button className="btn-ghost btn-logout" onClick={handleLogout}>Sign out</button>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <div className="tabs-inner">
          {[['dashboard', '📋 Dashboard'], ['analytics', '📊 Analytics']].map(([id, label]) => (
            <button
              key={id}
              className={`tab ${activeTab === id ? 'active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard onEdit={openEdit} />}
        {activeTab === 'analytics'  && <Analytics />}
      </main>

      {showModal && (
        <SubscriptionModal
          editData={editData}
          onClose={() => setShowModal(false)}
        />
      )}

      {showOnboard && <OnboardingWizard onComplete={handleOnboardComplete} />}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeProvider>
        <ToastProvider>
          <AppShell />
        </ToastProvider>
      </DarkModeProvider>
    </QueryClientProvider>
  );
}
