// ============================================================
// Fit Tracker PRO — Welcome / Plan Selection Modal
// Shown to every user on first app open after authentication.
// Presents: Free plan vs Premium (Monthly $4.99 / Yearly $39.99).
// Tracks display state via localStorage to show only once.
// ============================================================
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Zap, Check, Crown, Star, X, ArrowRight, Lock,
} from 'lucide-react';
import { FREE_FEATURES, PLANS } from '../../services/stripeService';

const WELCOME_KEY = 'fit_welcome_seen';

/** Mark the welcome screen as seen so it's not shown again */
export function markWelcomeSeen(): void {
  localStorage.setItem(WELCOME_KEY, 'true');
}

/** Returns true if the welcome modal should be shown */
export function shouldShowWelcome(): boolean {
  return !localStorage.getItem(WELCOME_KEY);
}

// ─── Feature comparison rows ─────────────────────────────────────────────────
const COMPARISON = [
  { label: 'Dashboard', free: true,  premium: true  },
  { label: 'Basic calorie tracking', free: true,  premium: true  },
  { label: 'Basic activity tracking', free: true,  premium: true  },
  { label: 'AI Coach (5 msg/day)',    free: true,  premium: false },
  { label: 'AI Coach (unlimited)',    free: false, premium: true  },
  { label: 'AI Meal Scanner',         free: false, premium: true  },
  { label: 'Form Analyzer',           free: false, premium: true  },
  { label: 'GPS run tracking',        free: false, premium: true  },
  { label: 'Full macro tracking',     free: false, premium: true  },
  { label: '30-day analytics',        free: false, premium: true  },
];

interface WelcomeModalProps {
  onClose: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [view, setView] = useState<'welcome' | 'compare'>('welcome');

  const handleStayFree = () => {
    markWelcomeSeen();
    onClose();
  };

  const handleGoPremium = () => {
    markWelcomeSeen();
    onClose();
    navigate('/subscription');
  };

  const monthly = PLANS.find(p => p.id === 'monthly')!;
  const yearly  = PLANS.find(p => p.id === 'yearly')!;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[90vh]"
          initial={{ y: 60, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        >
          {/* Header gradient */}
          <div className="bg-gradient-to-br from-green-600/30 via-emerald-500/20 to-gray-900 px-6 pt-8 pb-6 text-center flex-shrink-0">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-white text-xl mb-1" style={{ fontWeight: 700 }}>
              Welcome to Fit Tracker <span className="text-green-400">PRO</span>
            </h2>
            <p className="text-gray-400 text-sm">
              Choose the plan that fits your goals
            </p>
          </div>

          {/* Tab toggle */}
          <div className="flex border-b border-gray-800 flex-shrink-0">
            {(['welcome', 'compare'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 py-3 text-sm transition-colors ${
                  view === v
                    ? 'text-green-400 border-b-2 border-green-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
                style={{ fontWeight: view === v ? 600 : 400 }}
              >
                {v === 'welcome' ? 'Plans' : 'Compare'}
              </button>
            ))}
          </div>

          <div className="px-6 py-5 overflow-y-auto flex-1">
            {view === 'welcome' ? (
              <>
                {/* Plan cards */}
                <div className="space-y-3 mb-5">
                  {/* Free card */}
                  <div className="bg-gray-800/60 border border-gray-700 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Star className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <span className="text-white text-sm" style={{ fontWeight: 600 }}>Free Plan</span>
                      </div>
                      <span className="text-gray-300 text-lg" style={{ fontWeight: 700 }}>$0</span>
                    </div>
                    <ul className="space-y-1.5">
                      {FREE_FEATURES.slice(0, 4).map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                          <Check className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                      <li className="flex items-center gap-2 text-xs text-gray-600">
                        <Lock className="w-3 h-3 flex-shrink-0" />
                        Advanced features locked
                      </li>
                    </ul>
                  </div>

                  {/* Premium plan selector */}
                  <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/5 border border-green-500/30 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-green-500/20 rounded-lg flex items-center justify-center">
                          <Crown className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="text-white text-sm" style={{ fontWeight: 600 }}>Premium</span>
                      </div>
                      {/* Plan toggle pills */}
                      <div className="flex bg-gray-800 rounded-full p-0.5 gap-0.5">
                        {(['monthly', 'yearly'] as const).map(p => (
                          <button
                            key={p}
                            onClick={() => setSelectedPlan(p)}
                            className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                              selectedPlan === p
                                ? 'bg-green-500 text-white'
                                : 'text-gray-400'
                            }`}
                            style={{ fontWeight: selectedPlan === p ? 600 : 400 }}
                          >
                            {p === 'monthly' ? 'Monthly' : 'Yearly'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Price display */}
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl text-white" style={{ fontWeight: 700 }}>
                        ${selectedPlan === 'monthly' ? monthly.price : yearly.price}
                      </span>
                      <span className="text-gray-400 text-sm">
                        /{selectedPlan === 'monthly' ? 'month' : 'year'}
                      </span>
                      {selectedPlan === 'yearly' && (
                        <span className="ml-2 bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full">
                          {yearly.savings}
                        </span>
                      )}
                    </div>
                    {selectedPlan === 'yearly' && (
                      <p className="text-green-400 text-xs mb-2">Just {yearly.perMonth}/month</p>
                    )}

                    <ul className="space-y-1.5">
                      {(selectedPlan === 'monthly' ? monthly : yearly).features.slice(0, 4).map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                          <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* CTAs */}
                <div className="space-y-2">
                  <motion.button
                    onClick={handleGoPremium}
                    className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors"
                    style={{ fontWeight: 600 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Crown className="w-4 h-4" />
                    Start Premium — ${selectedPlan === 'monthly' ? monthly.price + '/mo' : yearly.price + '/yr'}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  <button
                    onClick={handleStayFree}
                    className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors"
                  >
                    Continue with Free plan
                  </button>
                </div>
              </>
            ) : (
              /* Comparison view */
              <div className="space-y-1">
                {/* Header row */}
                <div className="grid grid-cols-3 gap-2 px-2 pb-2 border-b border-gray-800">
                  <span className="text-gray-500 text-xs">Feature</span>
                  <span className="text-gray-400 text-xs text-center">Free</span>
                  <span className="text-green-400 text-xs text-center">Premium</span>
                </div>
                {COMPARISON.map(row => (
                  <div key={row.label} className="grid grid-cols-3 gap-2 px-2 py-2 rounded-xl hover:bg-gray-800/50 transition-colors">
                    <span className="text-gray-300 text-xs">{row.label}</span>
                    <div className="flex justify-center">
                      {row.free ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex justify-center">
                      {row.premium ? (
                        <Check className="w-3.5 h-3.5 text-green-400" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-gray-600" />
                      )}
                    </div>
                  </div>
                ))}
                <div className="pt-3 space-y-2">
                  <motion.button
                    onClick={handleGoPremium}
                    className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3 text-sm transition-colors"
                    style={{ fontWeight: 600 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Upgrade to Premium
                  </motion.button>
                  <button onClick={handleStayFree} className="w-full text-gray-500 text-xs py-1.5">
                    No thanks, stay free
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
