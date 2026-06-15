// ============================================================
// Fit Tracker PRO — Workout Builder Page
// Multi-step workout experience:
//   Step 1: Choose workout type (grid of categories)
//   Step 2: Configure (goal, duration, equipment)
//   Step 3: Preview generated plan (can swap exercises)
//   Step 4: Active session (handled by ActiveWorkoutSession)
//   Step 5: Completion screen (PRs, stats, confetti)
// ============================================================
import { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Dumbbell, Flame, Zap, Activity, Wind, Target,
  ChevronRight, Clock, Users, Play, RefreshCw,
  Trophy, ArrowRight, CheckCircle2, RotateCcw,
  Repeat, Timer, Share2, ListChecks,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { workoutGenerator, EXERCISE_DB } from '../../services/exerciseService';
import { prService, sessionService } from '../../services/progressService';
import { workoutService } from '../../services/workoutService';
import ShareCardModal from '../shared/ShareCardModal';
import type { ShareCardData } from '../../services/shareCardService';
import type {
  WorkoutCategory, GeneratedWorkout, WorkoutGeneratorConfig,
  ExerciseLog, WorkoutSession, FitnessGoal, Difficulty,
} from '../../types';

// Lazy-load the ActiveWorkoutSession to keep initial bundle small
const ActiveWorkoutSession = lazy(() => import('./ActiveWorkoutSession'));

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'choose_type' | 'configure' | 'preview' | 'active' | 'complete';

interface WorkoutTypeCard {
  category: WorkoutCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  tags: string[];
}

// ─── Workout type grid data ────────────────────────────────────────────────────
const WORKOUT_TYPES: WorkoutTypeCard[] = [
  {
    category: 'strength',
    label: 'Strength',
    description: 'Build muscle & power',
    icon: Dumbbell,
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-blue-500/5',
    tags: ['PPL', 'Arnold', 'Full Body'],
  },
  {
    category: 'cardio',
    label: 'Cardio',
    description: 'Improve endurance',
    icon: Activity,
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-orange-500/5',
    tags: ['Running', 'Cycling', 'Rowing'],
  },
  {
    category: 'hiit',
    label: 'HIIT',
    description: 'Max calorie burn',
    icon: Zap,
    color: 'text-yellow-400',
    gradient: 'from-yellow-500/20 to-yellow-500/5',
    tags: ['Burpees', 'Circuits', 'Tabata'],
  },
  {
    category: 'yoga',
    label: 'Yoga',
    description: 'Flexibility & mindfulness',
    icon: Wind,
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-purple-500/5',
    tags: ['Flow', 'Restorative', 'Power'],
  },
  {
    category: 'flexibility',
    label: 'Flexibility',
    description: 'Recovery & mobility',
    icon: Repeat,
    color: 'text-green-400',
    gradient: 'from-green-500/20 to-green-500/5',
    tags: ['Stretching', 'Mobility', 'Recovery'],
  },
  {
    category: 'sports',
    label: 'Functional',
    description: 'Athletic performance',
    icon: Target,
    color: 'text-red-400',
    gradient: 'from-red-500/20 to-red-500/5',
    tags: ['Kettlebell', 'CrossFit', 'Agility'],
  },
];

// ─── Quick plan cards ──────────────────────────────────────────────────────────
const QUICK_PLANS = workoutGenerator.getQuickPlans();

// ─── Page loader ───────────────────────────────────────────────────────────────
function SessionLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading workout…</p>
      </div>
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────
function CompletionScreen({
  session,
  userName,
  streak,
  onNewWorkout,
  onViewHistory,
}: {
  session: WorkoutSession;
  userName: string;
  streak: number;
  onNewWorkout: () => void;
  onViewHistory: () => void;
}) {
  const [showShare, setShowShare] = useState(false);

  const totalSets = session.exerciseLogs?.reduce((s, l) => s + l.sets.filter(set => set.completed).length, 0) || 0;
  const totalReps = session.exerciseLogs?.reduce((s, l) =>
    s + l.sets.filter(set => set.completed).reduce((r, set) => r + (set.reps || 0), 0), 0) || 0;

  const shareCardData: ShareCardData = {
    kind: 'workout',
    heading: 'Workout Complete!',
    subheading: session.planName,
    userName,
    date: new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    streak,
    stats: [
      { emoji: '⏱️', value: `${session.duration} min`, label: 'Duration' },
      { emoji: '🔥', value: `${session.totalCalories}`, label: 'Calories' },
      { emoji: '💪', value: String(totalSets), label: 'Sets Done' },
      { emoji: '🔁', value: totalReps > 0 ? String(totalReps) : '—', label: 'Total Reps' },
    ],
  };

  return (
    <motion.div
      className="flex flex-col items-center p-6 max-w-lg mx-auto space-y-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Trophy + completion */}
      <motion.div
        className="text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="w-20 h-20 bg-gradient-to-br from-yellow-500/30 to-orange-500/20 border-2 border-yellow-500/40 rounded-full flex items-center justify-center mx-auto mb-4"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Trophy className="w-10 h-10 text-yellow-400" />
        </motion.div>
        <h2 className="text-white text-2xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Workout Complete!</h2>
        <p className="text-gray-400 text-sm mt-1">{session.planName}</p>
      </motion.div>

      {/* Stats grid */}
      <motion.div
        className="w-full grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {[
          { label: 'Duration', value: `${session.duration} min`, icon: Clock, color: 'text-blue-400' },
          { label: 'Calories', value: `${session.totalCalories} kcal`, icon: Flame, color: 'text-orange-400' },
          { label: 'Sets Done', value: String(totalSets), icon: Dumbbell, color: 'text-purple-400' },
          { label: 'Total Reps', value: totalReps > 0 ? String(totalReps) : '—', icon: Repeat, color: 'text-green-400' },
        ].map(item => (
          <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
            <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-2`} />
            <p className="text-white text-xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{item.value}</p>
            <p className="text-gray-500 text-xs">{item.label}</p>
          </div>
        ))}
      </motion.div>

      {/* New PRs */}
      {session.newPRs && session.newPRs.length > 0 && (
        <motion.div
          className="w-full bg-gradient-to-r from-yellow-500/15 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <p className="text-yellow-400 text-sm" style={{ fontWeight: 700 }}>
              New Personal Records!
            </p>
          </div>
          <div className="space-y-1.5">
            {session.newPRs.map(name => (
              <div key={name} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-gray-200 text-sm">{name}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Exercises summary */}
      {session.exerciseLogs && session.exerciseLogs.length > 0 && (
        <motion.div
          className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
        >
          <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Exercises Completed</h3>
          <div className="space-y-2">
            {session.exerciseLogs.filter(l => l.sets.some(s => s.completed)).map(log => (
              <div key={log.exerciseId} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                <span className="text-gray-300 text-sm">{log.exerciseName}</span>
                <span className="text-gray-500 text-xs">
                  {log.sets.filter(s => s.completed).length} sets
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* CTA buttons */}
      <motion.div
        className="w-full space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <motion.button
          onClick={() => setShowShare(true)}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
          style={{ fontWeight: 700 }}
          whileTap={{ scale: 0.97 }}
        >
          <Share2 className="w-4 h-4" />
          Share Your Results
        </motion.button>
        <motion.button
          onClick={onNewWorkout}
          className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
          style={{ fontWeight: 700 }}
          whileTap={{ scale: 0.97 }}
        >
          <RefreshCw className="w-4 h-4" />
          Start Another Workout
        </motion.button>
        <button
          onClick={onViewHistory}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl py-3 text-sm transition-colors"
        >
          View Workout History
        </button>
      </motion.div>

      <AnimatePresence>
        {showShare && <ShareCardModal data={shareCardData} onClose={() => setShowShare(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main WorkoutBuilderPage ────────────────────────────────────────────────────
export default function WorkoutBuilderPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('choose_type');
  const [selectedType, setSelectedType] = useState<WorkoutCategory>('strength');
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedWorkout | null>(null);
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Config state
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(45);
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [equipment, setEquipment] = useState<'gym' | 'home' | 'none'>('gym');

  // Recent sessions
  const recentSessions = user ? sessionService.getSessions(user.id).slice(0, 5) : [];

  // ── Step handlers ──────────────────────────────────────────────────────────
  const handleSelectType = (category: WorkoutCategory) => {
    setSelectedType(category);
    setStep('configure');
  };

  const handleQuickStart = (plan: typeof QUICK_PLANS[0]) => {
    const config: WorkoutGeneratorConfig = {
      goal: (user?.goal || 'get_fit') as FitnessGoal,
      difficulty,
      durationMinutes: plan.duration as 15 | 30 | 45 | 60,
      category: plan.category,
      equipment,
    };
    const generated = workoutGenerator.generate(config);
    setGeneratedPlan(generated);
    setStep('preview');
  };

  const handleGenerate = () => {
    const config: WorkoutGeneratorConfig = {
      goal: (user?.goal || 'get_fit') as FitnessGoal,
      difficulty,
      durationMinutes: duration,
      category: selectedType,
      equipment,
    };
    const generated = workoutGenerator.generate(config);
    setGeneratedPlan(generated);
    setStep('preview');
  };

  const handleRegenerate = () => {
    if (!generatedPlan) return;
    const config: WorkoutGeneratorConfig = {
      goal: (user?.goal || 'get_fit') as FitnessGoal,
      difficulty,
      durationMinutes: duration,
      category: selectedType,
      equipment,
    };
    setGeneratedPlan(workoutGenerator.generate(config));
  };

  const handleStartWorkout = () => {
    setStep('active');
  };

  // ── Workout complete handler ────────────────────────────────────────────────
  const handleWorkoutComplete = useCallback((logs: ExerciseLog[], totalSeconds: number) => {
    if (!user || !generatedPlan) return;

    const duration = Math.round(totalSeconds / 60);
    const workoutId = crypto.randomUUID();

    // Check for PRs
    const newPRs = prService.checkAndSavePRs(user.id, logs, workoutId);

    // Estimate calories
    const completedLogs = logs.filter(l => l.sets.some(s => s.completed));
    const avgCalsPerMin = completedLogs.reduce((sum, l) => {
      const ex = EXERCISE_DB.find(e => e.id === l.exerciseId);
      return sum + (ex?.caloriesPerMinute || 6);
    }, 0) / Math.max(completedLogs.length, 1);
    const totalCalories = Math.round(avgCalsPerMin * Math.max(duration, 1));

    // Build session
    const session: WorkoutSession = {
      id: workoutId,
      userId: user.id,
      planName: generatedPlan.name,
      category: generatedPlan.category,
      exerciseLogs: logs,
      startTime: new Date(Date.now() - totalSeconds * 1000).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      totalCalories,
      newPRs,
    };

    sessionService.saveSession(session);

    // Also save to legacy workout service for dashboard compatibility
    workoutService.saveWorkout(user.id, {
      name: generatedPlan.name,
      exercises: logs.map(l => ({
        name: l.exerciseName,
        sets: l.sets.filter(s => s.completed).length,
        reps: l.sets.find(s => s.reps)?.reps || 0,
        weight: l.sets.find(s => s.weight)?.weight,
        duration: l.totalDuration,
      })),
      duration,
      calories: totalCalories,
      date: new Date().toISOString(),
      category: generatedPlan.category,
    });

    setCompletedSession(session);
    setStep('complete');
  }, [user, generatedPlan]);

  const handleCancel = () => {
    setStep('preview');
  };

  const resetToStart = () => {
    setStep('choose_type');
    setGeneratedPlan(null);
    setCompletedSession(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <AnimatePresence mode="wait">

        {/* ── STEP: CHOOSE TYPE ────────────────────────────────────────────── */}
        {step === 'choose_type' && (
          <motion.div
            key="choose"
            className="p-4 max-w-2xl mx-auto space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Header */}
            <div>
              <h1 className="text-2xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                <Dumbbell className="w-6 h-6 text-green-400" /> Start Workout
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Choose your training type to generate a personalized plan
              </p>
            </div>

            {/* Quick plans */}
            <div>
              <h2 className="text-white text-sm mb-3 flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                <Zap className="w-3.5 h-3.5 text-green-400" /> Quick Start
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PLANS.slice(0, 4).map(plan => (
                  <motion.button
                    key={plan.name}
                    onClick={() => handleQuickStart(plan)}
                    className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 hover:border-green-500/30 rounded-2xl text-left transition-all group"
                    whileTap={{ scale: 0.97 }}
                  >
                    <span className="text-2xl">{plan.icon}</span>
                    <div className="min-w-0">
                      <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>
                        {plan.name}
                      </p>
                      <p className="text-gray-500 text-xs">{plan.duration} min</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Category grid */}
            <div>
              <h2 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>
                🏋️ Build Custom Plan
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {WORKOUT_TYPES.map((type, i) => {
                  const Icon = type.icon;
                  return (
                    <motion.button
                      key={type.category}
                      onClick={() => handleSelectType(type.category)}
                      className={`relative flex flex-col items-start p-4 bg-gradient-to-br ${type.gradient} border border-gray-800 hover:border-gray-700 rounded-2xl text-left transition-all group`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className={`w-10 h-10 bg-gray-900/60 rounded-xl flex items-center justify-center mb-3`}>
                        <Icon className={`w-5 h-5 ${type.color}`} />
                      </div>
                      <p className="text-white text-sm" style={{ fontWeight: 700 }}>{type.label}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{type.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {type.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="text-xs text-gray-600 bg-gray-900/50 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <ChevronRight className={`absolute top-4 right-4 w-4 h-4 ${type.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Recent workouts */}
            {recentSessions.length > 0 && (
              <div>
                <h2 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>
                  📅 Recent Sessions
                </h2>
                <div className="space-y-2">
                  {recentSessions.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                      <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{s.planName}</p>
                        <p className="text-gray-500 text-xs">{s.duration} min · {s.totalCalories} cal</p>
                      </div>
                      <span className="text-gray-600 text-xs">
                        {new Date(s.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP: CONFIGURE ──────────────────────────────────────────────── */}
        {step === 'configure' && (
          <motion.div
            key="configure"
            className="p-4 max-w-lg mx-auto space-y-5"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('choose_type')}
                className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ←
              </button>
              <div>
                <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>
                  Configure Workout
                </h1>
                <p className="text-gray-400 text-xs capitalize">{selectedType} training</p>
              </div>
            </div>

            {/* Duration */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-400" />
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>Duration</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {([15, 30, 45, 60] as const).map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`py-3 rounded-xl text-sm transition-all ${
                      duration === d
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    style={{ fontWeight: duration === d ? 700 : 400 }}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>Difficulty</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`py-3 rounded-xl text-sm capitalize transition-all ${
                      difficulty === d
                        ? d === 'beginner' ? 'bg-green-500 text-white'
                        : d === 'intermediate' ? 'bg-blue-500 text-white'
                        : 'bg-red-500 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    style={{ fontWeight: difficulty === d ? 700 : 400 }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-purple-400" />
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>Equipment Available</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'gym', label: '🏋️ Gym', desc: 'Full access' },
                  { value: 'home', label: '🏠 Home', desc: 'Dumbbells, KB' },
                  { value: 'none', label: '🤸 Bodyweight', desc: 'No equipment' },
                ].map(eq => (
                  <button
                    key={eq.value}
                    onClick={() => setEquipment(eq.value as 'gym' | 'home' | 'none')}
                    className={`py-3 px-2 rounded-xl text-center transition-all ${
                      equipment === eq.value
                        ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <p className="text-sm" style={{ fontWeight: equipment === eq.value ? 600 : 400 }}>
                      {eq.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{eq.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <motion.button
              onClick={handleGenerate}
              className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
              style={{ fontWeight: 700, fontSize: 16 }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-5 h-5" />
              Generate {duration}-Minute Plan
            </motion.button>
          </motion.div>
        )}

        {/* ── STEP: PREVIEW PLAN ───────────────────────────────────────────── */}
        {step === 'preview' && generatedPlan && (
          <motion.div
            key="preview"
            className="p-4 max-w-lg mx-auto space-y-4"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('configure')}
                className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
              >
                ←
              </button>
              <div className="flex-1">
                <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>
                  {generatedPlan.name}
                </h1>
                <p className="text-gray-400 text-xs">
                  {generatedPlan.estimatedDuration} min · ~{generatedPlan.estimatedCalories} cal
                </p>
              </div>
              <motion.button
                onClick={handleRegenerate}
                className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-green-400 transition-colors"
                whileTap={{ rotate: 180 }}
                title="Regenerate plan"
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Plan overview card */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm" style={{ fontWeight: 600 }}>
                    AI-Generated Plan
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                      <ListChecks className="w-3 h-3" /> {generatedPlan.exercises.length} exercises
                    </span>
                    {generatedPlan.warmup && generatedPlan.warmup.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Flame className="w-3 h-3 text-orange-400" /> Warm-up included
                      </span>
                    )}
                    {generatedPlan.cooldown && generatedPlan.cooldown.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        <Wind className="w-3 h-3 text-purple-400" /> Cool-down included
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl text-white" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {generatedPlan.exercises.length}
                  </p>
                  <p className="text-gray-500 text-xs">exercises</p>
                </div>
              </div>
            </div>

            {/* Warm-up */}
            {generatedPlan.warmup && generatedPlan.warmup.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-1">Warm-Up</p>
                <div className="space-y-2">
                  {generatedPlan.warmup.map(ex => (
                    <div key={ex.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                      <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                        <Activity className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-300 text-sm">{ex.name}</p>
                        <p className="text-gray-600 text-xs">
                          {ex.isTimed ? `${ex.defaultDuration}s` : `${ex.defaultSets}×${ex.defaultReps}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main exercises */}
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-1">Main Workout</p>
              <div className="space-y-2">
                {generatedPlan.exercises.map((ex, i) => (
                  <motion.div
                    key={ex.id}
                    className="flex items-center gap-3 p-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-400 text-xs" style={{ fontWeight: 600 }}>{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm" style={{ fontWeight: 600 }}>{ex.name}</p>
                      <p className="text-gray-500 text-xs">
                        {ex.isTimed
                          ? `${ex.defaultSets} × ${ex.defaultDuration}s`
                          : `${ex.defaultSets} × ${ex.defaultReps} reps`
                        }
                        {ex.restSeconds ? ` · ${ex.restSeconds}s rest` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {ex.muscleGroups?.slice(0, 1).map(mg => (
                        <span key={mg} className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
                          {mg}
                        </span>
                      ))}
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        ex.difficulty === 'beginner' ? 'text-green-600 bg-green-500/10' :
                        ex.difficulty === 'intermediate' ? 'text-blue-600 bg-blue-500/10' :
                        'text-red-600 bg-red-500/10'
                      }`}>
                        {ex.difficulty}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Cool-down */}
            {generatedPlan.cooldown && generatedPlan.cooldown.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-widest mb-2 px-1">Cool-Down</p>
                <div className="space-y-2">
                  {generatedPlan.cooldown.map(ex => (
                    <div key={ex.id} className="flex items-center gap-3 p-3 bg-gray-900 border border-gray-800 rounded-xl">
                      <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Wind className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-gray-300 text-sm">{ex.name}</p>
                        <p className="text-gray-600 text-xs">{ex.defaultDuration}s hold</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start button */}
            <div className="pb-4">
              <motion.button
                onClick={handleStartWorkout}
                className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-4 flex items-center justify-center gap-2 transition-colors"
                style={{ fontWeight: 700, fontSize: 16 }}
                whileTap={{ scale: 0.97 }}
              >
                <Play className="w-5 h-5" fill="currentColor" />
                Begin Workout
              </motion.button>
              <p className="text-center text-gray-600 text-xs mt-2">
                Exercises will be guided step by step
              </p>
            </div>
          </motion.div>
        )}

        {/* ── STEP: ACTIVE SESSION ─────────────────────────────────────────── */}
        {step === 'active' && generatedPlan && (
          <motion.div
            key="active"
            className="fixed inset-0 z-40 bg-gray-950 flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Suspense fallback={<SessionLoader />}>
              <ActiveWorkoutSession
                exercises={generatedPlan.exercises}
                warmup={generatedPlan.warmup}
                cooldown={generatedPlan.cooldown}
                planName={generatedPlan.name}
                onComplete={handleWorkoutComplete}
                onCancel={handleCancel}
              />
            </Suspense>
          </motion.div>
        )}

        {/* ── STEP: COMPLETE ───────────────────────────────────────────────── */}
        {step === 'complete' && completedSession && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CompletionScreen
              session={completedSession}
              userName={user?.name || 'Athlete'}
              streak={workoutService.getStats(user?.id || '').streak}
              onNewWorkout={resetToStart}
              onViewHistory={() => setShowHistory(true)}
            />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
