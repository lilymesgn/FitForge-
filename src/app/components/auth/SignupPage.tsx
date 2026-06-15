// ============================================================
// Fit Tracker PRO — Sign Up Page
// New user registration with 3D transformation animation
// triggered on successful sign-up.
// Three.js scene is lazy-loaded to isolate WebGL failures.
// ============================================================
import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Dumbbell, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { Gender, FitnessGoal } from '../../types';

// Lazy-load the heavy Three.js scene
const TransformationScene = lazy(() =>
  import('../three/TransformationScene').then(m => ({ default: m.TransformationScene }))
);

const GOALS: { id: FitnessGoal; label: string; emoji: string }[] = [
  { id: 'lose_weight', label: 'Lose Weight', emoji: '🔥' },
  { id: 'build_muscle', label: 'Build Muscle', emoji: '💪' },
  { id: 'get_fit', label: 'Get Fit', emoji: '⚡' },
  { id: 'improve_endurance', label: 'Endurance', emoji: '🏃' },
];

export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: account info, 2: profile, 3: transformation animation
  const [gender, setGender] = useState<Gender>('male');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [goal, setGoal] = useState<FitnessGoal>('get_fit');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setStep(2);
  };

  const handleSignup = async () => {
    setError('');
    setIsLoading(true);
    const result = await signup({ name, email, password, gender, goal });
    setIsLoading(false);
    if (result.success) {
      // Show transformation animation before redirecting
      setStep(3);
      setIsPlaying(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 5500);
    } else {
      setError(result.error || 'Signup failed.');
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Left: 3D Scene */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-gray-950/50 pointer-events-none" />}>
          <TransformationScene gender={gender} isPlaying={isPlaying} className="absolute inset-0" />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-950/50 pointer-events-none" />
        {step === 3 && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="text-6xl mb-4"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              >
                🔥
              </motion.div>
              <h2 className="text-3xl text-white mb-2">Your transformation</h2>
              <h2 className="text-3xl text-green-400">starts NOW!</h2>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right: Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl text-white" style={{ fontWeight: 700 }}>
              Fit Tracker <span className="text-green-400">PRO</span>
            </span>
          </div>

          {/* Progress Steps */}
          {step < 3 && (
            <div className="flex items-center gap-3 mb-8">
              {[1, 2].map(s => (
                <div key={s} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${
                      step > s
                        ? 'bg-green-500 text-white'
                        : step === s
                        ? 'bg-green-500/20 border-2 border-green-500 text-green-400'
                        : 'bg-gray-800 text-gray-600'
                    }`}
                  >
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 2 && <div className={`h-px w-16 ${step > s ? 'bg-green-500' : 'bg-gray-700'}`} />}
                </div>
              ))}
              <span className="ml-2 text-sm text-gray-500">Step {step} of 2</span>
            </div>
          )}

          {/* ── Step 3: Transformation ── */}
          <AnimatePresence mode="wait">
            {step === 3 && (
              <motion.div
                key="step3"
                className="text-center py-12"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="text-7xl mb-6">🚀</div>
                <h2 className="text-3xl text-white mb-3">Welcome, {name}!</h2>
                <p className="text-gray-400 mb-6">
                  Watch your transformation begin. Your 7-day free trial is active!
                </p>
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-gray-600 mt-4">Redirecting to your dashboard...</p>
              </motion.div>
            )}

            {/* ── Step 1: Account Info ── */}
            {step === 1 && (
              <motion.form
                key="step1"
                onSubmit={handleStep1}
                className="space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div>
                  <h1 className="text-3xl text-white mb-1">Create account</h1>
                  <p className="text-gray-400 mb-6 text-sm">7-day free trial. No card required today.</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    placeholder="Alex Johnson"
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                </div>

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
                  <label className="block text-sm text-gray-400 mb-2">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      placeholder="Min. 6 characters"
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

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Confirm password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                </div>

                <motion.button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                  whileTap={{ scale: 0.98 }}
                >
                  Continue <ChevronRight className="w-4 h-4" />
                </motion.button>

                <p className="text-center text-gray-500 text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-green-400 hover:text-green-300">Sign in</Link>
                </p>
              </motion.form>
            )}

            {/* ── Step 2: Profile Setup ── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h1 className="text-3xl text-white mb-1">Your profile</h1>
                  <p className="text-gray-400 text-sm">Help us personalize your experience</p>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-3 text-sm">
                    {error}
                  </div>
                )}

                {/* Gender Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3">I am a...</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['male', 'female'] as Gender[]).map(g => (
                      <motion.button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                          gender === g
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="text-3xl">{g === 'male' ? '👨' : '👩'}</span>
                        <span className={`text-sm capitalize ${gender === g ? 'text-green-400' : 'text-gray-400'}`}>
                          {g}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Goal Selection */}
                <div>
                  <label className="block text-sm text-gray-400 mb-3">Primary goal</label>
                  <div className="grid grid-cols-2 gap-3">
                    {GOALS.map(g => (
                      <motion.button
                        key={g.id}
                        type="button"
                        onClick={() => setGoal(g.id)}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-all text-left ${
                          goal === g.id
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-gray-700 bg-gray-900 hover:border-gray-500'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="text-xl">{g.emoji}</span>
                        <span className={`text-xs ${goal === g.id ? 'text-green-400' : 'text-gray-400'}`}>
                          {g.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-3 transition-colors"
                  >
                    Back
                  </button>
                  <motion.button
                    type="button"
                    onClick={handleSignup}
                    disabled={isLoading}
                    className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      '🚀 Start Transformation!'
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}