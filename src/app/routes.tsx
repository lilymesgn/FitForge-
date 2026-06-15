// ============================================================
// Fit Tracker PRO — React Router v7 Route Definitions
// Heavy pages (TensorFlow / Three.js) are React.lazy loaded
// so a single module failure never crashes the whole app.
// ============================================================
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// ── Lightweight pages: static imports ────────────────────────────────────────
import Dashboard from './components/dashboard/Dashboard';
import CalorieTrackerPage from './components/calories/CalorieTrackerPage';
import RunTrackerPage from './components/activity/RunTrackerPage';
import SubscriptionPage from './components/subscription/SubscriptionPage';
import UserProfile from './components/profile/UserProfile';
import ProgressPage from './components/progress/ProgressPage';

// ── Heavy pages: lazy-loaded to isolate TF.js / Three.js failures ─────────────
const LoginPage        = lazy(() => import('./components/auth/LoginPage'));
const SignupPage       = lazy(() => import('./components/auth/SignupPage'));
const MealScannerPage  = lazy(() => import('./components/meals/MealScannerPage'));
const FormAnalyzerPage = lazy(() => import('./components/form-analyzer/FormAnalyzerPage'));
const AITrainerChat    = lazy(() => import('./components/ai-trainer/AITrainerChat'));

// ── Medium pages: lazy-loaded for code splitting (no TF.js) ──────────────────
const WorkoutBuilderPage = lazy(() => import('./components/workout/WorkoutBuilderPage'));

// ── Shared fallback spinner ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ── Lazy-page wrapper ─────────────────────────────────────────────────────────
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageLoader />}>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  // ── Public routes ───────────────────────────────────────────────────────
  {
    path: '/login',
    element: <LazyPage><LoginPage /></LazyPage>,
  },
  {
    path: '/signup',
    element: <LazyPage><SignupPage /></LazyPage>,
  },

  // ── Protected routes (require authentication) ───────────────────────────
  {
    path: '/',
    Component: ProtectedRoute,
    children: [
      {
        // Layout wraps all protected pages with TopBar + BottomNav
        Component: Layout,
        children: [
          // Default redirect to dashboard
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard',     Component: Dashboard },
          { path: 'calories',      Component: CalorieTrackerPage },
          { path: 'activity',      Component: RunTrackerPage },
          { path: 'progress',      Component: ProgressPage },
          {
            path: 'workout',
            element: <LazyPage><WorkoutBuilderPage /></LazyPage>,
          },
          {
            path: 'meals',
            element: <LazyPage><MealScannerPage /></LazyPage>,
          },
          {
            path: 'form-analyzer',
            element: <LazyPage><FormAnalyzerPage /></LazyPage>,
          },
          {
            path: 'ai-trainer',
            element: <LazyPage><AITrainerChat /></LazyPage>,
          },
          { path: 'subscription',  Component: SubscriptionPage },
          { path: 'profile',       Component: UserProfile },
        ],
      },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: '*', element: <Navigate to="/login" replace /> },
]);
