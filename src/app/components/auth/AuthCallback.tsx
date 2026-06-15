// ============================================================
// Fit Tracker PRO — Auth Callback
// Handles the redirect from Google OAuth and password-recovery
// email links. Supabase parses the session from the URL, then
// we route the user appropriately.
// ============================================================
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const isRecovery = searchParams.get('type') === 'recovery';

    // Give Supabase a tick to parse the session from the URL hash.
    const timer = setTimeout(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError('We could not complete sign in. Please try again.');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      navigate(isRecovery ? '/reset-password' : '/dashboard', { replace: true });
    }, 600);

    return () => clearTimeout(timer);
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}
