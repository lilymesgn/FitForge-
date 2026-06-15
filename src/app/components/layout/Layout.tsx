// ============================================================
// Fit Tracker PRO — App Layout (Top Bar + Bottom Navigation)
// ============================================================
import { useState, useEffect, useRef, useMemo } from 'react';
import { Outlet, Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Search, Zap, LayoutDashboard, Dumbbell, Activity,
  Flame, BarChart2, Bot, ScanLine, CreditCard, User, X,
  BellOff, BellRing, ChevronRight,
} from 'lucide-react';
import { BottomNav } from './BottomNav';
import { WelcomeModal, shouldShowWelcome } from '../subscription/WelcomeModal';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notificationService';
import { workoutService } from '../../services/workoutService';
import { sessionService } from '../../services/progressService';
import { habitService } from '../../services/habitService';

// ─── Searchable pages / actions ───────────────────────────────────────────────
const SEARCH_ITEMS = [
  { label: 'Dashboard',       path: '/dashboard',     icon: LayoutDashboard, desc: 'Home overview' },
  { label: 'Start Workout',   path: '/workout',       icon: Dumbbell,        desc: 'AI-powered plans' },
  { label: 'Track Activity',  path: '/activity',      icon: Activity,        desc: 'GPS run & step counter' },
  { label: 'Log Calories',    path: '/calories',      icon: Flame,           desc: 'Track nutrition' },
  { label: 'View Progress',   path: '/progress',      icon: BarChart2,       desc: 'Charts & insights' },
  { label: 'AI Coach',        path: '/ai-trainer',    icon: Bot,             desc: 'Personalised advice' },
  { label: 'Meal Scanner',    path: '/meals',         icon: ScanLine,        desc: 'Scan food with camera' },
  { label: 'Subscription',    path: '/subscription',  icon: CreditCard,      desc: 'Plans & billing' },
  { label: 'Profile',         path: '/profile',       icon: User,            desc: 'Edit your info' },
];

// ─── Notification panel ───────────────────────────────────────────────────────
export interface LiveAlert {
  icon: string;
  title: string;
  body: string;
}

function NotificationPanel({
  granted,
  alerts,
  onRequestPermission,
  onClose,
}: {
  granted: boolean;
  alerts: LiveAlert[];
  onRequestPermission: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="absolute top-12 right-0 w-[min(20rem,calc(100vw-2rem))] bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <p className="text-white text-sm" style={{ fontWeight: 700 }}>Notifications</p>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!granted && (
        <div className="p-5 text-center border-b border-gray-800">
          <BellOff className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-300 text-sm mb-1" style={{ fontWeight: 600 }}>Notifications are off</p>
          <p className="text-gray-500 text-xs mb-4">Enable them to get workout reminders and streak alerts.</p>
          <button
            onClick={onRequestPermission}
            className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-2.5 text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <BellRing className="w-3.5 h-3.5 inline mr-1.5" />
            Enable Notifications
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-gray-600 text-xs">You're all caught up 🎉</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-800">
          {alerts.map((n, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors">
              <span className="text-lg mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-gray-200 text-xs" style={{ fontWeight: 600 }}>{n.title}</p>
                <p className="text-gray-500 text-xs mt-0.5">{n.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [showWelcome, setShowWelcome]     = useState(false);
  const [notifGranted, setNotifGranted]   = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [searchQuery, setSearchQuery]     = useState('');
  const [showSearch, setShowSearch]       = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const searchRef   = useRef<HTMLDivElement>(null);
  const notifRef    = useRef<HTMLDivElement>(null);

  // ── On mount ──────────────────────────────────────────────────────────────
  useEffect(() => {
    notificationService.requestPermission().then(granted => setNotifGranted(granted));
    if (shouldShowWelcome()) {
      const t = setTimeout(() => setShowWelcome(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  // ── Compute today's activity status (used for reminders + alert panel) ─────
  const todayStatus = useMemo(() => {
    if (!user) return { loggedMealsToday: false, workedOutToday: false, streak: 0, weeklyWorkouts: 0, weeklyGoal: 4 };

    const todayKey = new Date().toDateString();
    const foodEntries: unknown[] = JSON.parse(localStorage.getItem(`fit_calories_${user.id}_${todayKey}`) || '[]');

    const legacyWorkouts = workoutService.getWorkouts(user.id);
    const sessions = sessionService.getSessions(user.id);
    const workedOutToday =
      legacyWorkouts.some(w => new Date(w.date).toDateString() === todayKey) ||
      sessions.some(s => new Date(s.startTime).toDateString() === todayKey);

    const stats = workoutService.getStats(user.id);
    const habits = habitService.getHabitStats(user.id, legacyWorkouts, sessions, 4);

    return {
      loggedMealsToday: foodEntries.length > 0,
      workedOutToday,
      streak: stats.streak,
      weeklyWorkouts: habits.weeklyWorkouts,
      weeklyGoal: habits.weeklyGoal,
    };
  }, [user, showNotifPanel]); // re-derive when panel opens so it's fresh

  // ── Live alerts for the notification panel ─────────────────────────────────
  const liveAlerts: LiveAlert[] = useMemo(() => {
    if (!user) return [];
    const alerts: LiveAlert[] = [];
    const hour = new Date().getHours();

    if (!todayStatus.workedOutToday) {
      if (todayStatus.streak > 0 && hour >= 17) {
        alerts.push({
          icon: '🔥',
          title: 'Streak at risk!',
          body: `Log a session today to keep your ${todayStatus.streak}-day streak alive.`,
        });
      } else {
        alerts.push({
          icon: '🏋️',
          title: 'Workout reminder',
          body: "You haven't logged a workout today.",
        });
      }
    }

    if (!todayStatus.loggedMealsToday && hour >= 12) {
      alerts.push({
        icon: '🍽️',
        title: 'Log your meals',
        body: "You haven't tracked any food today — keep your nutrition data complete.",
      });
    }

    if (todayStatus.weeklyWorkouts < todayStatus.weeklyGoal) {
      const remaining = todayStatus.weeklyGoal - todayStatus.weeklyWorkouts;
      alerts.push({
        icon: '🎯',
        title: 'Weekly goal',
        body: `You're ${remaining} session${remaining === 1 ? '' : 's'} away from your weekly goal.`,
      });
    }

    return alerts;
  }, [user, todayStatus]);

  // ── Reminder check: on load, every minute, and when tab becomes visible ────
  useEffect(() => {
    if (!user) return;

    const check = () => {
      const todayKey = new Date().toDateString();
      const foodEntries: unknown[] = JSON.parse(localStorage.getItem(`fit_calories_${user.id}_${todayKey}`) || '[]');
      const legacyWorkouts = workoutService.getWorkouts(user.id);
      const sessions = sessionService.getSessions(user.id);
      const workedOutToday =
        legacyWorkouts.some(w => new Date(w.date).toDateString() === todayKey) ||
        sessions.some(s => new Date(s.startTime).toDateString() === todayKey);

      notificationService.checkAndFireReminders(user.id, {
        loggedMealsToday: foodEntries.length > 0,
        workedOutToday,
      });
    };

    check(); // run once on mount

    const interval = setInterval(check, 60_000); // every minute

    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user]);

  // ── Close dropdowns on outside click ────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ── Filtered search results ──────────────────────────────────────────────
  const searchResults = searchQuery.trim().length > 0
    ? SEARCH_ITEMS.filter(item =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.desc.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : SEARCH_ITEMS;

  function handleSearchSelect(path: string) {
    navigate(path);
    setSearchQuery('');
    setShowSearch(false);
  }

  async function handleBellClick() {
    if (!notifGranted) {
      const granted = await notificationService.requestPermission();
      setNotifGranted(granted);
      if (!granted) {
        setShowNotifPanel(true);
      } else {
        setShowNotifPanel(true);
      }
    } else {
      setShowNotifPanel(prev => !prev);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 overflow-hidden">
      {/* ── Compact Top Bar ──────────────────────────────────────────────────── */}
      <header
        className="bg-gray-950/95 backdrop-blur-xl border-b border-gray-800/60 flex-shrink-0 z-20"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="h-14 flex items-center px-4 gap-3">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white hidden sm:block" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>
            Fit Tracker <span className="text-green-400">PRO</span>
          </span>
        </Link>

        {/* Search bar (desktop) */}
        <div className="flex-1 max-w-xs relative hidden sm:block" ref={searchRef}>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
            onFocus={() => setShowSearch(true)}
            placeholder="Search pages & actions…"
            className="w-full bg-gray-900 border border-gray-800 text-gray-300 rounded-xl pl-9 pr-3 py-1.5 text-sm outline-none focus:border-green-500 transition-colors placeholder-gray-600"
          />
          <AnimatePresence>
            {showSearch && (
              <motion.div
                className="absolute top-full mt-2 left-0 w-72 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                {searchResults.length === 0 ? (
                  <div className="px-4 py-5 text-center text-gray-500 text-sm">No results found</div>
                ) : (
                  <div className="py-1.5 max-h-72 overflow-y-auto">
                    {searchResults.map(item => (
                      <button
                        key={item.path}
                        onClick={() => handleSearchSelect(item.path)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="w-7 h-7 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                          <item.icon className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-xs" style={{ fontWeight: 600 }}>{item.label}</p>
                          <p className="text-gray-500 text-[11px]">{item.desc}</p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile spacer pushes actions to the right when search is hidden */}
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-2">
          {/* Mobile search trigger */}
          <motion.button
            onClick={() => setShowMobileSearch(true)}
            className="sm:hidden w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            whileTap={{ scale: 0.9 }}
            title="Search"
          >
            <Search className="w-4 h-4" />
          </motion.button>

          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <motion.button
              onClick={handleBellClick}
              className="relative w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              whileTap={{ scale: 0.9 }}
              title={notifGranted ? 'Notifications' : 'Enable notifications'}
            >
              <Bell className="w-4 h-4" />
              <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                liveAlerts.length > 0 ? 'bg-orange-400' : notifGranted ? 'bg-green-400' : 'bg-gray-600'
              }`} />
            </motion.button>

            <AnimatePresence>
              {showNotifPanel && (
                <NotificationPanel
                  granted={notifGranted}
                  alerts={liveAlerts}
                  onRequestPermission={async () => {
                    const granted = await notificationService.requestPermission();
                    setNotifGranted(granted);
                  }}
                  onClose={() => setShowNotifPanel(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* User avatar */}
          {user && (
            <Link to="/profile">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-700 rounded-xl flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity">
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
            </Link>
          )}
        </div>
        </div>
      </header>

      {/* ── Mobile Search Overlay ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showMobileSearch && (
          <motion.div
            className="fixed inset-0 bg-gray-950 z-50 flex flex-col sm:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-800/60 flex-shrink-0">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search pages & actions…"
                  className="w-full bg-gray-900 border border-gray-800 text-gray-300 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                />
              </div>
              <button
                onClick={() => { setShowMobileSearch(false); setSearchQuery(''); }}
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">No results found</div>
              ) : (
                <div className="py-1.5">
                  {searchResults.map(item => (
                    <button
                      key={item.path}
                      onClick={() => { handleSearchSelect(item.path); setShowMobileSearch(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-800/60 active:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-200 text-sm" style={{ fontWeight: 600 }}>{item.label}</p>
                        <p className="text-gray-500 text-xs">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Scrollable page content ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <motion.div
          className="min-h-full"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Outlet />
        </motion.div>
      </main>

      {/* ── Bottom Navigation ──────────────────────────────────────────────────── */}
      <BottomNav />

      {/* ── Welcome / Plan Selection Modal ─────────────────────────────────────── */}
      {showWelcome && (
        <WelcomeModal onClose={() => setShowWelcome(false)} />
      )}
    </div>
  );
}
