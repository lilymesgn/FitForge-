import { createClient } from '@supabase/supabase-js'

// Public env vars are exposed to the client via Vite's envPrefix (NEXT_PUBLIC_).
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) as string

if (!supabaseUrl || !supabaseAnonKey) {
  // Surfaced clearly during development if the integration env vars are missing.
  console.error(
    '[v0] Missing Supabase env vars. Expected NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Where Supabase should redirect after OAuth / email confirmation.
 * Uses the configured dev redirect URL when present, otherwise the current origin.
 */
export function getRedirectUrl(path = '/auth/callback'): string {
  const configured = import.meta.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL as
    | string
    | undefined
  const base = configured?.replace(/\/$/, '') || window.location.origin
  return `${base}${path}`
}
