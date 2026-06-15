// ============================================================
// Fit Tracker PRO — Active Workout Session
// In-workout experience featuring:
//   • Exercise-by-exercise progression
//   • Per-set logging (reps + weight OR duration)
//   • Animated rest timer between sets
//   • Audio cues (Web Audio API)
//   • PR detection on set completion
//   • Smooth transitions between exercises
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play, Pause, SkipForward, CheckCircle2, X,
  ChevronRight, ChevronLeft, Timer, Minus, Plus,
  Award, Dumbbell, Zap,
} from 'lucide-react';
import type { ExerciseDef, ExerciseLog, SetLog } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ActiveWorkoutProps {
  exercises: ExerciseDef[];
  warmup?: ExerciseDef[];
  cooldown?: ExerciseDef[];
  planName: string;
  onComplete: (logs: ExerciseLog[], totalSeconds: number) => void;
  onCancel: () => void;
}

// ─── Beep helper (Web Audio API) ─────────────────────────────────────────────
function playBeep(frequency = 880, duration = 0.15, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* Audio not available — silent fallback */ }
}

// ─── Rest Timer component ─────────────────────────────────────────────────────
function RestTimer({ seconds, onComplete }: { seconds: number; onComplete: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          playBeep(1047, 0.3); // High-pitched completion beep
          onComplete();
          return 0;
        }
        if (prev <= 4) playBeep(440, 0.1); // Countdown beeps
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds, onComplete]);

  const progress = (remaining / seconds) * 100;

  return (
    <motion.div
      className="flex flex-col items-center justify-center gap-4 py-8"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <p className="text-gray-400 text-sm">Rest Period</p>

      {/* Circular countdown */}
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#27241f" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="#5da831"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={276.5}
            strokeDashoffset={276.5 * (1 - progress / 100)}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-2xl tabular-nums" style={{ fontWeight: 700 }}>
            {remaining}
          </span>
        </div>
      </div>

      <p className="text-green-400 text-sm">Preparing next set…</p>

      <button
        onClick={onComplete}
        className="text-gray-500 hover:text-gray-300 text-xs underline transition-colors"
      >
        Skip rest
      </button>
    </motion.div>
  );
}

// ─── Timed Exercise component ─────────────────────────────────────────────────
function TimedExercise({
  duration,
  onComplete,
}: { duration: number; onComplete: (elapsed: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const toggle = () => {
    if (isRunning) {
      clearInterval(intervalRef.current!);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          if (e + 1 >= duration) {
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            playBeep(1047, 0.4);
            onComplete(e + 1);
            return e + 1;
          }
          if ((duration - e - 1) <= 3) playBeep(440, 0.1);
          return e + 1;
        });
      }, 1000);
    }
  };

  const progress = Math.min((elapsed / duration) * 100, 100);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Progress ring */}
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#27241f" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="#5da831"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={276.5}
            animate={{ strokeDashoffset: 276.5 * (1 - progress / 100) }}
            transition={{ duration: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-white text-2xl tabular-nums" style={{ fontWeight: 700 }}>
            {fmt(elapsed)}
          </span>
          <span className="text-gray-500 text-xs">/ {fmt(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={toggle}
          className={`w-14 h-14 rounded-full flex items-center justify-center ${
            isRunning
              ? 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
              : 'bg-green-500 text-white'
          }`}
          whileTap={{ scale: 0.9 }}
        >
          {isRunning
            ? <Pause className="w-6 h-6" />
            : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
          }
        </motion.button>

        <motion.button
          onClick={() => onComplete(elapsed)}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm transition-colors"
          whileTap={{ scale: 0.95 }}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          Done
        </motion.button>
      </div>
    </div>
  );
}

// ─── Set logger for strength exercises ───────────────────────────────────────
function SetLogger({
  setNumber,
  defaultReps = 10,
  defaultWeight,
  onComplete,
}: {
  setNumber: number;
  defaultReps?: number;
  defaultWeight?: number;
  onComplete: (set: Omit<SetLog, 'setNumber'>) => void;
}) {
  const [reps, setReps] = useState(defaultReps);
  const [weight, setWeight] = useState(defaultWeight || 0);

  return (
    <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <p className="text-gray-400 text-xs mb-3">Set {setNumber}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Reps */}
        <div>
          <p className="text-gray-500 text-xs mb-2">Reps</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReps(r => Math.max(1, r - 1))}
              className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white text-xl flex-1 text-center tabular-nums" style={{ fontWeight: 700 }}>
              {reps}
            </span>
            <button
              onClick={() => setReps(r => r + 1)}
              className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weight */}
        <div>
          <p className="text-gray-500 text-xs mb-2">Weight (kg)</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeight(w => Math.max(0, parseFloat((w - 2.5).toFixed(1))))}
              className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-white text-xl flex-1 text-center tabular-nums" style={{ fontWeight: 700 }}>
              {weight > 0 ? weight : '—'}
            </span>
            <button
              onClick={() => setWeight(w => parseFloat((w + 2.5).toFixed(1)))}
              className="w-9 h-9 bg-gray-700 hover:bg-gray-600 rounded-xl flex items-center justify-center text-gray-300 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <motion.button
        onClick={() => {
          playBeep(660, 0.2);
          onComplete({ reps, weight: weight || undefined, completed: true });
        }}
        className="w-full bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
        style={{ fontWeight: 600 }}
        whileTap={{ scale: 0.97 }}
      >
        <CheckCircle2 className="w-4 h-4" />
        Complete Set {setNumber}
      </motion.button>
    </div>
  );
}

// ─── Main Active Workout Session ──────────────────────────────────────────────
export default function ActiveWorkoutSession({
  exercises,
  warmup = [],
  cooldown = [],
  planName,
  onComplete,
  onCancel,
}: ActiveWorkoutProps) {
  // Combine all exercises into one flat array with phase labels
  const allPhases = [
    ...warmup.map(e => ({ ...e, phase: 'Warm-up' as const })),
    ...exercises.map(e => ({ ...e, phase: 'Main' as const })),
    ...cooldown.map(e => ({ ...e, phase: 'Cool-down' as const })),
  ];

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(0);    // 0-indexed
  const [logs, setLogs] = useState<ExerciseLog[]>([]);
  const [isResting, setIsResting] = useState(false);
  const [elapsed, setElapsed] = useState(0); // total seconds
  const [showCancel, setShowCancel] = useState(false);

  const totalTime = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Global workout timer ───────────────────────────────────────────────────
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed(e => e + 1);
      totalTime.current += 1;
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const currentExercise = allPhases[exerciseIndex];
  const totalSets = currentExercise?.defaultSets || 3;
  const progressPct = (exerciseIndex / allPhases.length) * 100;

  // ── Initialize log for current exercise ───────────────────────────────────
  const getCurrentLog = useCallback((): ExerciseLog => {
    const existing = logs.find(l => l.exerciseId === currentExercise?.id && l.exerciseName === currentExercise?.name);
    if (existing) return existing;
    return {
      id: crypto.randomUUID(),
      exerciseId: currentExercise?.id || '',
      exerciseName: currentExercise?.name || '',
      category: currentExercise?.category || 'strength',
      sets: [],
      isTimed: currentExercise?.isTimed || false,
    };
  }, [currentExercise, logs]);

  // ── Complete a set (strength) ──────────────────────────────────────────────
  const handleSetComplete = (setData: Omit<SetLog, 'setNumber'>) => {
    const newSet: SetLog = { ...setData, setNumber: currentSet + 1 };
    const log = getCurrentLog();
    const updatedLog = { ...log, sets: [...log.sets, newSet] };

    setLogs(prev => {
      const idx = prev.findIndex(l => l.exerciseId === log.exerciseId && l.exerciseName === log.exerciseName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedLog;
        return updated;
      }
      return [...prev, updatedLog];
    });

    const nextSet = currentSet + 1;
    if (nextSet < totalSets) {
      // More sets — show rest timer
      setCurrentSet(nextSet);
      setIsResting(true);
    } else {
      // All sets done — move to next exercise
      moveToNextExercise();
    }
  };

  // ── Complete a timed exercise ──────────────────────────────────────────────
  const handleTimedComplete = (durationSeconds: number) => {
    const log = getCurrentLog();
    const timedSet: SetLog = {
      setNumber: 1,
      duration: durationSeconds,
      completed: true,
    };
    const updatedLog = { ...log, sets: [timedSet], totalDuration: durationSeconds };

    setLogs(prev => {
      const idx = prev.findIndex(l => l.exerciseId === log.exerciseId && l.exerciseName === log.exerciseName);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = updatedLog;
        return updated;
      }
      return [...prev, updatedLog];
    });

    moveToNextExercise();
  };

  // ── Navigate exercises ─────────────────────────────────────────────────────
  const moveToNextExercise = () => {
    const next = exerciseIndex + 1;
    if (next >= allPhases.length) {
      // Workout complete!
      finishWorkout();
    } else {
      setExerciseIndex(next);
      setCurrentSet(0);
      setIsResting(false);
    }
  };

  const moveToPrevExercise = () => {
    if (exerciseIndex > 0) {
      setExerciseIndex(exerciseIndex - 1);
      setCurrentSet(0);
      setIsResting(false);
    }
  };

  const finishWorkout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    onComplete(logs, totalTime.current);
  };

  // ── Format elapsed time ────────────────────────────────────────────────────
  const pad = (n: number) => String(n).padStart(2, '0');
  const formatElapsed = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

  if (!currentExercise) return null;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* ── Top bar with progress ────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-gray-400 text-xs">{planName}</p>
            <p className="text-white text-sm" style={{ fontWeight: 600 }}>
              Exercise {exerciseIndex + 1} of {allPhases.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Elapsed timer */}
            <div className="flex items-center gap-1 bg-gray-900 rounded-xl px-3 py-1.5">
              <Timer className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-sm tabular-nums" style={{ fontWeight: 600 }}>
                {formatElapsed(elapsed)}
              </span>
            </div>
            {/* Cancel button */}
            <button
              onClick={() => setShowCancel(true)}
              className="w-8 h-8 bg-gray-800 hover:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-green-500 rounded-full"
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* ── Exercise content ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={exerciseIndex}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Exercise header */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mt-2">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="text-xs text-gray-500 uppercase tracking-wider">
                    {currentExercise.phase}
                  </span>
                  <h2 className="text-white text-xl mt-0.5" style={{ fontWeight: 700 }}>
                    {currentExercise.name}
                  </h2>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {currentExercise.muscleGroups?.slice(0, 3).map(mg => (
                      <span key={mg} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                        {mg}
                      </span>
                    ))}
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                      currentExercise.difficulty === 'beginner' ? 'bg-green-500/10 text-green-400' :
                      currentExercise.difficulty === 'intermediate' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-red-500/10 text-red-400'
                    }`}>
                      {currentExercise.difficulty}
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-6 h-6 text-green-400" />
                </div>
              </div>

              {/* Target sets/reps/duration */}
              <div className="flex gap-3">
                {!currentExercise.isTimed && (
                  <>
                    <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-white" style={{ fontWeight: 700 }}>{totalSets}</p>
                      <p className="text-gray-500 text-xs">Sets</p>
                    </div>
                    <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                      <p className="text-white" style={{ fontWeight: 700 }}>
                        {currentExercise.defaultReps || '—'}
                      </p>
                      <p className="text-gray-500 text-xs">Target Reps</p>
                    </div>
                  </>
                )}
                {currentExercise.isTimed && (
                  <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-white" style={{ fontWeight: 700 }}>
                      {currentExercise.defaultDuration}s
                    </p>
                    <p className="text-gray-500 text-xs">Duration</p>
                  </div>
                )}
                <div className="flex-1 bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-white" style={{ fontWeight: 700 }}>
                    {currentExercise.restSeconds || 60}s
                  </p>
                  <p className="text-gray-500 text-xs">Rest</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {currentExercise.instructions.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Instructions</h3>
                <ol className="space-y-2">
                  {currentExercise.instructions.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="w-5 h-5 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs" style={{ fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      <span className="text-gray-300 leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
                {currentExercise.tips && currentExercise.tips.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-yellow-400 text-xs" style={{ fontWeight: 600 }}>💡 Pro Tips</p>
                    {currentExercise.tips.map((tip, i) => (
                      <p key={i} className="text-gray-400 text-xs mt-1">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed sets for this exercise */}
            {(() => {
              const log = logs.find(l => l.exerciseId === currentExercise.id && l.exerciseName === currentExercise.name);
              if (log && log.sets.length > 0) {
                return (
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                    <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Completed Sets</h3>
                    <div className="space-y-2">
                      {log.sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2 bg-gray-800 rounded-xl">
                          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                          <span className="text-gray-400 text-sm">Set {s.setNumber}</span>
                          <div className="ml-auto flex items-center gap-3">
                            {s.reps && <span className="text-white text-sm" style={{ fontWeight: 600 }}>{s.reps} reps</span>}
                            {s.weight && <span className="text-blue-400 text-sm">{s.weight}kg</span>}
                            {s.duration && <span className="text-green-400 text-sm">{s.duration}s</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* ── Set logger or rest timer ─────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {isResting ? (
                <motion.div
                  key="rest"
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <RestTimer
                    seconds={currentExercise.restSeconds || 60}
                    onComplete={() => setIsResting(false)}
                  />
                </motion.div>
              ) : currentExercise.isTimed ? (
                <motion.div
                  key={`timed-${exerciseIndex}`}
                  className="bg-gray-900 border border-green-500/20 rounded-2xl p-5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <TimedExercise
                    duration={currentExercise.defaultDuration || 30}
                    onComplete={handleTimedComplete}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`set-${exerciseIndex}-${currentSet}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <SetLogger
                    setNumber={currentSet + 1}
                    defaultReps={currentExercise.defaultReps}
                    onComplete={handleSetComplete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom navigation ─────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2 border-t border-gray-800 flex items-center gap-3">
        <motion.button
          onClick={moveToPrevExercise}
          disabled={exerciseIndex === 0}
          className="w-12 h-12 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-2xl flex items-center justify-center text-gray-300 transition-colors flex-shrink-0"
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        <motion.button
          onClick={moveToNextExercise}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <SkipForward className="w-4 h-4" />
          <span className="text-sm" style={{ fontWeight: 600 }}>
            {exerciseIndex < allPhases.length - 1 ? 'Skip Exercise' : 'Finish Workout'}
          </span>
        </motion.button>

        <motion.button
          onClick={finishWorkout}
          className="flex-1 bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors"
          whileTap={{ scale: 0.97 }}
        >
          <Zap className="w-4 h-4" />
          <span className="text-sm" style={{ fontWeight: 700 }}>Finish Now</span>
        </motion.button>
      </div>

      {/* ── Cancel confirmation modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showCancel && (
          <motion.div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl p-6 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <Award className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-white text-lg mb-2" style={{ fontWeight: 700 }}>
                End Workout?
              </h3>
              <p className="text-gray-400 text-sm mb-5">
                You've completed {logs.length}/{allPhases.length} exercises.
                Your progress will be saved.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancel(false)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-3 text-sm transition-colors"
                >
                  Keep Going
                </button>
                <button
                  onClick={onCancel}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl py-3 text-sm transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  End & Discard
                </button>
                <button
                  onClick={finishWorkout}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-white rounded-xl py-3 text-sm transition-colors"
                  style={{ fontWeight: 700 }}
                >
                  Save Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
