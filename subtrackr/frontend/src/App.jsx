import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { DarkModeProvider, useDarkMode } from './context/DarkModeContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { setTokens, clearTokens, getRefreshToken, apiFetch } from './api/client';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { SubscriptionModal } from './components/SubscriptionModal';
import { OnboardingWizard } from './components/OnboardingWizard';
import './App.css';

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

function AppShell() {
  const [user,        setUser]        = useState(null);
  const [activeTab,   setActiveTab]   = useState('dashboard');
  const [showModal,   setShowModal]   = useState(false);
  const [editData,    setEditData]    = useState(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const { dark, toggle }              = useDarkMode();
  const toast                         = useToast();
  const qc                            = useQueryClient();

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
      body: JSON.stringify({ refreshToken: getRefreshToken() })
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
    qc.invalidateQueries({ queryKey: ['subscriptions'] });
    qc.invalidateQueries({ queryKey: ['analytics'] });
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
