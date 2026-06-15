// ============================================================
// Fit Tracker PRO — Root Application Entry Point
// Providers stacked:
//   AuthProvider       → JWT auth state
//   FreemiumProvider   → free/premium feature gates
//   RouterProvider     → React Router v7
// ============================================================
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { FreemiumProvider } from './context/FreemiumContext';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <FreemiumProvider>
        {/* Sonner toast notifications */}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1814',
              border: '1px solid #38332c',
              color: '#f9fafb',
            },
          }}
        />
        <RouterProvider router={router} />
      </FreemiumProvider>
    </AuthProvider>
  );
}