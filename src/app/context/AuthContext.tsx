// ============================================================
// Fit Tracker PRO — Auth Context
// Manages global user authentication state using localStorage
// (Replace localStorage calls with real API when backend is ready)
// FIX: Trial expiry enforced on session restore + login (BUG 1)
// FIX: Subscription reconciled from stripeService on restore (BUG 3)
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Gender, FitnessGoal } from '../types';
import { stripeService } from '../services/stripeService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  gender: Gender;
  goal?: FitnessGoal;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateToken(userId: string): string {
  const payload = { sub: userId, iat: Date.now(), exp: Date.now() + 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

function validateToken(token: string): { sub: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

// ─── BUG FIX #1 + #3: Reconcile subscription state on load ───────────────────
// Checks trial expiry and syncs stripe subscription record so both stores agree.
function reconcileSubscription(u: User): User {
  let resolved = { ...u };

  // BUG FIX #1: Expire trial if 7 days have passed
  if (resolved.subscription === 'trial' && resolved.trialStartDate) {
    if (stripeService.isTrialExpired(resolved.trialStartDate)) {
      resolved.subscription = 'none';
    }
  }

  // BUG FIX #3: If stripeService has a more recent 'active' record, trust it
  const stripeSub = stripeService.getSubscription(resolved.id);
  if (stripeSub?.status === 'active' && resolved.subscription !== 'active') {
    resolved.subscription = 'active';
  }
  if (stripeSub?.status === 'cancelled' && resolved.subscription === 'active') {
    resolved.subscription = 'cancelled';
  }

  return resolved;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on app load
  useEffect(() => {
    const storedToken = localStorage.getItem('fit_token');
    const storedUserRaw = localStorage.getItem('fit_user');
    if (storedToken && storedUserRaw) {
      const payload = validateToken(storedToken);
      if (payload) {
        const parsed: User = JSON.parse(storedUserRaw);
        // BUG FIX #1 & #3: reconcile subscription before setting state
        const reconciled = reconcileSubscription(parsed);
        // Persist reconciled state so next render sees updated subscription
        if (reconciled.subscription !== parsed.subscription) {
          const users: User[] = JSON.parse(localStorage.getItem('fit_users') || '[]');
          const idx = users.findIndex(u => u.id === reconciled.id);
          if (idx !== -1) users[idx] = reconciled;
          localStorage.setItem('fit_users', JSON.stringify(users));
          localStorage.setItem('fit_user', JSON.stringify(reconciled));
        }
        setToken(storedToken);
        setUser(reconciled);
      } else {
        localStorage.removeItem('fit_token');
        localStorage.removeItem('fit_user');
      }
    }
    setIsLoading(false);
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const users: User[] = JSON.parse(localStorage.getItem('fit_users') || '[]');
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('fit_passwords') || '{}');
    const foundUser = users.find(u => u.email === email);

    if (!foundUser) return { success: false, error: 'No account found with that email.' };
    if (passwords[foundUser.id] !== hashPassword(password)) {
      return { success: false, error: 'Incorrect password.' };
    }

    // BUG FIX #1 & #3: reconcile on login too
    const reconciled = reconcileSubscription(foundUser);
    const newToken = generateToken(reconciled.id);
    localStorage.setItem('fit_token', newToken);
    localStorage.setItem('fit_user', JSON.stringify(reconciled));
    setToken(newToken);
    setUser(reconciled);
    return { success: true };
  }, []);

  // ── Signup ──────────────────────────────────────────────────────────────────
  const signup = useCallback(async (data: SignupData) => {
    const users: User[] = JSON.parse(localStorage.getItem('fit_users') || '[]');
    if (users.find(u => u.email === data.email)) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      gender: data.gender,
      goal: data.goal || 'get_fit',
      subscription: 'trial',
      trialStartDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('fit_passwords') || '{}');
    passwords[newUser.id] = hashPassword(data.password);

    localStorage.setItem('fit_users', JSON.stringify([...users, newUser]));
    localStorage.setItem('fit_passwords', JSON.stringify(passwords));

    const newToken = generateToken(newUser.id);
    localStorage.setItem('fit_token', newToken);
    localStorage.setItem('fit_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return { success: true };
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem('fit_token');
    localStorage.removeItem('fit_user');
    setToken(null);
    setUser(null);
  }, []);

  // ── Update user ─────────────────────────────────────────────────────────────
  const updateUser = useCallback((data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    const users: User[] = JSON.parse(localStorage.getItem('fit_users') || '[]');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) users[idx] = updated;
    localStorage.setItem('fit_users', JSON.stringify(users));
    localStorage.setItem('fit_user', JSON.stringify(updated));
    setUser(updated);
  }, [user]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
