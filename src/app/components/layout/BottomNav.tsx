// ============================================================
// Fit Tracker PRO — Modern Bottom Navigation Bar (v2)
// Features:
//   • 5 primary tabs: Home, Workout, Progress, Activity, More
//   • Animated sliding pill indicator for active tab
//   • Scale + color transition on active icon
//   • Ripple/wave effect on tap
//   • "More" tab opens a slide-up drawer for remaining pages
// ============================================================
import { useState, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Dumbbell, BarChart2, Activity,
  MoreHorizontal, Flame, Bot, UtensilsCrossed,
  CreditCard, User, LogOut, Crown, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { useNavigate } from 'react-router';

// ─── Primary nav tabs (always visible) ───────────────────────────────────────
const PRIMARY_TABS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home'     },
  { to: '/workout',   icon: Dumbbell,        label: 'Workout'  },
  { to: '/progress',  icon: BarChart2,       label: 'Progress' },
  { to: '/activity',  icon: Activity,        label: 'Activity' },
];

// ─── Secondary nav (inside "More" drawer) ─────────────────────────────────────
const MORE_TABS = [
  { to: '/calories',      icon: Flame,           label: 'Calories',      premium: false },
  { to: '/ai-trainer',    icon: Bot,             label: 'AI Coach',      premium: false },
  { to: '/meals',         icon: UtensilsCrossed, label: 'Meal Scanner',  premium: true  },
  { to: '/subscription',  icon: CreditCard,      label: 'Subscription',  premium: false },
  { to: '/profile',       icon: User,            label: 'Profile',       premium: false },
];

// ─── Ripple component ─────────────────────────────────────────────────────────
function Ripple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      className="absolute rounded-full bg-green-400/20 pointer-events-none"
      style={{ left: x - 20, top: y - 20, width: 40, height: 40 }}
      initial={{ scale: 0, opacity: 0.8 }}
      animate={{ scale: 3.5, opacity: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  );
}

// ─── More Drawer ──────────────────────────────────────────────────────────────
function MoreDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { isPremium } = useFreemium();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700 rounded-t-3xl pt-2 overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

            <div className="px-4">
              <p className="text-gray-500 text-xs uppercase tracking-widest px-2 mb-3">
                More features
              </p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {MORE_TABS.map(({ to, icon: Icon, label, premium }) => {
                  const isLocked = premium && !isPremium;
                  const isActive = location.pathname === to;

                  return (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={onClose}
                      className={`relative flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-green-500/15 border-green-500/30 text-green-400'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isActive ? 'bg-green-500/20' : 'bg-gray-700'
                      }`}>
                        <Icon className={`w-4 h-4 ${isActive ? 'text-green-400' : 'text-gray-400'}`} />
                      </div>
                      <span className="text-sm" style={{ fontWeight: isActive ? 600 : 400 }}>
                        {label}
                      </span>
                      {isLocked && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-yellow-500/20 rounded-full flex items-center justify-center">
                          <Crown className="w-3 h-3 text-yellow-400" />
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>

              {/* Sign out */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Bottom Navigation Bar ────────────────────────────────────────────────────
export function BottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; tab: string }[]>([]);
  const rippleCounter = useRef(0);

  // Determine if "More" tab should be highlighted
  const moreRoutes = MORE_TABS.map(t => t.to);
  const isMoreActive = moreRoutes.some(r => location.pathname.startsWith(r));

  const addRipple = (e: React.MouseEvent, tab: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleCounter.current;
    setRipples(prev => [...prev, { id, x, y, tab }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  };

  return (
    <>
      <MoreDrawer isOpen={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">

          {/* Primary tabs */}
          {PRIMARY_TABS.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
            const tabRipples = ripples.filter(r => r.tab === to);

            return (
              <NavLink
                key={to}
                to={to}
                onClick={(e) => addRipple(e, to)}
                className="relative flex flex-col items-center justify-center flex-1 h-full py-2 overflow-hidden"
              >
                {/* Ripple effects */}
                {tabRipples.map(r => <Ripple key={r.id} x={r.x} y={r.y} />)}

                {/* Active background pill */}
                {isActive && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-x-1 top-1 bottom-1 bg-green-500/12 rounded-2xl border border-green-500/20"
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  />
                )}

                {/* Icon */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.12 : 1,
                    y: isActive ? -1 : 0,
                  }}
                  transition={{ type: 'spring', damping: 20, stiffness: 400 }}
                  className="relative z-10"
                >
                  <Icon
                    className={`w-5 h-5 transition-colors duration-200 ${
                      isActive ? 'text-green-400' : 'text-gray-500'
                    }`}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>

                {/* Label */}
                <motion.span
                  animate={{ opacity: isActive ? 1 : 0.6 }}
                  className={`text-[10px] mt-0.5 relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-green-400' : 'text-gray-500'
                  }`}
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {label}
                </motion.span>

                {/* Active dot */}
                {isActive && (
                  <motion.div
                    layoutId="active-dot"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-green-400 rounded-full"
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                  />
                )}
              </NavLink>
            );
          })}

          {/* "More" tab */}
          <button
            onClick={(e) => { addRipple(e, 'more'); setMoreOpen(true); }}
            className="relative flex flex-col items-center justify-center flex-1 h-full py-2 overflow-hidden"
          >
            {/* Ripple effects */}
            {ripples.filter(r => r.tab === 'more').map(r => <Ripple key={r.id} x={r.x} y={r.y} />)}

            {/* Active pill */}
            {isMoreActive && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-x-1 top-1 bottom-1 bg-green-500/12 rounded-2xl border border-green-500/20"
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              />
            )}

            <motion.div
              animate={{ scale: moreOpen || isMoreActive ? 1.12 : 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 400 }}
              className="relative z-10"
            >
              {moreOpen ? (
                <X className="w-5 h-5 text-green-400" strokeWidth={2.5} />
              ) : (
                <MoreHorizontal
                  className={`w-5 h-5 ${isMoreActive ? 'text-green-400' : 'text-gray-500'}`}
                  strokeWidth={isMoreActive ? 2.5 : 2}
                />
              )}
            </motion.div>

            <span
              className={`text-[10px] mt-0.5 relative z-10 ${
                isMoreActive || moreOpen ? 'text-green-400' : 'text-gray-500'
              }`}
              style={{ fontWeight: isMoreActive || moreOpen ? 600 : 400 }}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
