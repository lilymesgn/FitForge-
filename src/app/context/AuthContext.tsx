// ============================================================
// Fit Tracker PRO — Auth Context (Supabase)
// Real authentication backed by Supabase Auth + the `profiles`
// table. Supports email/password and Google OAuth.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { User, Gender, FitnessGoal, SubscriptionStatus } from '../types';
import { supabase, getRedirectUrl } from '../lib/supabase';
import { stripeService } from '../services/stripeService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string; needsConfirmation?: boolean }>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  gender: Gender;
  goal?: FitnessGoal;
}

// ─── Row <-> domain mapping ─────────────────────────────────────────────────────
interface ProfileRow {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  age: number | null;
  weight: number | null;
  height: number | null;
  goal: FitnessGoal | null;
  subscription: SubscriptionStatus;
  trial_start_date: string | null;
  avatar_url: string | null;
  created_at: string;
}

function rowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    gender: row.gender,
    age: row.age ?? undefined,
    weight: row.weight ?? undefined,
    height: row.height ?? undefined,
    goal: row.goal ?? undefined,
    subscription: row.subscription,
    trialStartDate: row.trial_start_date ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

function userToRow(data: Partial<User>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.email !== undefined) row.email = data.email;
  if (data.gender !== undefined) row.gender = data.gender;
  if (data.age !== undefined) row.age = data.age;
  if (data.weight !== undefined) row.weight = data.weight;
  if (data.height !== undefined) row.height = data.height;
  if (data.goal !== undefined) row.goal = data.goal;
  if (data.subscription !== undefined) row.subscription = data.subscription;
  if (data.trialStartDate !== undefined) row.trial_start_date = data.trialStartDate;
  if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl;
  return row;
}

// ─── Fetch + reconcile profile from Supabase ────────────────────────────────────
// Loads the profile row, applies trial-expiry, and reconciles against the
// subscriptions table so subscription state is always authoritative.
async function loadProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[v0] Failed to load profile:', error.message);
    return null;
  }
  if (!data) return null;

  let user = rowToUser(data as ProfileRow);
  let nextSubscription: SubscriptionStatus = user.subscription;

  // Trial expiry
  if (nextSubscription === 'trial' && user.trialStartDate) {
    if (stripeService.isTrialExpired(user.trialStartDate)) {
      nextSubscription = 'none';
    }
  }

  // Reconcile against the subscriptions table
  const sub = await stripeService.getSubscription(user.id);
  if (sub?.status === 'active' && nextSubscription !== 'active') {
    nextSubscription = 'active';
  } else if (sub?.status === 'cancelled' && nextSubscription === 'active') {
    nextSubscription = 'cancelled';
  }

  // Persist reconciliation if it changed
  if (nextSubscription !== user.subscription) {
    await supabase.from('profiles').update({ subscription: nextSubscription }).eq('id', user.id);
    user = { ...user, subscription: nextSubscription };
  }

  return user;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Bootstrap + subscribe to auth state changes
  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        if (active) setUser(profile);
      }
      if (active) setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!active) return;
      setSession(session);
      if (session?.user) {
        const profile = await loadProfile(session.user.id);
        if (active) setUser(profile);
      } else {
        setUser(null);
      }
      if (active) setIsLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // ── Login ───────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    // onAuthStateChange will hydrate the profile.
    return { success: true };
  }, []);

  // ── Google OAuth ──────────────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl('/auth/callback') },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── Signup ──────────────────────────────────────────────────────────────────
  const signup = useCallback(async (data: SignupData) => {
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: getRedirectUrl('/auth/callback'),
        data: {
          name: data.name,
          gender: data.gender,
          goal: data.goal || 'get_fit',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If email confirmation is required there is no active session yet.
    if (result.session?.user) {
      const profile = await loadProfile(result.session.user.id);
      setUser(profile);
      return { success: true, needsConfirmation: false };
    }
    return { success: true, needsConfirmation: true };
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  // ── Update user (profile row) ─────────────────────────────────────────────────
  const updateUser = useCallback(
    async (data: Partial<User>) => {
      if (!user) return;
      const optimistic = { ...user, ...data };
      setUser(optimistic);
      const { error } = await supabase
        .from('profiles')
        .update(userToRow(data))
        .eq('id', user.id);
      if (error) {
        console.error('[v0] Failed to update profile:', error.message);
        // Re-sync from server on failure
        const fresh = await loadProfile(user.id);
        if (fresh) setUser(fresh);
      }
    },
    [user],
  );

  // ── Password reset (email link) ────────────────────────────────────────────────
  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getRedirectUrl('/auth/callback?type=recovery'),
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  // ── Update password (after recovery / from profile) ──────────────────────────
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const value: AuthContextType = {
    user,
    token: session?.access_token ?? null,
    isLoading,
    isAuthenticated: !!user && !!session,
    login,
    loginWithGoogle,
    signup,
    logout,
    updateUser,
    requestPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
