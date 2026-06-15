// ============================================================
// Fit Tracker PRO — Stripe Subscription Service (Mock)
// Updated: Freemium model — Free plan + Monthly ($4.99) + Yearly ($39.99)
// In production: replace these functions with real Stripe API calls.
// ============================================================

export type PlanId = 'monthly' | 'yearly';

export interface Plan {
  id: PlanId;
  name: string;
  price: number;
  period: string;
  perMonth?: string;    // displayed monthly equivalent for yearly plan
  savings?: string;     // e.g. "Save 33%"
  features: string[];
  stripePriceId: string;
}

// ─── Free plan features ───────────────────────────────────────────────────────
export const FREE_FEATURES = [
  'Basic dashboard (7-day history)',
  'Manual calorie logging (3 entries/day)',
  'Basic activity tracking (steps)',
  'AI Coach (5 messages/day)',
  'Profile management',
];

// ─── Paid plans ───────────────────────────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    price: 4.99,
    period: 'month',
    stripePriceId: 'price_REPLACE_WITH_REAL_ID',
    features: [
      'Everything in Free',
      'AI Meal Scanner (camera)',
      'Real-time Form Analyzer',
      'Unlimited AI Coach messages',
      'Full macro & nutrition tracking',
      'GPS run & route tracking',
      'Full 30-day analytics',
      'Priority support',
    ],
  },
  {
    id: 'yearly',
    name: 'Premium Yearly',
    price: 39.99,
    period: 'year',
    perMonth: '$3.33',
    savings: 'Save 33%',
    stripePriceId: 'price_REPLACE_WITH_REAL_ID_YEARLY',
    features: [
      'Everything in Monthly',
      '33% discount vs monthly',
      'Exclusive workout programs',
      'Body composition tracking',
      'Nutrition coaching add-on',
      'Early access to new features',
    ],
  },
];

const TRIAL_DAYS = 7;

export const stripeService = {
  /** Returns days remaining in free trial */
  getTrialDaysLeft(trialStartDate: string): number {
    const start = new Date(trialStartDate).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - start) / 86400000);
    return Math.max(0, TRIAL_DAYS - elapsed);
  },

  /** Check if trial has expired */
  isTrialExpired(trialStartDate: string): boolean {
    return stripeService.getTrialDaysLeft(trialStartDate) === 0;
  },

  /**
   * Mock: "Subscribe" user to a plan.
   * In production: call POST /api/subscriptions/create-checkout-session
   * and redirect to Stripe Checkout.
   */
  subscribe(userId: string, planId: PlanId, _cardDetails: Record<string, string>): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
          JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
        subs[userId] = { plan: planId, startDate: new Date().toISOString(), status: 'active' };
        localStorage.setItem('fit_subscriptions', JSON.stringify(subs));
        resolve({ success: true });
      }, 1500);
    });
  },

  /** Get current subscription for a user */
  getSubscription(userId: string) {
    const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
      JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
    return subs[userId] || null;
  },

  /**
   * Mock: Cancel subscription.
   * In production: call POST /api/subscriptions/cancel
   */
  cancelSubscription(userId: string): Promise<{ success: boolean }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const subs: Record<string, { plan: PlanId; startDate: string; status: string }> =
          JSON.parse(localStorage.getItem('fit_subscriptions') || '{}');
        if (subs[userId]) subs[userId].status = 'cancelled';
        localStorage.setItem('fit_subscriptions', JSON.stringify(subs));
        resolve({ success: true });
      }, 1000);
    });
  },
};