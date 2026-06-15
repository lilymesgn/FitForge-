// ============================================================
// Fit Tracker PRO — Subscription Page
// Freemium model: Free plan + Premium Monthly ($4.99) + Yearly ($39.99)
// Shows plan options, trial countdown, and mock Stripe payment.
// Replace mock payment with real Stripe Checkout in production.
// ============================================================
import { CreditCard, Check, X, Clock, Zap, Shield, AlertTriangle, Crown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { stripeService, PLANS, type PlanId } from '../../services/stripeService';

function TrialCountdown({ days }: { days: number }) {
  const pct = (days / 7) * 100;
  return (
    <motion.div
      className="bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
          <Clock className="w-5 h-5 text-yellow-400" />
        </div>
        <div>
          <p className="text-white" style={{ fontWeight: 600 }}>Free Trial Active</p>
          <p className="text-gray-400 text-sm">No payment required yet</p>
        </div>
      </div>
      <div className="flex items-end gap-2 mb-3">
        <p className="text-5xl text-yellow-400" style={{ fontWeight: 700 }}>{days}</p>
        <p className="text-gray-400 mb-2">days remaining</p>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="text-gray-500 text-xs mt-2">
        Trial ends {new Date(Date.now() + days * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
      </p>
    </motion.div>
  );
}

interface MockCardFormProps {
  onSubmit: (details: Record<string, string>) => void;
  isLoading: boolean;
}
function MockCardForm({ onSubmit, isLoading }: MockCardFormProps) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [name, setName] = useState('');

  const formatCard = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };
  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-2">Cardholder Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Alex Johnson"
          className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-400 mb-2">Card Number</label>
        <div className="relative">
          <input
            type="text"
            value={cardNumber}
            onChange={e => setCardNumber(formatCard(e.target.value))}
            placeholder="4242 4242 4242 4242"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
          />
          <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Expiry</label>
          <input
            type="text"
            value={expiry}
            onChange={e => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/YY"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-2">CVC</label>
          <input
            type="text"
            value={cvc}
            onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="123"
            className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
          />
        </div>
      </div>
      <motion.button
        onClick={() => onSubmit({ cardNumber, expiry, cvc, name })}
        disabled={isLoading || !cardNumber || !expiry || !cvc || !name}
        className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
        whileTap={{ scale: 0.98 }}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Subscribe Securely
          </>
        )}
      </motion.button>
      <p className="text-xs text-gray-500 text-center">
        🔒 Secured by Stripe · 256-bit SSL encryption · Cancel anytime
      </p>
    </div>
  );
}

export default function SubscriptionPage() {
  const { user, updateUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [trialDays, setTrialDays] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.trialStartDate) {
      setTrialDays(stripeService.getTrialDaysLeft(user.trialStartDate));
    }
    const sub = stripeService.getSubscription(user.id);
    if (sub?.status === 'active') setIsSubscribed(true);
  }, [user]);

  const handleSubscribe = async (cardDetails: Record<string, string>) => {
    if (!user) return;
    setIsLoading(true);
    const result = await stripeService.subscribe(user.id, selectedPlan, cardDetails);
    setIsLoading(false);
    if (result.success) {
      updateUser({ subscription: 'active' });
      setIsSubscribed(true);
      setShowPayment(false);
      setSuccessMessage('🎉 Subscription activated! Welcome to Fit Tracker PRO!');
      setTimeout(() => setSuccessMessage(''), 5000);
    }
  };

  const handleCancel = async () => {
    if (!user) return;
    setIsLoading(true);
    await stripeService.cancelSubscription(user.id);
    setIsLoading(false);
    updateUser({ subscription: 'cancelled' });
    setIsSubscribed(false);
    setShowCancelConfirm(false);
  };

  const plan = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>💳 Subscription</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your Fit Tracker PRO membership</p>
      </motion.div>

      {/* Success message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl p-4 text-sm"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trial countdown */}
      {user?.subscription === 'trial' && trialDays > 0 && !isSubscribed && (
        <TrialCountdown days={trialDays} />
      )}

      {/* Subscribed status */}
      {isSubscribed && (
        <motion.div
          className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex items-center justify-between"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white" style={{ fontWeight: 700 }}>PRO Member</p>
              <p className="text-green-400 text-sm">All features unlocked · Active subscription</p>
            </div>
          </div>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-gray-500 hover:text-red-400 text-sm transition-colors"
          >
            Cancel plan
          </button>
        </motion.div>
      )}

      {/* Cancelled status */}
      {user?.subscription === 'cancelled' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 text-sm">Your subscription was cancelled. Resubscribe below to regain access.</p>
        </div>
      )}

      {!isSubscribed && (
        <>
          {/* Plan toggle */}
          <div className="grid md:grid-cols-2 gap-4">
            {PLANS.map(p => (
              <motion.button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-6 rounded-2xl border-2 text-left transition-all ${
                  selectedPlan === p.id
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white" style={{ fontWeight: 700 }}>{p.name}</p>
                    {p.id === 'yearly' && (
                      <span className="inline-block bg-orange-500/20 text-orange-400 text-xs px-2 py-0.5 rounded-full mt-1">
                        Save 37%
                      </span>
                    )}
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedPlan === p.id ? 'border-green-500 bg-green-500' : 'border-gray-600'
                  }`}>
                    {selectedPlan === p.id && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
                <p className="text-3xl text-white" style={{ fontWeight: 700 }}>
                  ${p.price}
                  <span className="text-gray-500 text-sm" style={{ fontWeight: 400 }}>/{p.period}</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.button>
            ))}
          </div>

          {/* Subscribe CTA */}
          {!showPayment ? (
            <motion.button
              onClick={() => setShowPayment(true)}
              className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
              style={{ fontWeight: 600 }}
              whileTap={{ scale: 0.98 }}
            >
              <Zap className="w-5 h-5" />
              Subscribe to {plan.name} — ${plan.price}/{plan.period}
            </motion.button>
          ) : (
            <AnimatePresence>
              <motion.div
                className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white" style={{ fontWeight: 700 }}>
                    Payment Details
                  </h3>
                  <button onClick={() => setShowPayment(false)} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 mb-6 flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{plan.name}</span>
                  <span className="text-white" style={{ fontWeight: 600 }}>${plan.price}/{plan.period}</span>
                </div>
                <MockCardForm onSubmit={handleSubscribe} isLoading={isLoading} />
              </motion.div>
            </AnimatePresence>
          )}
        </>
      )}

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {showCancelConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white text-center text-lg mb-2" style={{ fontWeight: 700 }}>Cancel Subscription?</h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                You'll lose access to all PRO features at the end of your billing period.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-white rounded-xl py-2.5 transition-colors text-sm"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl py-2.5 transition-colors text-sm"
                >
                  {isLoading ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}