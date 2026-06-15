// ============================================================
// Fit Tracker PRO — Axios API Instance
// Configures base URL + automatic JWT injection.
// In production: set VITE_API_URL to your Express server URL.
// ============================================================
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach JWT token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fit_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor — handle auth errors ────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session
      localStorage.removeItem('fit_token');
      localStorage.removeItem('fit_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
