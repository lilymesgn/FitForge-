// ============================================================
// Fit Tracker PRO — Sidebar Navigation
// ============================================================
import { NavLink, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, MessageSquare,
  CreditCard, User, LogOut, X, Zap, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/form-analyzer', icon: Dumbbell, label: 'Form Analyzer' },
  { to: '/meals', icon: UtensilsCrossed, label: 'Meal Scanner' },
  { to: '/ai-trainer', icon: MessageSquare, label: 'AI Trainer' },
  { to: '/subscription', icon: CreditCard, label: 'Subscription' },
  { to: '/profile', icon: User, label: 'Profile' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gray-950 border-r border-gray-800 w-64">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-white" style={{ fontWeight: 700 }}>
            Fit Tracker <span className="text-green-400">PRO</span>
          </span>
        </div>
        {/* Close button on mobile */}
        <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* User badge */}
      {user && (
        <div className="px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm" style={{ fontWeight: 600 }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{user.name}</p>
              <div className="flex items-center gap-1">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    user.subscription === 'active' ? 'bg-green-400' :
                    user.subscription === 'trial' ? 'bg-yellow-400' : 'bg-gray-500'
                  }`}
                />
                <span className="text-xs text-gray-500 capitalize">{user.subscription}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive
                  ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-gray-500 group-hover:text-white'}`} />
                <span className="text-sm" style={{ fontWeight: isActive ? 600 : 400 }}>{label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-green-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Subscription CTA (if trial) */}
      {user?.subscription === 'trial' && (
        <div className="mx-4 mb-3">
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/10 border border-green-500/20 rounded-xl p-3">
            <p className="text-xs text-green-400 mb-1" style={{ fontWeight: 600 }}>🎁 Trial Active</p>
            <p className="text-xs text-gray-400 mb-2">Upgrade to keep all features after trial ends</p>
            <NavLink
              to="/subscription"
              className="block text-center bg-green-500 hover:bg-green-400 text-white text-xs rounded-lg py-2 transition-colors"
            >
              Upgrade Now
            </NavLink>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Sign out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">{sidebarContent}</div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              className="fixed inset-y-0 left-0 z-50 lg:hidden"
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
