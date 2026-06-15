// ============================================================
// Fit Tracker PRO — Animated Dashboard (v2)
// Shows workout stats, progress charts, subscription status,
// today's recommended workout, AI habit insights, and quick actions.
// ============================================================
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import {
  Flame, Dumbbell, Clock, Zap, TrendingUp, ArrowRight,
  Target, Award, Plus, BarChart2, Activity,
  Footprints, Trophy, Bot, Share2, Gift,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workoutService } from '../../services/workoutService';
import { sessionService } from '../../services/progressService';
import { habitService } from '../../services/habitService';
import { stripeService } from '../../services/stripeService';
import ShareCardModal from '../shared/ShareCardModal';
import type { ShareCardData } from '../../services/shareCardService';
import type { Workout, DailyProgress, AIInsight, HabitStats } from '../../types';

// ─── Animated stat card ───────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
  delay?: number;
}
function StatCard({ icon: Icon, label, value, sub, color, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, borderColor: 'rgba(34,197,94,0.3)' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white text-xl mt-0.5" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{value}</p>
        {sub && <p className="text-green-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({
  active, payload, label,
}: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm">
        <p className="text-gray-400">{label}</p>
        <p className="text-green-400" style={{ fontWeight: 600 }}>{payload[0].value} cal</p>
      </div>
    );
  }
  return null;
}

// ─── Insight pill (compact) ───────────────────────────────────────────────────
function InsightPill({ insight }: { insight: AIInsight }) {
  const colors = {
    success: 'bg-green-500/10 border-green-500/25 text-green-400',
    warning: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
    tip:     'bg-blue-500/10 border-blue-500/25 text-blue-400',
    info:    'bg-purple-500/10 border-purple-500/25 text-purple-400',
  };
  return (
    <div className={`border rounded-xl px-3 py-2.5 ${colors[insight.type]}`}>
      <div className="flex items-start gap-2">
        <span className="text-base">{insight.icon}</span>
        <div className="min-w-0">
          <p className="text-xs" style={{ fontWeight: 600 }}>{insight.title}</p>
          <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{insight.message}</p>
          {insight.action && (
            <Link
              to={insight.action.route}
              className="inline-flex items-center gap-1 mt-1.5 text-xs hover:opacity-80 transition-opacity"
              style={{ fontWeight: 600 }}
            >
              {insight.action.label} <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Today's recommended workout pill ─────────────────────────────────────────
function TodayWorkout({ habits }: { habits: HabitStats | null }) {
  if (!habits) return null;

  // Determine recommended workout based on balance
  const { workoutBalance, daysSinceCardio, daysSinceFlexibility } = habits;
  let recommendation: { icon: React.ElementType; label: string; desc: string; category: string } =
    { icon: Dumbbell, label: 'Strength', desc: 'Build muscle today', category: 'strength' };

  if (daysSinceCardio !== null && daysSinceCardio >= 3) {
    recommendation = { icon: Footprints, label: 'Cardio', desc: 'Get your heart rate up', category: 'cardio' };
  } else if (daysSinceFlexibility !== null && daysSinceFlexibility >= 5) {
    recommendation = { icon: Activity, label: 'Yoga', desc: 'Time for recovery & mobility', category: 'yoga' };
  } else if (workoutBalance.cardio > workoutBalance.strength * 2) {
    recommendation = { icon: Dumbbell, label: 'Strength', desc: 'Balance your training', category: 'strength' };
  }

  const RecIcon = recommendation.icon;

  return (
    <Link
      to="/workout"
      className="flex items-center gap-4 bg-gradient-to-r from-green-500/15 to-emerald-500/5 border border-green-500/25 rounded-2xl p-4 hover:border-green-500/40 transition-colors group"
    >
      <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center flex-shrink-0">
        <RecIcon className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-400 text-xs">Recommended for today</p>
        <p className="text-white text-sm mt-0.5" style={{ fontWeight: 700 }}>{recommendation.label}</p>
        <p className="text-gray-400 text-xs">{recommendation.desc}</p>
      </div>
      <div className="flex items-center gap-1 bg-green-500 hover:bg-green-400 text-white px-3 py-2 rounded-xl text-xs transition-colors flex-shrink-0">
        <Plus className="w-3.5 h-3.5" />
        Start
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [progressData, setProgressData] = useState<DailyProgress[]>([]);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalCalories: 0, totalDuration: 0, streak: 0 });
  const [trialDays, setTrialDays] = useState<number | null>(null);
  const [habits, setHabits] = useState<HabitStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Legacy stats
    const data = workoutService.getStats(user.id);
    setStats({
      totalWorkouts: data.totalWorkouts,
      totalCalories: data.totalCalories,
      totalDuration: data.totalDuration,
      streak: data.streak,
    });
    setProgressData(data.progressData);
    setWorkouts(workoutService.getWorkouts(user.id).slice(0, 5));

    // Trial days
    if (user.subscription === 'trial' && user.trialStartDate) {
      setTrialDays(stripeService.getTrialDaysLeft(user.trialStartDate));
    }

    // Habit stats + AI insights
    const legacyWorkouts = workoutService.getWorkouts(user.id);
    const sessions = sessionService.getSessions(user.id);
    const totalWorkouts = legacyWorkouts.length + sessions.length;
    const habitStats = habitService.getHabitStats(user.id, legacyWorkouts, sessions, 4);
    setHabits(habitStats);
    setInsights(habitService.generateInsights(habitStats, totalWorkouts));
  }, [user]);

  // Combine sessions for activity display
  const sessions = useMemo(() => user ? sessionService.getSessions(user.id).slice(0, 3) : [], [user]);

  const chartData = progressData.slice(-14);
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  // ── Share card data for "Today's Progress" ──────────────────────────────
  const todayShareData: ShareCardData | null = useMemo(() => {
    if (!user) return null;
    const today = progressData[progressData.length - 1];
    const burned = today?.calories || 0;
    const workoutsToday = today?.workouts || 0;

    // Calories consumed today (from calorie tracker localStorage)
    const todayKey = new Date().toDateString();
    const foodEntries: { calories: number }[] = JSON.parse(
      localStorage.getItem(`fit_calories_${user.id}_${todayKey}`) || '[]'
    );
    const consumed = foodEntries.reduce((s, e) => s + e.calories, 0);

    return {
      kind: 'daily',
      heading: "Today's Progress",
      subheading: 'Daily Summary',
      userName: user.name,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      streak: stats.streak,
      stats: [
        { emoji: '🔥', value: `${burned}`, label: 'Cal Burned' },
        { emoji: '🍽️', value: `${consumed}`, label: 'Cal Eaten' },
        { emoji: '💪', value: `${workoutsToday}`, label: 'Workouts' },
        { emoji: '📅', value: `${stats.totalWorkouts}`, label: 'All-Time' },
      ],
    };
  }, [user, progressData, stats]);

  return (
    <div className="p-4 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {greeting}, <span className="text-green-400">{user?.name?.split(' ')[0]} 👋</span>
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={() => setShowShare(true)}
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-3 py-2.5 rounded-xl transition-colors text-sm"
            style={{ fontWeight: 600 }}
            title="Share today's progress"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <Link
            to="/workout"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Start Workout
          </Link>
        </div>
      </motion.div>

      {/* Trial banner */}
      {trialDays !== null && trialDays > 0 && (
        <motion.div
          className="bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center justify-between gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>
                Free Trial: <span className="text-yellow-400">{trialDays} days remaining</span>
              </p>
              <p className="text-gray-400 text-xs">Upgrade to Pro to keep all features after trial</p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-400 text-black px-3 py-1.5 rounded-xl text-xs transition-colors"
            style={{ fontWeight: 700 }}
          >
            Upgrade
          </Link>
        </motion.div>
      )}

      {/* Today's recommended workout */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <TodayWorkout habits={habits} />
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Dumbbell} label="Total Workouts" value={String(stats.totalWorkouts)} sub="+2 this week"   color="bg-blue-500"   delay={0.1}  />
        <StatCard icon={Flame}    label="Calories Burned" value={stats.totalCalories.toLocaleString()}            color="bg-orange-500" delay={0.15} sub="This month" />
        <StatCard icon={Clock}    label="Hours Trained"   value={`${Math.round(stats.totalDuration / 60)}h`}      color="bg-purple-500" delay={0.2}  sub="Total time" />
        <StatCard icon={Zap}      label="Current Streak"  value={`${stats.streak} days`}                          color="bg-green-600"  delay={0.25} sub={stats.streak >= 3 ? 'Keep it up!' : 'Start your streak!'} />
      </div>

      {/* AI Insights row */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm flex items-center gap-1.5" style={{ fontWeight: 600 }}>
              <Zap className="w-3.5 h-3.5 text-green-400" /> AI Insights
            </p>
            <Link to="/progress?tab=insights" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {insights.slice(0, 2).map(insight => (
              <InsightPill key={insight.id} insight={insight} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calories area chart */}
        <motion.div
          className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Calories Burned</h3>
              <p className="text-gray-500 text-xs">Last 14 days</p>
            </div>
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+12%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart id="dashboard-calories-chart" data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
              <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="calories" stroke="#5da831" strokeWidth={2} fill="#5da831" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Weekly bar chart */}
        <motion.div
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h3 className="text-white text-sm mb-0.5" style={{ fontWeight: 600 }}>Workouts / Day</h3>
          <p className="text-gray-500 text-xs mb-4">Last 7 days</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart id="dashboard-workouts-chart" data={progressData.slice(-7)} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
              <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#27241f', border: '1px solid #38332c', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
              />
              <Bar dataKey="workouts" fill="#5da831" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Workouts + Quick Actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent activity (combines legacy + sessions) */}
        <motion.div
          className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-sm" style={{ fontWeight: 600 }}>Recent Workouts</h3>
            <Link to="/workout" className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
              View all
            </Link>
          </div>
          <div className="space-y-2.5">
            {/* Show new sessions first */}
            {sessions.map((s, i) => (
              <motion.div
                key={s.id}
                className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 + i * 0.05 }}
              >
                <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{s.planName}</p>
                  <p className="text-gray-500 text-xs">
                    {s.exerciseLogs?.length || 0} exercises · {s.duration} min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 text-sm" style={{ fontWeight: 600 }}>{s.totalCalories} cal</p>
                  <p className="text-gray-600 text-xs">
                    {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {/* Fill remaining from legacy */}
            {workouts.slice(0, Math.max(0, 4 - sessions.length)).map((w, i) => (
              <motion.div
                key={w.id}
                className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl hover:bg-gray-800 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.42 + (sessions.length + i) * 0.05 }}
              >
                <div className="w-9 h-9 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{w.name}</p>
                  <p className="text-gray-500 text-xs">
                    {w.exercises.length} exercises · {w.duration} min
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-orange-400 text-sm" style={{ fontWeight: 600 }}>{w.calories} cal</p>
                  <p className="text-gray-600 text-xs">
                    {new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </motion.div>
            ))}
            {workouts.length === 0 && sessions.length === 0 && (
              <div className="text-center py-8">
                <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No workouts logged yet</p>
                <Link to="/workout" className="text-green-400 text-xs hover:text-green-300 mt-1 inline-block">
                  Start your first workout →
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h3 className="text-white text-sm mb-4" style={{ fontWeight: 600 }}>Quick Actions</h3>
          <div className="space-y-2.5">
            {[
              { to: '/workout',      icon: Dumbbell,  label: 'Start Workout', desc: 'AI-powered plans',      color: 'text-blue-400'   },
              { to: '/progress',     icon: BarChart2, label: 'View Progress', desc: 'Charts & insights',     color: 'text-green-400'  },
              { to: '/activity',     icon: Activity,  label: 'Track Run',     desc: 'GPS + step counter',    color: 'text-orange-400' },
              { to: '/calories',     icon: Flame,     label: 'Log Meal',      desc: 'Track nutrition',       color: 'text-red-400'    },
              { to: '/ai-trainer',   icon: Bot,       label: 'Ask AI Coach',  desc: 'Get personalised advice', color: 'text-purple-400' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 p-3 bg-gray-800/60 hover:bg-gray-800 rounded-xl transition-colors group"
              >
                <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm" style={{ fontWeight: 500 }}>{item.label}</p>
                  <p className="text-gray-500 text-xs">{item.desc}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 transition-colors" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Habit streak strip */}
      {habits && (
        <motion.div
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white text-sm flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                <Flame className="w-4 h-4 text-orange-400" /> Streak & Goals
              </h3>
              <p className="text-gray-500 text-xs">
                {habits.weeklyWorkouts}/{habits.weeklyGoal} workouts this week
              </p>
            </div>
            <Link to="/progress" className="text-gray-500 text-xs hover:text-gray-300 transition-colors flex items-center gap-1">
              Details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Mini stats row */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Current Streak', value: `${habits.currentStreak}d`, icon: Zap, color: 'text-green-400' },
              { label: 'Longest Streak', value: `${habits.longestStreak}d`, icon: Trophy, color: 'text-yellow-400' },
              { label: 'This Week',      value: `${habits.weeklyWorkouts}/${habits.weeklyGoal}`, icon: Target, color: 'text-blue-400' },
            ].map(item => (
              <div key={item.label} className="bg-gray-800/60 rounded-xl p-3 text-center">
                <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
                <p className="text-white text-sm" style={{ fontWeight: 700 }}>{item.value}</p>
                <p className="text-gray-500 text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Weekly goal bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Weekly goal progress</span>
              <span>{Math.round((habits.weeklyWorkouts / habits.weeklyGoal) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-green-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (habits.weeklyWorkouts / habits.weeklyGoal) * 100)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.55 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Share today's progress modal */}
      <AnimatePresence>
        {showShare && todayShareData && (
          <ShareCardModal data={todayShareData} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
