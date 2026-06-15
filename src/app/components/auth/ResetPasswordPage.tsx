// ============================================================
// Fit Tracker PRO — Reset Password Page
// Reached after a user clicks the recovery link in their email.
// Supabase has already established a recovery session, so we can
// call updateUser({ password }) directly.
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Eye, EyeOff, Dumbbell, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    const result = await updatePassword(newPass);
    setIsLoading(false);
    if (result.success) {
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
    } else {
      setError(result.error || 'Could not update password.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <Dumbbell className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl text-white" style={{ fontWeight: 700 }}>
            Fit Tracker <span className="text-green-400">PRO</span>
          </span>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <p className="text-white text-sm" style={{ fontWeight: 600 }}>
              Password updated! Redirecting…
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-3xl text-white mb-2">Set a new password</h1>
            <p className="text-gray-400 mb-8">Choose a new password for your account.</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-2">New password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    required
                    placeholder="Min. 6 characters"
                    className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-12 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                  placeholder="Repeat password"
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
                {isLoading ? 'Updating…' : 'Set new password'}
              </motion.button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
