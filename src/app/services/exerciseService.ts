// ============================================================
// Fit Tracker PRO — Exercise Service
// Contains:
//   • Rich exercise database (40+ exercises across all categories)
//   • Smart workout generator (goal/level/duration/equipment aware)
//   • Helper utilities for exercise display and filtering
// ============================================================
import type {
  ExerciseDef, WorkoutGeneratorConfig, GeneratedWorkout,
  WorkoutCategory, Equipment, Difficulty,
} from '../types';

// ─── Exercise Database ────────────────────────────────────────────────────────
// Video URLs: YouTube embed format. Set to undefined if no video available.
// Replace VIDEO_ID with actual YouTube video IDs for production.
export const EXERCISE_DB: ExerciseDef[] = [

  // ── STRENGTH: PUSH ─────────────────────────────────────────────────────────
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'intermediate',
    equipment: ['barbell'],
    muscleGroups: ['Chest', 'Shoulders', 'Triceps'],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
    videoUrl: undefined,
    instructions: [
      'Lie flat on bench, feet on floor.',
      'Grip bar slightly wider than shoulder-width.',
      'Lower bar to chest with control (2 sec).',
      'Press explosively back to start.',
      'Keep shoulder blades retracted throughout.',
    ],
    tips: ['Don\'t bounce bar off chest', 'Keep wrists straight', 'Breathe in on descent'],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline Dumbbell Press',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'intermediate',
    equipment: ['dumbbell'],
    muscleGroups: ['Upper Chest', 'Shoulders', 'Triceps'],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 75,
    instructions: [
      'Set bench to 30-45 degrees incline.',
      'Hold dumbbells at shoulder level, palms forward.',
      'Press dumbbells up and slightly inward.',
      'Lower slowly to start position.',
    ],
    tips: ['Control the descent', 'Don\'t lock elbows at top'],
    caloriesPerMinute: 6,
    isTimed: false,
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'intermediate',
    equipment: ['barbell', 'dumbbell'],
    muscleGroups: ['Shoulders', 'Triceps', 'Upper Traps'],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
    instructions: [
      'Stand with feet shoulder-width apart.',
      'Hold bar at shoulder height, grip just outside shoulders.',
      'Press bar overhead until arms fully extended.',
      'Lower bar back to shoulder level with control.',
    ],
    tips: ['Keep core braced', 'Don\'t lean back excessively'],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'pushups',
    name: 'Push-Ups',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'beginner',
    equipment: ['bodyweight', 'none'],
    muscleGroups: ['Chest', 'Shoulders', 'Triceps', 'Core'],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 60,
    instructions: [
      'Start in high plank: hands shoulder-width, body straight.',
      'Lower chest to ground by bending elbows.',
      'Push back up to starting position.',
      'Keep core tight throughout.',
    ],
    tips: ['Don\'t let hips sag', 'Full range of motion matters'],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'tricep-dips',
    name: 'Tricep Dips',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'intermediate',
    equipment: ['bodyweight'],
    muscleGroups: ['Triceps', 'Chest', 'Shoulders'],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      'Grip parallel bars or edge of bench.',
      'Lower body by bending elbows to 90 degrees.',
      'Press back up to straight arms.',
      'Keep torso upright for tricep focus.',
    ],
    caloriesPerMinute: 6,
    isTimed: false,
  },
  {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    category: 'strength',
    subCategory: 'push',
    difficulty: 'beginner',
    equipment: ['dumbbell'],
    muscleGroups: ['Side Delts'],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 45,
    instructions: [
      'Stand holding dumbbells at sides.',
      'Raise arms out to sides to shoulder height.',
      'Lower slowly back to sides.',
      'Slight bend in elbows throughout.',
    ],
    caloriesPerMinute: 5,
    isTimed: false,
  },

  // ── STRENGTH: PULL ─────────────────────────────────────────────────────────
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'strength',
    subCategory: 'pull',
    difficulty: 'advanced',
    equipment: ['barbell'],
    muscleGroups: ['Hamstrings', 'Glutes', 'Back', 'Traps'],
    defaultSets: 4,
    defaultReps: 5,
    restSeconds: 120,
    instructions: [
      'Bar over mid-foot, feet hip-width apart.',
      'Hinge at hips, grip bar just outside legs.',
      'Brace core, pull bar up by driving hips forward.',
      'Lower bar with control, maintaining neutral spine.',
    ],
    tips: ['Never round lower back', 'Keep bar close to body', 'Chest up at start'],
    caloriesPerMinute: 9,
    isTimed: false,
  },
  {
    id: 'pull-ups',
    name: 'Pull-Ups',
    category: 'strength',
    subCategory: 'pull',
    difficulty: 'intermediate',
    equipment: ['bodyweight'],
    muscleGroups: ['Lats', 'Biceps', 'Rear Delts'],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
    instructions: [
      'Grip bar slightly wider than shoulder-width, palms forward.',
      'Hang with arms fully extended.',
      'Pull up until chin clears bar.',
      'Lower slowly with control.',
    ],
    tips: ['Don\'t kip/swing', 'Full dead hang at bottom', 'Squeeze lats at top'],
    caloriesPerMinute: 8,
    isTimed: false,
  },
  {
    id: 'barbell-row',
    name: 'Barbell Rows',
    category: 'strength',
    subCategory: 'pull',
    difficulty: 'intermediate',
    equipment: ['barbell'],
    muscleGroups: ['Lats', 'Rhomboids', 'Biceps', 'Rear Delts'],
    defaultSets: 4,
    defaultReps: 8,
    restSeconds: 90,
    instructions: [
      'Hinge forward ~45 degrees, bar in overhand grip.',
      'Row bar to lower chest/upper abdomen.',
      'Squeeze shoulder blades together at top.',
      'Lower bar with control.',
    ],
    tips: ['Neutral spine at all times', 'Lead with elbows'],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'strength',
    subCategory: 'pull',
    difficulty: 'beginner',
    equipment: ['machine', 'cable'],
    muscleGroups: ['Lats', 'Biceps'],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 75,
    instructions: [
      'Grip bar wider than shoulder-width.',
      'Sit with thighs under pad.',
      'Pull bar to upper chest, arching slightly.',
      'Slowly return bar to start.',
    ],
    caloriesPerMinute: 6,
    isTimed: false,
  },
  {
    id: 'face-pulls',
    name: 'Face Pulls',
    category: 'strength',
    subCategory: 'pull',
    difficulty: 'beginner',
    equipment: ['cable'],
    muscleGroups: ['Rear Delts', 'External Rotators', 'Traps'],
    defaultSets: 3,
    defaultReps: 15,
    restSeconds: 45,
    instructions: [
      'Set cable pulley to upper chest height.',
      'Grip rope with palms facing in.',
      'Pull rope to face, flaring elbows out.',
      'Squeeze rear delts at end of movement.',
    ],
    caloriesPerMinute: 4,
    isTimed: false,
  },

  // ── STRENGTH: LEGS ─────────────────────────────────────────────────────────
  {
    id: 'barbell-squat',
    name: 'Barbell Squat',
    category: 'strength',
    subCategory: 'legs',
    difficulty: 'intermediate',
    equipment: ['barbell'],
    muscleGroups: ['Quads', 'Hamstrings', 'Glutes', 'Core'],
    defaultSets: 5,
    defaultReps: 5,
    restSeconds: 120,
    instructions: [
      'Bar resting on upper traps, feet shoulder-width.',
      'Brace core and begin descent by bending knees.',
      'Squat until thighs are parallel to floor.',
      'Drive through heels to return to start.',
    ],
    tips: ['Knees track over toes', 'Chest stays up', 'Don\'t let heels rise'],
    caloriesPerMinute: 9,
    isTimed: false,
  },
  {
    id: 'goblet-squat',
    name: 'Goblet Squat',
    category: 'strength',
    subCategory: 'legs',
    difficulty: 'beginner',
    equipment: ['dumbbell', 'kettlebell'],
    muscleGroups: ['Quads', 'Glutes', 'Core'],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      'Hold dumbbell vertically at chest height.',
      'Stand with feet slightly wider than shoulder-width.',
      'Squat deep, keeping elbows inside knees.',
      'Drive up through heels.',
    ],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    category: 'strength',
    subCategory: 'legs',
    difficulty: 'intermediate',
    equipment: ['barbell', 'dumbbell'],
    muscleGroups: ['Hamstrings', 'Glutes', 'Lower Back'],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 90,
    instructions: [
      'Hold bar/dumbbells in front of thighs.',
      'Hinge at hips, lowering weight along legs.',
      'Feel stretch in hamstrings when back is parallel to floor.',
      'Drive hips forward to return to start.',
    ],
    caloriesPerMinute: 7,
    isTimed: false,
  },
  {
    id: 'lunges',
    name: 'Walking Lunges',
    category: 'strength',
    subCategory: 'legs',
    difficulty: 'beginner',
    equipment: ['bodyweight', 'dumbbell'],
    muscleGroups: ['Quads', 'Glutes', 'Hamstrings'],
    defaultSets: 3,
    defaultReps: 12,
    restSeconds: 60,
    instructions: [
      'Stand upright, take a large step forward.',
      'Lower back knee toward floor (don\'t touch).',
      'Push off front foot to step forward.',
      'Alternate legs for each rep.',
    ],
    caloriesPerMinute: 6,
    isTimed: false,
  },

  // ── STRENGTH: CORE ─────────────────────────────────────────────────────────
  {
    id: 'plank',
    name: 'Plank',
    category: 'strength',
    subCategory: 'core',
    difficulty: 'beginner',
    equipment: ['none', 'bodyweight'],
    muscleGroups: ['Core', 'Abs', 'Shoulders'],
    defaultSets: 3,
    defaultDuration: 60,
    restSeconds: 45,
    instructions: [
      'Forearms on ground, elbows under shoulders.',
      'Body forms straight line from head to heels.',
      'Brace abs and glutes throughout.',
      'Hold for specified duration.',
    ],
    tips: ['Don\'t hold breath', 'Keep hips level'],
    caloriesPerMinute: 4,
    isTimed: true,
  },
  {
    id: 'russian-twists',
    name: 'Russian Twists',
    category: 'strength',
    subCategory: 'core',
    difficulty: 'beginner',
    equipment: ['none', 'dumbbell'],
    muscleGroups: ['Obliques', 'Abs'],
    defaultSets: 3,
    defaultReps: 20,
    restSeconds: 45,
    instructions: [
      'Sit on floor, knees bent, lean back 45 degrees.',
      'Lift feet slightly off ground.',
      'Rotate torso left, then right to complete 1 rep.',
      'Add weight for extra challenge.',
    ],
    caloriesPerMinute: 5,
    isTimed: false,
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'strength',
    subCategory: 'core',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Deep Core', 'Abs'],
    defaultSets: 3,
    defaultReps: 10,
    restSeconds: 45,
    instructions: [
      'Lie on back, arms extended to ceiling, knees at 90°.',
      'Lower opposite arm and leg toward floor.',
      'Return to start without letting lower back arch.',
      'Alternate sides.',
    ],
    caloriesPerMinute: 3,
    isTimed: false,
  },

  // ── CARDIO: RUNNING ────────────────────────────────────────────────────────
  {
    id: 'steady-state-run',
    name: 'Steady State Run',
    category: 'cardio',
    subCategory: 'running',
    difficulty: 'beginner',
    equipment: ['none', 'cardio_machine'],
    muscleGroups: ['Legs', 'Core', 'Cardiovascular'],
    defaultSets: 1,
    defaultDuration: 1800, // 30 min
    instructions: [
      'Warm up with 5-minute easy jog.',
      'Maintain conversational pace throughout.',
      'Land mid-foot, not heel.',
      'Keep shoulders relaxed.',
    ],
    tips: ['Aim for 140-150 bpm heart rate', 'Hydrate before and after'],
    caloriesPerMinute: 10,
    isTimed: true,
  },
  {
    id: 'sprint-intervals',
    name: 'Sprint Intervals',
    category: 'cardio',
    subCategory: 'running',
    difficulty: 'advanced',
    equipment: ['none', 'cardio_machine'],
    muscleGroups: ['Legs', 'Glutes', 'Cardiovascular'],
    defaultSets: 8,
    defaultDuration: 30, // 30 sec sprint
    restSeconds: 90,
    instructions: [
      'Sprint at 90-100% max effort for 30 seconds.',
      'Walk or jog lightly for 90 seconds.',
      'Repeat for specified number of rounds.',
      'Warm up for 5 min before starting.',
    ],
    caloriesPerMinute: 15,
    isTimed: true,
  },

  // ── CARDIO: HIIT ───────────────────────────────────────────────────────────
  {
    id: 'burpees',
    name: 'Burpees',
    category: 'cardio',
    subCategory: 'hiit',
    difficulty: 'intermediate',
    equipment: ['none'],
    muscleGroups: ['Full Body', 'Cardiovascular'],
    defaultSets: 5,
    defaultReps: 10,
    restSeconds: 60,
    instructions: [
      'Start standing, jump feet back to push-up position.',
      'Do a push-up (optional but recommended).',
      'Jump feet forward to hands.',
      'Explosively jump up, arms overhead.',
    ],
    caloriesPerMinute: 13,
    isTimed: false,
  },
  {
    id: 'box-jumps',
    name: 'Box Jumps',
    category: 'cardio',
    subCategory: 'hiit',
    difficulty: 'intermediate',
    equipment: ['none'],
    muscleGroups: ['Quads', 'Glutes', 'Calves', 'Cardiovascular'],
    defaultSets: 4,
    defaultReps: 10,
    restSeconds: 60,
    instructions: [
      'Stand in front of a sturdy box/platform.',
      'Load hips, swing arms back.',
      'Explosively jump onto box, landing softly.',
      'Step down (not jump) to protect knees.',
    ],
    caloriesPerMinute: 11,
    isTimed: false,
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    category: 'cardio',
    subCategory: 'hiit',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Core', 'Shoulders', 'Cardiovascular'],
    defaultSets: 3,
    defaultDuration: 40,
    restSeconds: 30,
    instructions: [
      'Start in high plank position.',
      'Drive one knee toward chest.',
      'Quickly alternate legs in a running motion.',
      'Keep hips level throughout.',
    ],
    caloriesPerMinute: 11,
    isTimed: true,
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    category: 'cardio',
    subCategory: 'hiit',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Calves', 'Cardiovascular', 'Coordination'],
    defaultSets: 5,
    defaultDuration: 60,
    restSeconds: 30,
    instructions: [
      'Hold rope handles at hip height.',
      'Swing rope over head, jump with both feet.',
      'Stay on balls of feet, minimal ground contact.',
      'Keep arms relaxed, elbows at sides.',
    ],
    caloriesPerMinute: 12,
    isTimed: true,
  },

  // ── FLEXIBILITY: YOGA ─────────────────────────────────────────────────────
  {
    id: 'downward-dog',
    name: 'Downward Dog',
    category: 'flexibility',
    subCategory: 'yoga',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hamstrings', 'Calves', 'Shoulders', 'Back'],
    defaultSets: 3,
    defaultDuration: 45,
    restSeconds: 15,
    instructions: [
      'Start on hands and knees, tuck toes under.',
      'Lift hips up and back, forming inverted V.',
      'Press hands firmly into mat, spread fingers.',
      'Hold and breathe deeply.',
    ],
    caloriesPerMinute: 3,
    isTimed: true,
  },
  {
    id: 'warrior-pose',
    name: 'Warrior I & II',
    category: 'flexibility',
    subCategory: 'yoga',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hips', 'Glutes', 'Quads', 'Shoulders'],
    defaultSets: 2,
    defaultDuration: 60,
    restSeconds: 15,
    instructions: [
      'Step one foot forward into lunge position.',
      'Warrior I: Raise arms overhead, palms together.',
      'Warrior II: Open hips/arms to sides, gaze forward.',
      'Hold each pose for 30 seconds per side.',
    ],
    caloriesPerMinute: 3,
    isTimed: true,
  },
  {
    id: 'sun-salutation',
    name: 'Sun Salutation',
    category: 'flexibility',
    subCategory: 'yoga',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Full Body'],
    defaultSets: 5,
    defaultDuration: 60,
    restSeconds: 0,
    instructions: [
      'Mountain pose → Forward fold → Half lift.',
      'Plank → Chaturanga → Upward dog.',
      'Downward dog → Step forward → Forward fold.',
      'Rise back to Mountain pose. Breathe with movement.',
    ],
    caloriesPerMinute: 4,
    isTimed: true,
  },

  // ── FLEXIBILITY: STRETCHING ───────────────────────────────────────────────
  {
    id: 'hip-flexor-stretch',
    name: 'Hip Flexor Stretch',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hip Flexors', 'Quads'],
    defaultSets: 3,
    defaultDuration: 45,
    instructions: [
      'Kneel on one knee, other foot forward in lunge.',
      'Shift weight forward until you feel hip stretch.',
      'Keep torso upright, avoid arching back.',
      'Hold for 45 seconds each side.',
    ],
    caloriesPerMinute: 2,
    isTimed: true,
  },
  {
    id: 'hamstring-stretch',
    name: 'Seated Hamstring Stretch',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hamstrings', 'Lower Back'],
    defaultSets: 3,
    defaultDuration: 40,
    instructions: [
      'Sit on floor with legs extended.',
      'Hinge forward at hips, reaching toward feet.',
      'Keep back flat (don\'t round).',
      'Hold the stretch without bouncing.',
    ],
    caloriesPerMinute: 2,
    isTimed: true,
  },
  {
    id: 'thoracic-rotation',
    name: 'Thoracic Rotation',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Thoracic Spine', 'Obliques'],
    defaultSets: 3,
    defaultReps: 10,
    instructions: [
      'Sit cross-legged or in chair.',
      'Place one hand behind head.',
      'Rotate thoracic spine (not just shoulders) open.',
      'Return to center, repeat other side.',
    ],
    caloriesPerMinute: 2,
    isTimed: false,
  },

  // ── SPORTS / FUNCTIONAL ────────────────────────────────────────────────────
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell Swing',
    category: 'sports',
    subCategory: 'functional',
    difficulty: 'intermediate',
    equipment: ['kettlebell'],
    muscleGroups: ['Glutes', 'Hamstrings', 'Core', 'Shoulders'],
    defaultSets: 4,
    defaultReps: 15,
    restSeconds: 60,
    instructions: [
      'Stand with feet slightly wider than shoulder-width.',
      'Hold kettlebell with both hands, hinge at hips.',
      'Swing KB back through legs, then snap hips to drive KB up.',
      'Let KB swing to chest height, then guide back down.',
    ],
    tips: ['Power comes from hips not arms', 'Keep back neutral throughout'],
    caloriesPerMinute: 13,
    isTimed: false,
  },
  {
    id: 'turkish-getup',
    name: 'Turkish Get-Up',
    category: 'sports',
    subCategory: 'functional',
    difficulty: 'advanced',
    equipment: ['kettlebell', 'dumbbell'],
    muscleGroups: ['Full Body', 'Shoulder Stability', 'Core'],
    defaultSets: 3,
    defaultReps: 3,
    restSeconds: 90,
    instructions: [
      'Lie on back, hold KB overhead with one arm, extend leg on same side.',
      'Roll to elbow, then to hand, sweep leg to lunge.',
      'Stand up, keeping arm vertical throughout.',
      'Reverse the movement to return to floor.',
    ],
    tips: ['Start with light weight', 'Never take eyes off the KB'],
    caloriesPerMinute: 8,
    isTimed: false,
  },
  {
    id: 'farmers-walk',
    name: "Farmer's Walk",
    category: 'sports',
    subCategory: 'functional',
    difficulty: 'beginner',
    equipment: ['dumbbell', 'kettlebell'],
    muscleGroups: ['Forearms', 'Traps', 'Core', 'Legs'],
    defaultSets: 4,
    defaultDuration: 30,
    restSeconds: 60,
    instructions: [
      'Hold heavy dumbbells/KBs at sides.',
      'Walk with tall posture for specified distance or time.',
      'Keep shoulders packed down and back.',
      'Take short, controlled steps.',
    ],
    caloriesPerMinute: 8,
    isTimed: true,
  },
  {
    id: 'battle-ropes',
    name: 'Battle Ropes',
    category: 'sports',
    subCategory: 'functional',
    difficulty: 'intermediate',
    equipment: ['none'],
    muscleGroups: ['Arms', 'Shoulders', 'Core', 'Cardiovascular'],
    defaultSets: 5,
    defaultDuration: 20,
    restSeconds: 40,
    instructions: [
      'Grip rope ends, stand in athletic stance.',
      'Create waves by alternating arm movements.',
      'Keep core engaged, slight knee bend.',
      'Maintain consistent, powerful rhythm.',
    ],
    caloriesPerMinute: 14,
    isTimed: true,
  },

  // ── WARM-UP ────────────────────────────────────────────────────────────────
  {
    id: 'warmup-jog',
    name: 'Light Jog / Walk',
    category: 'cardio',
    subCategory: 'running',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Cardiovascular'],
    defaultSets: 1,
    defaultDuration: 300,
    instructions: ['Walk or jog at very easy pace to elevate heart rate.'],
    caloriesPerMinute: 5,
    isTimed: true,
  },
  {
    id: 'arm-circles',
    name: 'Arm Circles',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Shoulders'],
    defaultSets: 2,
    defaultReps: 20,
    instructions: ['Extend arms, make large circles forward then backward.'],
    caloriesPerMinute: 2,
    isTimed: false,
  },
  {
    id: 'leg-swings',
    name: 'Leg Swings',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hip Flexors', 'Hamstrings'],
    defaultSets: 2,
    defaultReps: 15,
    instructions: ['Hold wall for balance, swing leg forward/backward in controlled arc.'],
    caloriesPerMinute: 3,
    isTimed: false,
  },
  {
    id: 'hip-circles',
    name: 'Hip Circles',
    category: 'flexibility',
    subCategory: 'stretching',
    difficulty: 'beginner',
    equipment: ['none'],
    muscleGroups: ['Hips', 'Lower Back'],
    defaultSets: 2,
    defaultReps: 10,
    instructions: ['Hands on hips, make large circles with your hips clockwise then counterclockwise.'],
    caloriesPerMinute: 2,
    isTimed: false,
  },
];

// ─── Lookup helpers ───────────────────────────────────────────────────────────
export function getExerciseById(id: string): ExerciseDef | undefined {
  return EXERCISE_DB.find(e => e.id === id);
}

export function getExercisesByCategory(category: ExerciseDef['category']): ExerciseDef[] {
  return EXERCISE_DB.filter(e => e.category === category);
}

export function getExercisesByDifficulty(difficulty: Difficulty): ExerciseDef[] {
  return EXERCISE_DB.filter(e => e.difficulty === difficulty);
}

// ─── Equipment availability filter ────────────────────────────────────────────
function equipmentMatch(exercise: ExerciseDef, availability: 'gym' | 'home' | 'none'): boolean {
  const gymEquip: Equipment[] = ['barbell', 'machine', 'cable', 'cardio_machine'];
  const homeEquip: Equipment[] = ['dumbbell', 'kettlebell', 'resistance_band', 'bodyweight', 'none'];

  if (availability === 'none') {
    return exercise.equipment.some(e => e === 'none' || e === 'bodyweight');
  }
  if (availability === 'home') {
    return exercise.equipment.some(e => homeEquip.includes(e));
  }
  return true; // gym has everything
}

// ─── Smart Workout Generator ──────────────────────────────────────────────────
export const workoutGenerator = {
  /**
   * Generates a structured workout plan based on user preferences.
   * Returns exercises with warm-up and cool-down.
   */
  generate(config: WorkoutGeneratorConfig): GeneratedWorkout {
    const { category, difficulty, durationMinutes, equipment, goal } = config;

    // Determine exercise category to filter from
    const categoryMap: Record<WorkoutCategory, ExerciseDef['category'][]> = {
      strength: ['strength'],
      cardio:   ['cardio'],
      flexibility: ['flexibility'],
      sports:   ['sports'],
      hiit:     ['cardio'],
      yoga:     ['flexibility'],
      warmup:   ['flexibility', 'cardio'],
      cooldown: ['flexibility'],
    };
    const targetCategories = categoryMap[category] || ['strength'];

    // Filter exercises by category, difficulty, and equipment
    let pool = EXERCISE_DB.filter(e =>
      targetCategories.includes(e.category) &&
      equipmentMatch(e, equipment)
    );

    // For beginner, allow beginner + intermediate; advanced keeps all
    if (difficulty === 'beginner') {
      pool = pool.filter(e => e.difficulty === 'beginner');
    } else if (difficulty === 'intermediate') {
      pool = pool.filter(e => e.difficulty !== 'advanced');
    }

    // Estimate exercise time (sets × (rest + avg set time))
    const estimateExerciseMinutes = (ex: ExerciseDef): number => {
      const sets = ex.defaultSets || 3;
      const setTime = ex.isTimed ? (ex.defaultDuration || 30) : 40; // ~40s per set
      const rest = ex.restSeconds || 60;
      return ((sets * setTime) + (sets * rest)) / 60;
    };

    // Determine how many exercises fit in duration (leaving ~10 min for warmup/cooldown)
    const mainMinutes = durationMinutes - (durationMinutes >= 30 ? 10 : 5);

    // Select exercises — bias by subCategory for strength workouts
    let selected: ExerciseDef[] = [];
    let minutesUsed = 0;

    // Shuffle pool for variety
    const shuffled = [...pool].sort(() => Math.random() - 0.5);

    // For strength, ensure balanced push/pull/legs
    if (category === 'strength') {
      const subs = ['push', 'pull', 'legs', 'core'] as const;
      for (const sub of subs) {
        const subPool = shuffled.filter(e => e.subCategory === sub);
        const pick = subPool.slice(0, 2);
        for (const ex of pick) {
          const mins = estimateExerciseMinutes(ex);
          if (minutesUsed + mins <= mainMinutes) {
            selected.push(ex);
            minutesUsed += mins;
          }
        }
      }
    } else {
      for (const ex of shuffled) {
        const mins = estimateExerciseMinutes(ex);
        if (minutesUsed + mins <= mainMinutes) {
          selected.push(ex);
          minutesUsed += mins;
        }
        if (selected.length >= 8) break;
      }
    }

    // Goal-based name generation
    const nameMap: Partial<Record<WorkoutCategory, string>> = {
      strength: goal === 'build_muscle' ? 'Hypertrophy Session' : 'Strength Training',
      cardio:   goal === 'lose_weight'  ? 'Fat Burning Cardio'  : 'Cardio Session',
      flexibility: 'Flexibility & Mobility',
      sports:   'Functional Training',
      hiit:     'HIIT Circuit',
      yoga:     'Yoga Flow',
    };
    const planName = nameMap[category] || 'Custom Workout';

    // Warm-up exercises (always include for sessions ≥20 min)
    const warmup: ExerciseDef[] = durationMinutes >= 20
      ? EXERCISE_DB.filter(e => ['warmup-jog', 'arm-circles', 'leg-swings', 'hip-circles'].includes(e.id))
      : [];

    // Cool-down exercises
    const cooldown: ExerciseDef[] = durationMinutes >= 30
      ? EXERCISE_DB.filter(e => ['hip-flexor-stretch', 'hamstring-stretch', 'downward-dog'].includes(e.id))
      : [];

    // Estimate calories: average of all exercise calorie rates × duration
    const avgCalsPerMin = selected.reduce((s, e) => s + (e.caloriesPerMinute || 6), 0) / Math.max(selected.length, 1);
    const totalCalories = Math.round(avgCalsPerMin * durationMinutes * 0.8);

    return {
      name: planName,
      category,
      estimatedDuration: durationMinutes,
      estimatedCalories: totalCalories,
      exercises: selected,
      warmup,
      cooldown,
    };
  },

  /**
   * Quick workouts for specific goals (pre-configured plans).
   */
  getQuickPlans(): Array<{ name: string; category: WorkoutCategory; duration: number; description: string; icon: string }> {
    return [
      { name: 'Push Day',       category: 'strength',    duration: 60, description: 'Chest, Shoulders & Triceps',  icon: '💪' },
      { name: 'Pull Day',       category: 'strength',    duration: 60, description: 'Back, Biceps & Rear Delts',   icon: '🔙' },
      { name: 'Leg Day',        category: 'strength',    duration: 60, description: 'Quads, Hamstrings & Glutes',  icon: '🦵' },
      { name: 'HIIT Blast',     category: 'hiit',        duration: 30, description: 'High-intensity fat burner',   icon: '🔥' },
      { name: 'Morning Yoga',   category: 'yoga',        duration: 30, description: 'Flexibility & mindfulness',   icon: '🧘' },
      { name: 'Core Focus',     category: 'strength',    duration: 20, description: 'Abs, obliques & stability',   icon: '🎯' },
      { name: 'Cardio Run',     category: 'cardio',      duration: 45, description: 'Steady-state endurance',      icon: '🏃' },
      { name: 'Functional',     category: 'sports',      duration: 45, description: 'Full-body functional moves',  icon: '⚡' },
    ];
  },
};
