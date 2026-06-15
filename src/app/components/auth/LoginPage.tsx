// ============================================================
// Fit Tracker PRO — Login Page
// ============================================================
import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Dumbbell, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GoogleIcon } from './GoogleIcon';

const TransformationScene = lazy(() =>
  import('../three/TransformationScene').then(m => ({ default: m.TransformationScene }))
);

// ─── Forgot Password flow (Supabase email reset) ─────────────────────────────
function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [sent, setSent]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await requestPasswordReset(email);
    setIsLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || 'Could not send reset email.');
    }
  }

  return (
    <motion.div
      key="forgot"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.25 }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to sign in
      </button>

      <h2 className="text-2xl text-white mb-1" style={{ fontWeight: 700 }}>Reset password</h2>
      <p className="text-gray-400 text-sm mb-8">
        {sent
          ? 'Check your inbox for a reset link.'
          : 'Enter your account email and we\u2019ll send you a reset link.'}
      </p>

      {error && (
        <motion.div
          className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-5 text-sm"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.div>
      )}

      {sent ? (
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-white text-sm mb-6" style={{ fontWeight: 600 }}>
            Reset link sent to {email}
          </p>
          <button
            onClick={onBack}
            className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
            />
          </div>
          <motion.button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white rounded-xl py-3 text-sm transition-colors"
            style={{ fontWeight: 600 }}
            whileTap={{ scale: 0.98 }}
          >
            {isLoading ? 'Sending…' : 'Send reset link'}
          </motion.button>
        </form>
      )}
    </motion.div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    setIsLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error || 'Google sign in failed.');
    }
    // On success the browser redirects to Google, then back to /auth/callback.
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left: 3D Scene */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-gray-900" />}>
          <TransformationScene gender="male" isPlaying={false} className="absolute inset-0" />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-950/60 pointer-events-none" />
        <div className="absolute bottom-12 left-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-3xl text-white mb-2">Transform Your Body</h2>
            <p className="text-gray-400 max-w-xs">
              AI-powered fitness tracking, real-time form analysis, and personalised nutrition plans.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl text-white" style={{ fontWeight: 700 }}>
              Fit Tracker <span className="text-green-400">PRO</span>
            </span>
          </div>

          <AnimatePresence mode="wait">
            {showForgot ? (
              <ForgotPasswordForm key="forgot" onBack={() => setShowForgot(false)} />
            ) : (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <h1 className="text-3xl text-white mb-2">Welcome back</h1>
                <p className="text-gray-400 mb-8">Sign in to continue your fitness journey</p>

                {error && (
                  <motion.div
                    className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm text-gray-400">Password</label>
                      <button
                        type="button"
                        onClick={() => setShowForgot(true)}
                        className="text-xs text-green-400 hover:text-green-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                        className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Sign In
                      </>
                    )}
                  </motion.button>
                </form>

                <div className="flex items-center gap-3 my-6">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-xs text-gray-600">or</span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogle}
                  className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white rounded-xl py-3 flex items-center justify-center gap-3 transition-colors text-sm"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                <p className="text-center text-gray-500 mt-8 text-sm">
                  Don&apos;t have an account?{' '}
                  <Link to="/signup" className="text-green-400 hover:text-green-300 transition-colors">
                    Create one free
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
