// ============================================================
// Fit Tracker PRO — Shared TypeScript Types (v2)
// Expanded to cover all exercise, workout, session, progress,
// habit, and AI insight models across the entire app.
// ============================================================

// ─── Core User Types ──────────────────────────────────────────────────────────
export type Gender = 'male' | 'female';
export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'cancelled';
export type FitnessGoal = 'lose_weight' | 'build_muscle' | 'get_fit' | 'improve_endurance';

export interface User {
  id: string;
  name: string;
  email: string;
  gender: Gender;
  age?: number;
  weight?: number; // kg
  height?: number; // cm
  goal?: FitnessGoal;
  subscription: SubscriptionStatus;
  trialStartDate?: string; // ISO date
  avatarUrl?: string;
  createdAt: string;
}

// ─── Exercise Definition ──────────────────────────────────────────────────────
export type WorkoutCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'sports'
  | 'hiit'
  | 'yoga'
  | 'warmup'
  | 'cooldown';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'resistance_band'
  | 'bodyweight'
  | 'cardio_machine'
  | 'none';

/** Full exercise definition stored in the exercise database */
export interface ExerciseDef {
  id: string;
  name: string;
  /** Primary movement category */
  category: 'strength' | 'cardio' | 'flexibility' | 'sports';
  /** More specific sub-type (push/pull/legs/running/yoga/etc.) */
  subCategory: string;
  difficulty: Difficulty;
  equipment: Equipment[];
  muscleGroups: string[];

  // ── Defaults for workout generation ──
  defaultSets?: number;
  defaultReps?: number;
  defaultDuration?: number; // seconds (for timed exercises)
  restSeconds?: number;

  // ── Video / instructions ──
  videoUrl?: string;
  instructions: string[];
  tips?: string[];

  // ── Metadata ──
  caloriesPerMinute: number;
  /** If true, the exercise is measured in duration rather than reps */
  isTimed: boolean;
}

// ─── Workout Generator ────────────────────────────────────────────────────────
export interface WorkoutGeneratorConfig {
  goal: FitnessGoal;
  difficulty: Difficulty;
  durationMinutes: 15 | 30 | 45 | 60;
  category: WorkoutCategory;
  equipment: 'gym' | 'home' | 'none';
}

export interface GeneratedWorkout {
  name: string;
  category: WorkoutCategory;
  estimatedDuration: number;   // minutes
  estimatedCalories: number;
  exercises: ExerciseDef[];
  warmup?: ExerciseDef[];
  cooldown?: ExerciseDef[];
}

// ─── Workout Logging (in-session) ─────────────────────────────────────────────
/** One logged set during a workout */
export interface SetLog {
  setNumber: number;
  reps?: number;
  weight?: number;    // kg
  duration?: number;  // seconds
  completed: boolean;
}

/** All sets for a single exercise in a session */
export interface ExerciseLog {
  exerciseId: string;
  exerciseName: string;
  isTimed: boolean;
  sets: SetLog[];
  totalDuration?: number; // seconds (for timed exercises)
  notes?: string;
}

/** A completed or in-progress workout session */
export interface WorkoutSession {
  id: string;
  userId: string;
  planName: string;
  category: WorkoutCategory;
  exerciseLogs?: ExerciseLog[];
  startTime: string;  // ISO date
  endTime?: string;   // ISO date
  duration: number;   // minutes
  totalCalories: number;
  newPRs?: string[];  // exercise names where user hit a new PR
  notes?: string;
}

// ─── Legacy Workout (dashboard + history) ────────────────────────────────────
export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;   // kg
  duration?: number; // seconds
}

export interface Workout {
  id: string;
  userId: string;
  name: string;
  exercises: Exercise[];
  duration: number;  // minutes
  calories: number;
  date: string;      // ISO date
  notes?: string;
  category?: string;
}

// ─── Personal Records ─────────────────────────────────────────────────────────
export interface PersonalRecord {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'duration';
  value: number;
  unit: 'kg' | 'reps' | 'seconds';
  date: string; // ISO
  workoutId: string;
}

// ─── Body Measurements ────────────────────────────────────────────────────────
export interface BodyMeasurement {
  id: string;
  userId: string;
  date: string;
  weight?: number;   // kg
  bodyFat?: number;  // %
  chest?: number;    // cm
  waist?: number;
  hips?: number;
  arms?: number;
  legs?: number;
}

// ─── Daily / Weekly Progress ──────────────────────────────────────────────────
export interface DailyProgress {
  date: string;
  calories: number;
  workouts: number;
  steps?: number;
}

// ─── Habit Tracking ───────────────────────────────────────────────────────────
export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  weeklyWorkouts: number;
  weeklyGoal: number;
  lastWorkoutDate: string | null;
  daysSinceCardio: number | null;
  daysSinceStrength: number | null;
  daysSinceFlexibility: number | null;
  workoutBalance: {
    strength: number;
    cardio: number;
    flexibility: number;
    sports: number;
  };
}

// ─── AI Insights ──────────────────────────────────────────────────────────────
export interface AIInsight {
  id: string;
  type: 'success' | 'warning' | 'tip' | 'info';
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ─── Meal / Food Detection ────────────────────────────────────────────────────
export interface DetectedFood {
  name: string;
  calories: number;
  confidence: number;
  portion?: string;
}

// ─── Form Analysis ────────────────────────────────────────────────────────────
export interface PoseKeypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

export interface FormAnalysis {
  exercise: string;
  feedback: string[];
  score: number; // 0-100
  isGoodForm: boolean;
}
