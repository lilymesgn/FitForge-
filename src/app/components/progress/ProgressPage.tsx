// ============================================================
// Fit Tracker PRO — Progress Page
// Shows comprehensive fitness progress including:
//   • Weight trend chart (line)
//   • Workout consistency calendar heat-map
//   • Personal records (PRs) with exercise breakdown
//   • Strength progress per exercise (line chart)
//   • Category balance (radar/pie)
//   • AI habit insights
//   • Body measurement logger
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Trophy, Dumbbell, Flame, Clock, Zap, TrendingUp,
  TrendingDown, Scale, Calendar, Plus, X, ChevronRight,
  Activity, Target, Award, Star, BarChart2,
  CalendarDays, PieChart as PieChartIcon, Package, ClipboardList, Stethoscope,
} from 'lucide-react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { workoutService } from '../../services/workoutService';
import { sessionService, prService, measurementService } from '../../services/progressService';
import { habitService } from '../../services/habitService';
import type { PersonalRecord, BodyMeasurement, AIInsight, HabitStats } from '../../types';

// ─── Tab definitions ──────────────────────────────────────────────────────────
type Tab = 'overview' | 'strength' | 'body' | 'records' | 'insights';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',  label: 'Overview',  icon: BarChart2 },
  { id: 'strength',  label: 'Strength',  icon: Dumbbell  },
  { id: 'body',      label: 'Body',      icon: Scale     },
  { id: 'records',   label: 'Records',   icon: Trophy    },
  { id: 'insights',  label: 'Insights',  icon: Zap       },
];

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLORS = {
  strength:    '#1e9fb3',
  cardio:      '#e8633a',
  flexibility: '#a855f7',
  sports:      '#ef4444',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color, delay = 0,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  color: string; delay?: number;
}) {
  return (
    <motion.div
      className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-gray-400 text-xs">{label}</p>
        <p className="text-white text-xl mt-0.5" style={{ fontWeight: 700 }}>{value}</p>
        {sub && <p className="text-green-400 text-xs mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <h3 className="text-white text-sm mb-3 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
      {Icon && <Icon className="w-4 h-4 text-green-400 flex-shrink-0" />}
      {children}
    </h3>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({
  active, payload, label, suffix = '',
}: {
  active?: boolean; payload?: { value: number; name?: string }[]; label?: string; suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-xs space-y-1">
      <p className="text-gray-400">{label}</p>
      {payload.map((p, i) => (
        <p key={`${p.name ?? ''}-${i}`} className="text-green-400" style={{ fontWeight: 600 }}>
          {p.value}{suffix}
          {p.name && <span className="text-gray-400 ml-1">({p.name})</span>}
        </p>
      ))}
    </div>
  );
}

// ─── Streak dots (7-day heatmap) ──────────────────────────────────────────────
function WeekStrip({ sessions }: { sessions: { startTime: string }[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toDateString();
    const hasWorkout = sessions.some(s => new Date(s.startTime).toDateString() === ds);
    const isToday = i === 6;
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0), hasWorkout, isToday };
  });
  return (
    <div className="flex gap-2 justify-center">
      {days.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <motion.div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              d.hasWorkout
                ? 'bg-green-500'
                : d.isToday
                ? 'bg-gray-700 border border-gray-600'
                : 'bg-gray-800'
            }`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            {d.hasWorkout && <Flame className="w-3.5 h-3.5 text-white" />}
          </motion.div>
          <span className="text-gray-500 text-[10px]">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ insight }: { insight: AIInsight }) {
  const borderColors = {
    success: 'border-green-500/30 bg-green-500/5',
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    tip:     'border-blue-500/30 bg-blue-500/5',
    info:    'border-purple-500/30 bg-purple-500/5',
  };
  const textColors = {
    success: 'text-green-400',
    warning: 'text-yellow-400',
    tip:     'text-blue-400',
    info:    'text-purple-400',
  };
  return (
    <motion.div
      className={`border rounded-2xl p-4 ${borderColors[insight.type]}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{insight.icon}</span>
        <div className="flex-1">
          <p className={`text-sm ${textColors[insight.type]}`} style={{ fontWeight: 600 }}>
            {insight.title}
          </p>
          <p className="text-gray-400 text-xs mt-1 leading-relaxed">{insight.message}</p>
          {insight.action && (
            <Link
              to={insight.action.route}
              className={`mt-2 inline-flex items-center gap-1 text-xs ${textColors[insight.type]} hover:opacity-80 transition-opacity`}
              style={{ fontWeight: 600 }}
            >
              {insight.action.label} <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Measurement Modal ────────────────────────────────────────────────────
function AddMeasurementModal({
  userId,
  onClose,
  onSave,
}: {
  userId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [chest, setChest] = useState('');
  const [waist, setWaist] = useState('');
  const [hips, setHips] = useState('');
  const [arms, setArms] = useState('');

  const handleSave = () => {
    if (!weight && !bodyFat) return;
    measurementService.saveMeasurement({
      userId,
      date: new Date().toISOString(),
      weight:  weight  ? parseFloat(weight)  : undefined,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      chest:   chest   ? parseFloat(chest)   : undefined,
      waist:   waist   ? parseFloat(waist)   : undefined,
      hips:    hips    ? parseFloat(hips)    : undefined,
      arms:    arms    ? parseFloat(arms)    : undefined,
    });
    onSave();
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-gray-900 border border-gray-700 rounded-3xl p-6 w-full max-w-sm"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white" style={{ fontWeight: 700 }}>Log Body Metrics</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {[
            { label: 'Weight (kg)', value: weight, onChange: setWeight, placeholder: 'e.g. 75.5' },
            { label: 'Body Fat (%)', value: bodyFat, onChange: setBodyFat, placeholder: 'e.g. 18' },
            { label: 'Chest (cm)', value: chest, onChange: setChest, placeholder: 'e.g. 100' },
            { label: 'Waist (cm)', value: waist, onChange: setWaist, placeholder: 'e.g. 82' },
            { label: 'Hips (cm)', value: hips, onChange: setHips, placeholder: 'e.g. 96' },
            { label: 'Arms (cm)', value: arms, onChange: setArms, placeholder: 'e.g. 36' },
          ].map(field => (
            <div key={field.label}>
              <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
              <input
                type="number"
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 transition-colors placeholder-gray-600"
              />
            </div>
          ))}
        </div>

        <motion.button
          onClick={handleSave}
          className="mt-5 w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 text-sm transition-colors"
          style={{ fontWeight: 700 }}
          whileTap={{ scale: 0.97 }}
        >
          Save Metrics
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ProgressPage ────────────────────────────────────────────────────────
export default function ProgressPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showAddMeasurement, setShowAddMeasurement] = useState(false);
  const [habits, setHabits] = useState<HabitStats | null>(null);
  const [insights, setInsights] = useState<AIInsight[]>([]);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const legacyWorkouts = workoutService.getWorkouts(user.id);
    const sessions = sessionService.getSessions(user.id);
    const totalWorkouts = legacyWorkouts.length + sessions.length;

    setPrs(prService.getRecentPRs(user.id, 20));
    setMeasurements(measurementService.getMeasurements(user.id));

    const habitStats = habitService.getHabitStats(user.id, legacyWorkouts, sessions, 4);
    setHabits(habitStats);
    setInsights(habitService.generateInsights(habitStats, totalWorkouts));
  }, [user]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const sessions = useMemo(() => user ? sessionService.getSessions(user.id) : [], [user]);
  const legacyWorkouts = useMemo(() => user ? workoutService.getWorkouts(user.id) : [], [user]);

  const stats = useMemo(() => {
    const allWorkouts = [...legacyWorkouts, ...sessions];
    const totalCalories = legacyWorkouts.reduce((s, w) => s + w.calories, 0) +
                          sessions.reduce((s, w) => s + w.totalCalories, 0);
    const totalMinutes = legacyWorkouts.reduce((s, w) => s + w.duration, 0) +
                         sessions.reduce((s, w) => s + w.duration, 0);
    return {
      totalWorkouts: allWorkouts.length,
      totalCalories,
      totalMinutes,
      streak: habits?.currentStreak ?? 0,
    };
  }, [legacyWorkouts, sessions, habits]);

  // Last 14 days workout frequency
  const frequencyData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      const ds = d.toDateString();
      const count = [
        ...legacyWorkouts.filter(w => new Date(w.date).toDateString() === ds),
        ...sessions.filter(s => new Date(s.startTime).toDateString() === ds),
      ].length;
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workouts: count,
      };
    });
  }, [legacyWorkouts, sessions]);

  // Weight trend (from measurements)
  const weightData = useMemo(() =>
    measurementService.getWeightTrend(user?.id || '', 12),
    [measurements, user]
  );

  // Category balance
  const balanceData = useMemo(() => {
    if (!habits) return [];
    return Object.entries(habits.workoutBalance)
      .filter(([, v]) => v > 0)
      .map(([cat, val]) => ({
        name: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: val,
        color: CAT_COLORS[cat as keyof typeof CAT_COLORS] || '#7c7468',
      }));
  }, [habits]);

  // Radar data for fitness attributes
  const radarData = useMemo(() => [
    { attr: 'Strength',    value: Math.min(100, (habits?.workoutBalance.strength || 0) * 15) },
    { attr: 'Cardio',      value: Math.min(100, (habits?.workoutBalance.cardio || 0) * 18) },
    { attr: 'Flexibility', value: Math.min(100, (habits?.workoutBalance.flexibility || 0) * 22) },
    { attr: 'Consistency', value: Math.min(100, (habits?.currentStreak || 0) * 12) },
    { attr: 'Volume',      value: Math.min(100, Math.round((stats.totalMinutes / 60) * 5)) },
    { attr: 'Balance',     value: balanceData.length >= 3 ? 75 : 40 },
  ], [habits, stats, balanceData]);

  // Strength progress (bench press as default)
  const [selectedExercise, setSelectedExercise] = useState('Bench Press');
  const strengthData = useMemo(
    () => sessionService.getStrengthProgress(user?.id || '', selectedExercise),
    [selectedExercise, sessions, user]
  );

  // All logged exercise names for exercise selector
  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach(s =>
      s.exerciseLogs?.forEach(l => names.add(l.exerciseName))
    );
    return Array.from(names).sort();
  }, [sessions]);

  if (!user) return null;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl text-white" style={{ fontWeight: 800 }}>📊 Progress</h1>
          <p className="text-gray-400 text-sm mt-0.5">Track your fitness journey</p>
        </div>
        <motion.button
          onClick={() => setShowAddMeasurement(true)}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-400 text-white px-3 py-2 rounded-xl text-xs transition-colors"
          style={{ fontWeight: 600 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-3.5 h-3.5" /> Log Body
        </motion.button>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1.5 bg-gray-900 border border-gray-800 p-1 rounded-2xl overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap flex-shrink-0 transition-all ${
              tab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
            style={{ fontWeight: tab === id ? 700 : 400 }}
          >
            {tab === id && (
              <motion.div
                layoutId="tab-pill"
                className="absolute inset-0 bg-green-500/20 border border-green-500/30 rounded-xl"
                transition={{ type: 'spring', damping: 28, stiffness: 380 }}
              />
            )}
            <Icon className={`w-3.5 h-3.5 relative z-10 ${tab === id ? 'text-green-400' : ''}`} />
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {tab === 'overview' && (
          <motion.div
            key="overview"
            className="space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Dumbbell} label="Total Workouts" value={String(stats.totalWorkouts)}  color="bg-blue-500"   delay={0.05} />
              <StatCard icon={Flame}    label="Calories Burned" value={`${(stats.totalCalories / 1000).toFixed(1)}k`} color="bg-orange-500" delay={0.1} />
              <StatCard icon={Clock}    label="Hours Trained"   value={`${Math.round(stats.totalMinutes / 60)}h`}      color="bg-purple-500" delay={0.15} />
              <StatCard icon={Zap}      label="Current Streak"  value={`${stats.streak} days`}                         color="bg-green-600"  delay={0.2} sub={stats.streak >= 3 ? '🔥 On fire!' : undefined} />
            </div>

            {/* Weekly consistency strip */}
            <motion.div
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <SectionTitle icon={CalendarDays}>This Week</SectionTitle>
                  <p className="text-gray-500 text-xs -mt-2">
                    {habits?.weeklyWorkouts || 0}/{habits?.weeklyGoal || 4} workouts
                  </p>
                </div>
                {habits && (
                  <div className="text-right">
                    <p className="text-green-400 text-lg" style={{ fontWeight: 700 }}>
                      {habits.weeklyWorkouts >= habits.weeklyGoal ? '✅' : `${habits.weeklyWorkouts}/${habits.weeklyGoal}`}
                    </p>
                  </div>
                )}
              </div>
              <WeekStrip sessions={[...sessions, ...legacyWorkouts.map(w => ({ startTime: w.date }))]} />
              {/* Weekly goal progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-green-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, ((habits?.weeklyWorkouts || 0) / (habits?.weeklyGoal || 4)) * 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            </motion.div>

            {/* Workout frequency chart */}
            <motion.div
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SectionTitle icon={TrendingUp}>Workout Frequency — Last 14 Days</SectionTitle>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart id="progress-frequency-chart" data={frequencyData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                  <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} interval={2} />
                  <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip suffix=" session(s)" />} />
                  <Bar dataKey="workouts" fill="#5da831" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {/* Category balance */}
            {balanceData.length > 0 && (
              <motion.div
                className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <SectionTitle icon={PieChartIcon}>Training Balance</SectionTitle>
                <div className="flex items-center gap-4">
                  <PieChart id="progress-balance-chart" width={130} height={130}>
                    <Pie
                      data={balanceData}
                      cx="50%" cy="50%"
                      innerRadius={35} outerRadius={58}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {balanceData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                  <div className="flex-1 space-y-2">
                    {balanceData.map(item => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                        <span className="text-gray-300 text-xs flex-1">{item.name}</span>
                        <span className="text-gray-500 text-xs">{item.value} sessions</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Fitness radar */}
            <motion.div
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <SectionTitle icon={Target}>Fitness Attributes</SectionTitle>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart id="progress-radar-chart" data={radarData}>
                  <PolarGrid stroke="#27241f" />
                  <PolarAngleAxis dataKey="attr" tick={{ fill: '#7c7468', fontSize: 11 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar dataKey="value" stroke="#5da831" fill="#5da831" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        {/* ── STRENGTH TAB ─────────────────────────────────────────────────── */}
        {tab === 'strength' && (
          <motion.div
            key="strength"
            className="space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Exercise selector */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <SectionTitle icon={Dumbbell}>Strength Progress</SectionTitle>
              <select
                value={selectedExercise}
                onChange={e => setSelectedExercise(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 transition-colors"
              >
                {exerciseNames.length > 0
                  ? exerciseNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))
                  : <option>Bench Press</option>}
              </select>

              {strengthData.length > 1 ? (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart id="progress-strength-chart" data={strengthData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                      <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
                      <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTooltip suffix=" kg" />} />
                      <Line type="monotone" dataKey="maxWeight" stroke="#5da831" strokeWidth={2.5}
                        dot={{ fill: '#5da831', r: 4 }} name="Max Weight" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-6 text-center py-8">
                  <Dumbbell className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No data yet for this exercise</p>
                  <p className="text-gray-600 text-xs mt-1">Complete a workout with this exercise to see progress</p>
                  <Link
                    to="/workout"
                    className="mt-3 inline-flex items-center gap-1.5 text-green-400 text-xs hover:text-green-300 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    Start a Workout <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              )}
            </div>

            {/* Volume chart */}
            {strengthData.length > 1 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <SectionTitle icon={Package}>Total Volume (kg × reps)</SectionTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart id="progress-volume-chart" data={strengthData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                    <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip suffix=" kg" />} />
                    <Area type="monotone" dataKey="totalVolume" stroke="#1e9fb3" strokeWidth={2}
                      fill="#1e9fb3" fillOpacity={0.15} name="Volume" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Tips */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4">
              <p className="text-blue-400 text-sm mb-2" style={{ fontWeight: 600 }}>💡 Progressive Overload Tips</p>
              <ul className="space-y-1.5 text-gray-400 text-xs">
                {[
                  'Add 2.5kg when you can complete all sets with perfect form',
                  'Track every session — even small gains compound over time',
                  'Focus on compound movements for maximum strength gains',
                  'Rest 2-3 minutes between heavy compound sets',
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ── BODY TAB ─────────────────────────────────────────────────────── */}
        {tab === 'body' && (
          <motion.div
            key="body"
            className="space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {/* Weight chart */}
            {weightData.length > 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <SectionTitle icon={Scale}>Weight Trend</SectionTitle>
                  {weightData.length >= 2 && (
                    <div className={`flex items-center gap-1 text-xs ${
                      weightData[weightData.length - 1].weight < weightData[0].weight
                        ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {weightData[weightData.length - 1].weight < weightData[0].weight
                        ? <TrendingDown className="w-3.5 h-3.5" />
                        : <TrendingUp className="w-3.5 h-3.5" />
                      }
                      {Math.abs(weightData[weightData.length - 1].weight - weightData[0].weight).toFixed(1)} kg
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart id="progress-weight-chart" data={weightData} margin={{ top: 4, right: 4, bottom: 4, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                    <XAxis dataKey="date" tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} />
                    <YAxis tick={{ fill: '#7c7468', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip suffix=" kg" />} />
                    <Line type="monotone" dataKey="weight" stroke="#5da831" strokeWidth={2.5}
                      dot={{ fill: '#5da831', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
                <Scale className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 text-sm" style={{ fontWeight: 600 }}>No measurements logged yet</p>
                <p className="text-gray-500 text-xs mt-1">Tap "Log Body" to start tracking your weight</p>
              </div>
            )}

            {/* Recent measurements */}
            {measurements.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <SectionTitle icon={ClipboardList}>Recent Measurements</SectionTitle>
                <div className="space-y-3">
                  {measurements.slice(0, 5).map((m, i) => (
                    <motion.div
                      key={m.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/60 rounded-xl"
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                    >
                      <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <Scale className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm" style={{ fontWeight: 600 }}>
                          {m.weight ? `${m.weight} kg` : '—'}
                          {m.bodyFat ? ` · ${m.bodyFat}% BF` : ''}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      {m.waist && (
                        <div className="text-right">
                          <p className="text-gray-400 text-xs">Waist</p>
                          <p className="text-gray-200 text-sm" style={{ fontWeight: 600 }}>{m.waist} cm</p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* BMI calculator */}
            {user.weight && user.height && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <SectionTitle icon={Stethoscope}>BMI Calculator</SectionTitle>
                {(() => {
                  const bmi = parseFloat((user.weight / ((user.height / 100) ** 2)).toFixed(1));
                  const cat =
                    bmi < 18.5 ? { label: 'Underweight', color: 'text-blue-400', bar: 15 } :
                    bmi < 25   ? { label: 'Normal',       color: 'text-green-400', bar: 45 } :
                    bmi < 30   ? { label: 'Overweight',   color: 'text-yellow-400', bar: 70 } :
                                 { label: 'Obese',         color: 'text-red-400', bar: 90 };
                  return (
                    <>
                      <div className="flex items-end gap-3 mb-3">
                        <p className="text-4xl text-white" style={{ fontWeight: 800 }}>{bmi}</p>
                        <p className={`text-sm mb-1.5 ${cat.color}`} style={{ fontWeight: 600 }}>{cat.label}</p>
                      </div>
                      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div className="mt-1.5 flex justify-between text-gray-600 text-[10px]">
                        <span>Underweight</span><span>Normal</span><span>Overweight</span><span>Obese</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </motion.div>
        )}

        {/* ── RECORDS TAB ──────────────────────────────────────────────────── */}
        {tab === 'records' && (
          <motion.div
            key="records"
            className="space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {prs.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-400" style={{ fontWeight: 600 }}>No personal records yet</p>
                <p className="text-gray-500 text-xs mt-2">Complete workouts to start tracking your PRs</p>
                <Link
                  to="/workout"
                  className="mt-4 inline-flex items-center gap-1.5 bg-green-500 text-white px-4 py-2 rounded-xl text-sm transition-colors hover:bg-green-400"
                  style={{ fontWeight: 600 }}
                >
                  Start a Workout
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm" style={{ fontWeight: 700 }}>
                        {prs.length} Personal Records
                      </p>
                      <p className="text-gray-400 text-xs">Keep pushing to break them!</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {prs.map((pr, i) => (
                    <motion.div
                      key={pr.id}
                      className="bg-gray-900 border border-gray-800 hover:border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        {pr.type === 'weight' ? (
                          <Dumbbell className="w-4 h-4 text-yellow-400" />
                        ) : pr.type === 'duration' ? (
                          <Clock className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Award className="w-4 h-4 text-purple-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>
                          {pr.exerciseName}
                        </p>
                        <p className="text-gray-500 text-xs capitalize">{pr.type} record</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400" style={{ fontWeight: 700 }}>
                          {pr.type === 'duration'
                            ? `${Math.floor(pr.value / 60)}m ${pr.value % 60}s`
                            : `${pr.value} ${pr.unit}`}
                        </p>
                        <p className="text-gray-600 text-xs">
                          {new Date(pr.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <Star className="w-4 h-4 text-yellow-500/50 flex-shrink-0" />
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── INSIGHTS TAB ─────────────────────────────────────────────────── */}
        {tab === 'insights' && (
          <motion.div
            key="insights"
            className="space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/5 border border-purple-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white text-sm" style={{ fontWeight: 700 }}>AI Behavioral Insights</p>
                  <p className="text-gray-400 text-xs">Based on your actual training patterns</p>
                </div>
              </div>
            </div>

            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <InsightCard insight={insight} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
                <Activity className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 text-sm" style={{ fontWeight: 600 }}>
                  Log a few workouts to unlock insights
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Your AI coach needs data to generate personalized advice
                </p>
              </div>
            )}

            {/* Habit stats breakdown */}
            {habits && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
                <SectionTitle icon={BarChart2}>Habit Analytics</SectionTitle>
                {[
                  { label: 'Current Streak',    value: `${habits.currentStreak} days`,  icon: '🔥' },
                  { label: 'Longest Streak',    value: `${habits.longestStreak} days`,  icon: '🏆' },
                  { label: 'This Week',         value: `${habits.weeklyWorkouts}/${habits.weeklyGoal}`, icon: '🎯' },
                  { label: 'Days Since Cardio', value: habits.daysSinceCardio !== null ? `${habits.daysSinceCardio}d ago` : 'Never logged', icon: '🏃' },
                  { label: 'Days Since Flex',   value: habits.daysSinceFlexibility !== null ? `${habits.daysSinceFlexibility}d ago` : 'Never logged', icon: '🧘' },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-2">
                      <span>{row.icon}</span>
                      <span className="text-gray-400 text-sm">{row.label}</span>
                    </div>
                    <span className="text-gray-200 text-sm" style={{ fontWeight: 600 }}>{row.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Quick action */}
            <Link
              to="/workout"
              className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-2xl hover:bg-green-500/15 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>Start a Workout</p>
                  <p className="text-gray-400 text-xs">Turn insights into action</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-400 transition-colors" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Add Measurement Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddMeasurement && (
          <AddMeasurementModal
            userId={user.id}
            onClose={() => setShowAddMeasurement(false)}
            onSave={() => {
              setMeasurements(measurementService.getMeasurements(user.id));
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
