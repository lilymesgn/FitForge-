// ============================================================
// Fit Tracker PRO — Freemium Context
// Manages feature access gates: Free vs Premium.
// Premium = subscription 'active' | 'trial'
// Free    = subscription 'none' | 'cancelled'
// FIX: aiMessagesLeft is now reactive via useState+msgTick
// ============================================================
import React, { createContext, useContext, useCallback, useState } from 'react';
import { useAuth } from './AuthContext';

// ─── Premium feature keys ─────────────────────────────────────────────────────
export type PremiumFeature =
  | 'meal_scanner'       // AI camera food detection
  | 'form_analyzer'      // AI workout form analysis
  | 'ai_coach_unlimited' // Unlimited AI coach messages
  | 'macros_tracking'    // Full macro breakdown in calorie tracker
  | 'gps_tracking'       // GPS route tracking in activity
  | 'full_analytics'     // 30-day charts in dashboard
  | 'body_measurements'; // Body measurements & fitness radar

// ─── Features that are always free ───────────────────────────────────────────
const FREE_ACCESS: PremiumFeature[] = [];

// ─── Context type ─────────────────────────────────────────────────────────────
interface FreemiumContextType {
  isPremium: boolean;
  canAccess: (feature: PremiumFeature) => boolean;
  subscriptionLabel: string;
  aiMessagesLeft: number;
  decrementAiMessages: () => void;
  resetAiMessages: () => void;
}

const FreemiumContext = createContext<FreemiumContextType | null>(null);

export function FreemiumProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  // BUG FIX #2: msgTick forces re-render when AI message count changes
  const [msgTick, setMsgTick] = useState(0);

  const isPremium =
    user?.subscription === 'active' || user?.subscription === 'trial';

  const subscriptionLabel = (() => {
    switch (user?.subscription) {
      case 'active':    return 'Premium';
      case 'trial':     return 'Trial';
      case 'none':      return 'Free';
      case 'cancelled': return 'Free (expired)';
      default:          return 'Free';
    }
  })();

  const canAccess = useCallback(
    (feature: PremiumFeature): boolean => {
      if (isPremium) return true;
      return (FREE_ACCESS as string[]).includes(feature);
    },
    [isPremium]
  );

  // ── AI message limit tracking (free users: 5/day) ────────────────────────
  const AI_LIMIT_KEY = `fit_ai_msgs_${user?.id}_${new Date().toDateString()}`;

  // msgTick is read here so this function re-executes whenever tick changes
  const getAiMessagesLeft = (): number => {
    void msgTick; // reactive dependency
    if (isPremium) return Infinity;
    const used = parseInt(localStorage.getItem(AI_LIMIT_KEY) || '0', 10);
    return Math.max(0, 5 - used);
  };

  const decrementAiMessages = useCallback(() => {
    if (isPremium) return;
    const used = parseInt(localStorage.getItem(AI_LIMIT_KEY) || '0', 10);
    localStorage.setItem(AI_LIMIT_KEY, String(used + 1));
    setMsgTick(t => t + 1); // BUG FIX: trigger re-render so counter updates
  }, [isPremium, AI_LIMIT_KEY]);

  const resetAiMessages = useCallback(() => {
    localStorage.removeItem(AI_LIMIT_KEY);
    setMsgTick(0);
  }, [AI_LIMIT_KEY]);

  const value: FreemiumContextType = {
    isPremium,
    canAccess,
    subscriptionLabel,
    aiMessagesLeft: getAiMessagesLeft(),
    decrementAiMessages,
    resetAiMessages,
  };

  return (
    <FreemiumContext.Provider value={value}>
      {children}
    </FreemiumContext.Provider>
  );
}

/** Hook to consume freemium context */
export function useFreemium(): FreemiumContextType {
  const ctx = useContext(FreemiumContext);
  if (!ctx) throw new Error('useFreemium must be used inside FreemiumProvider');
  return ctx;
}
