// ============================================================
// Fit Tracker PRO — Workout Service
// Persists workouts to localStorage (mock DB).
// Replace localStorage calls with api.post/get calls when
// the Express backend is connected.
// ============================================================
import type { Workout, DailyProgress } from '../types';
import { sessionService } from './progressService';

const KEY = 'fit_workouts';

// ─── Seed data for demo purposes ─────────────────────────────────────────────
const SEED_WORKOUTS: Omit<Workout, 'userId'>[] = [
  {
    id: 'seed-1',
    name: 'Push Day',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 8, weight: 80 },
      { name: 'Shoulder Press', sets: 3, reps: 10, weight: 50 },
      { name: 'Tricep Dips', sets: 3, reps: 12 },
    ],
    duration: 55,
    calories: 380,
    date: new Date(Date.now() - 1 * 86400000).toISOString(),
    category: 'Strength',
  },
  {
    id: 'seed-2',
    name: 'Pull Day',
    exercises: [
      { name: 'Deadlifts', sets: 4, reps: 5, weight: 120 },
      { name: 'Pull-ups', sets: 4, reps: 8 },
      { name: 'Barbell Rows', sets: 3, reps: 10, weight: 70 },
    ],
    duration: 60,
    calories: 420,
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    category: 'Strength',
  },
  {
    id: 'seed-3',
    name: 'Leg Day',
    exercises: [
      { name: 'Squats', sets: 5, reps: 5, weight: 100 },
      { name: 'Leg Press', sets: 3, reps: 12, weight: 180 },
      { name: 'Lunges', sets: 3, reps: 10 },
    ],
    duration: 65,
    calories: 490,
    date: new Date(Date.now() - 3 * 86400000).toISOString(),
    category: 'Strength',
  },
  {
    id: 'seed-4',
    name: 'Cardio HIIT',
    exercises: [
      { name: 'Burpees', sets: 5, reps: 15 },
      { name: 'Jump Rope', sets: 5, reps: 60, duration: 60 },
      { name: 'Box Jumps', sets: 4, reps: 10 },
    ],
    duration: 40,
    calories: 520,
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    category: 'Cardio',
  },
  {
    id: 'seed-5',
    name: 'Core & Abs',
    exercises: [
      { name: 'Plank', sets: 3, reps: 1, duration: 60 },
      { name: 'Crunches', sets: 3, reps: 20 },
      { name: 'Mountain Climbers', sets: 3, reps: 30 },
    ],
    duration: 30,
    calories: 210,
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    category: 'Core',
  },
];

function getUserWorkouts(userId: string): Workout[] {
  const all: Workout[] = JSON.parse(localStorage.getItem(KEY) || '[]');
  let userWorkouts = all.filter(w => w.userId === userId);

  // First time — seed demo data
  if (userWorkouts.length === 0) {
    const seeded = SEED_WORKOUTS.map(w => ({ ...w, userId }));
    const updated = [...all, ...seeded];
    localStorage.setItem(KEY, JSON.stringify(updated));
    userWorkouts = seeded;
  }
  return userWorkouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export const workoutService = {
  /** Get all workouts for a user */
  getWorkouts(userId: string): Workout[] {
    return getUserWorkouts(userId);
  },

  /** Save a new workout */
  saveWorkout(userId: string, workout: Omit<Workout, 'id' | 'userId'>): Workout {
    const newWorkout: Workout = { ...workout, id: crypto.randomUUID(), userId };
    const all: Workout[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    localStorage.setItem(KEY, JSON.stringify([...all, newWorkout]));
    return newWorkout;
  },

  /** Delete a workout by ID */
  deleteWorkout(id: string): void {
    const all: Workout[] = JSON.parse(localStorage.getItem(KEY) || '[]');
    localStorage.setItem(KEY, JSON.stringify(all.filter(w => w.id !== id)));
  },

  /** Get aggregated stats for dashboard */
  getStats(userId: string) {
    const workouts = getUserWorkouts(userId);
    const totalCalories = workouts.reduce((s, w) => s + w.calories, 0);
    const totalDuration = workouts.reduce((s, w) => s + w.duration, 0);

    // BUG FIX #5: Merge WorkoutSession dates so streak counts ALL activity
    const sessions = sessionService.getSessions(userId);
    const sessionDateStrings = new Set(
      sessions.map(s => new Date(s.startTime).toDateString())
    );
    const workoutDateStrings = new Set(
      workouts.map(w => new Date(w.date).toDateString())
    );
    const allActiveDates = new Set([...sessionDateStrings, ...workoutDateStrings]);

    // Calculate current streak (consecutive days) across both data sources
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      if (allActiveDates.has(ds)) streak++;
      else if (i > 0) break;
    }

    // Last 30 days progress — merge calories from both sources
    const progressData: DailyProgress[] = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const ds = d.toDateString();
      const dayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === ds);
      const daySessions = sessions.filter(s => new Date(s.startTime).toDateString() === ds);
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calories:
          dayWorkouts.reduce((s, w) => s + w.calories, 0) +
          daySessions.reduce((s, sess) => s + sess.totalCalories, 0),
        workouts: dayWorkouts.length + daySessions.length,
      };
    });

    const sessionCalories = sessions.reduce((s, sess) => s + sess.totalCalories, 0);
    const sessionDuration = sessions.reduce((s, sess) => s + sess.duration, 0);

    return {
      totalWorkouts: workouts.length + sessions.length,
      totalCalories: totalCalories + sessionCalories,
      totalDuration: totalDuration + sessionDuration,
      streak,
      progressData,
    };
  },
};
