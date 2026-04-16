const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

let _accessToken  = localStorage.getItem('accessToken');
let _refreshToken = localStorage.getItem('refreshToken');

export const setTokens = (access, refresh) => {
  _accessToken  = access;
  _refreshToken = refresh;
  if (access)  localStorage.setItem('accessToken',  access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
};

export const clearTokens = () => {
  _accessToken = _refreshToken = null;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

export const getRefreshToken = () => _refreshToken;

// Transparent token refresh — intercepts 401 TOKEN_EXPIRED once per request
export const apiFetch = async (path, options = {}) => {
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

export { API_URL };
