import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';
import { useToast } from '../context/ToastContext';

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

export function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const toast = useToast();
  const qc    = useQueryClient();

  const handleDemoLoad = async () => {
    const res = await apiFetch('/subscriptions/demo', { method: 'POST' });
    if (res.ok) {
      toast('Demo data loaded! Explore your dashboard.', 'success');
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
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
