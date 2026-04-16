import React, { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { useSaveSubscription } from '../hooks/useSubscriptions';

const CATEGORIES = [
  'Entertainment', 'Software', 'Fitness', 'News',
  'Productivity', 'Education', 'Finance', 'Other'
];

const EMPTY_FORM = {
  name: '', cost: '', category: 'Entertainment', billing_cycle: 'monthly',
  billing_date: 1, website: '', trial_end_date: '', last_used_date: '', notes: '', status: 'active'
};

export function SubscriptionModal({ editData, onClose }) {
  const [form, setForm]   = useState(editData || EMPTY_FORM);
  const [error, setError] = useState('');
  const toast             = useToast();
  const isEdit            = !!editData;

  const mutation = useSaveSubscription(editData);

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
    mutation.mutate(payload, {
      onSuccess: () => {
        toast(isEdit ? 'Subscription updated!' : 'Subscription added!', 'success');
        onClose();
      },
      onError: (err) => setError(err.message)
    });
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
