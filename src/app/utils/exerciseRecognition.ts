// ============================================================
// Fit Tracker PRO — Exercise Recognition & Form Analysis Utils
// Uses MoveNet keypoints to detect exercises and analyze form.
// ============================================================

// MoveNet keypoint indices
export const KP = {
  NOSE: 0,
  LEFT_EYE: 1, RIGHT_EYE: 2,
  LEFT_EAR: 3, RIGHT_EAR: 4,
  LEFT_SHOULDER: 5, RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7, RIGHT_ELBOW: 8,
  LEFT_WRIST: 9, RIGHT_WRIST: 10,
  LEFT_HIP: 11, RIGHT_HIP: 12,
  LEFT_KNEE: 13, RIGHT_KNEE: 14,
  LEFT_ANKLE: 15, RIGHT_ANKLE: 16,
} as const;

export interface Keypoint {
  x: number;
  y: number;
  score: number;
}

/** Calculate the angle (degrees) at point B formed by A-B-C */
export function calculateAngle(A: Keypoint, B: Keypoint, C: Keypoint): number {
  const AB = { x: A.x - B.x, y: A.y - B.y };
  const CB = { x: C.x - B.x, y: C.y - B.y };
  const dot = AB.x * CB.x + AB.y * CB.y;
  const magAB = Math.hypot(AB.x, AB.y);
  const magCB = Math.hypot(CB.x, CB.y);
  if (magAB === 0 || magCB === 0) return 0;
  const cosAngle = Math.max(-1, Math.min(1, dot / (magAB * magCB)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/** Check if a keypoint has sufficient confidence to use */
export function isVisible(kp: Keypoint, threshold = 0.3): boolean {
  return kp.score >= threshold;
}

// ─── Rep Counting ─────────────────────────────────────────────────────────────
export type ExerciseType =
  | 'bicep_curl'
  | 'squat'
  | 'push_up'
  | 'overhead_press'
  | 'lateral_raise';

interface RepState {
  count: number;
  phase: 'up' | 'down' | 'neutral';
}

const repStates: Record<string, RepState> = {};

/**
 * Count reps for a given exercise by tracking joint angles.
 * Returns the updated total rep count.
 */
export function countRep(
  exercise: ExerciseType,
  keypoints: Keypoint[],
  sessionId: string
): number {
  if (!repStates[sessionId]) repStates[sessionId] = { count: 0, phase: 'neutral' };
  const state = repStates[sessionId];

  const kp = keypoints;

  if (exercise === 'bicep_curl') {
    // Track left elbow angle: shoulder → elbow → wrist
    const ls = kp[KP.LEFT_SHOULDER];
    const le = kp[KP.LEFT_ELBOW];
    const lw = kp[KP.LEFT_WRIST];
    if (!isVisible(ls) || !isVisible(le) || !isVisible(lw)) return state.count;

    const angle = calculateAngle(ls, le, lw);
    if (angle < 60 && state.phase !== 'down') {
      state.phase = 'down'; // Curled up
    } else if (angle > 150 && state.phase === 'down') {
      state.phase = 'up';
      state.count++; // Completed rep
    }
  } else if (exercise === 'squat') {
    // Track knee angle: hip → knee → ankle
    const lh = kp[KP.LEFT_HIP];
    const lk = kp[KP.LEFT_KNEE];
    const la = kp[KP.LEFT_ANKLE];
    if (!isVisible(lh) || !isVisible(lk) || !isVisible(la)) return state.count;

    const angle = calculateAngle(lh, lk, la);
    if (angle < 100 && state.phase !== 'down') {
      state.phase = 'down'; // Squatting
    } else if (angle > 160 && state.phase === 'down') {
      state.phase = 'up';
      state.count++;
    }
  } else if (exercise === 'push_up') {
    // Track elbow angle: shoulder → elbow → wrist
    const ls = kp[KP.LEFT_SHOULDER];
    const le = kp[KP.LEFT_ELBOW];
    const lw = kp[KP.LEFT_WRIST];
    if (!isVisible(ls) || !isVisible(le) || !isVisible(lw)) return state.count;

    const angle = calculateAngle(ls, le, lw);
    if (angle < 90 && state.phase !== 'down') {
      state.phase = 'down';
    } else if (angle > 155 && state.phase === 'down') {
      state.phase = 'up';
      state.count++;
    }
  } else if (exercise === 'overhead_press') {
    // Track shoulder → elbow → wrist angle
    const ls = kp[KP.LEFT_SHOULDER];
    const le = kp[KP.LEFT_ELBOW];
    const lw = kp[KP.LEFT_WRIST];
    if (!isVisible(ls) || !isVisible(le) || !isVisible(lw)) return state.count;

    const angle = calculateAngle(ls, le, lw);
    if (angle > 155 && state.phase !== 'up') {
      state.phase = 'up';
    } else if (angle < 90 && state.phase === 'up') {
      state.phase = 'down';
      state.count++;
    }
  } else if (exercise === 'lateral_raise') {
    // Track shoulder → elbow angle relative to body axis
    const ls = kp[KP.LEFT_SHOULDER];
    const rs = kp[KP.RIGHT_SHOULDER];
    const lh = kp[KP.LEFT_HIP];
    if (!isVisible(ls) || !isVisible(rs) || !isVisible(lh)) return state.count;

    // Simple: if wrists are above shoulders → up
    const lw = kp[KP.LEFT_WRIST];
    if (!isVisible(lw)) return state.count;
    if (lw.y < ls.y && state.phase !== 'up') {
      state.phase = 'up';
    } else if (lw.y > ls.y + 20 && state.phase === 'up') {
      state.phase = 'down';
      state.count++;
    }
  }

  return state.count;
}

/** Reset rep counter for a session */
export function resetReps(sessionId: string): void {
  delete repStates[sessionId];
}

// ─── Form Analysis ────────────────────────────────────────────────────────────
export interface FormFeedback {
  isGoodForm: boolean;
  score: number;
  messages: string[];
}

export function analyzeForm(exercise: ExerciseType, keypoints: Keypoint[]): FormFeedback {
  const kp = keypoints;
  const messages: string[] = [];
  let score = 100;

  if (exercise === 'squat') {
    // Knee should not go too far past toes (check x alignment)
    const lk = kp[KP.LEFT_KNEE];
    const la = kp[KP.LEFT_ANKLE];
    const ls = kp[KP.LEFT_SHOULDER];
    const lh = kp[KP.LEFT_HIP];

    if (isVisible(lk) && isVisible(la)) {
      if (lk.x > la.x + 30) {
        messages.push('⚠️ Knees going too far forward — push them outward');
        score -= 20;
      } else {
        messages.push('✅ Knee tracking looks good');
      }
    }
    if (isVisible(ls) && isVisible(lh)) {
      const backAngle = Math.abs(ls.x - lh.x);
      if (backAngle > 50) {
        messages.push('⚠️ Keep your back more upright');
        score -= 20;
      } else {
        messages.push('✅ Good back posture');
      }
    }

  } else if (exercise === 'push_up') {
    const ls = kp[KP.LEFT_SHOULDER];
    const lh = kp[KP.LEFT_HIP];
    const la = kp[KP.LEFT_ANKLE];

    if (isVisible(ls) && isVisible(lh) && isVisible(la)) {
      // Body should be straight — check Y alignment
      const avgY = (ls.y + la.y) / 2;
      const deviation = Math.abs(lh.y - avgY);
      if (deviation > 40) {
        messages.push('⚠️ Keep hips level — don\'t sag or pike');
        score -= 25;
      } else {
        messages.push('✅ Great plank position');
      }
    }
    const le = kp[KP.LEFT_ELBOW];
    const lw = kp[KP.LEFT_WRIST];
    if (isVisible(ls) && isVisible(le) && isVisible(lw)) {
      const elbow_angle = calculateAngle(ls, le, lw);
      if (elbow_angle < 45) {
        messages.push('⚠️ Elbows flaring — keep them closer to body');
        score -= 15;
      } else {
        messages.push('✅ Elbow angle is correct');
      }
    }

  } else if (exercise === 'bicep_curl') {
    const ls = kp[KP.LEFT_SHOULDER];
    const le = kp[KP.LEFT_ELBOW];

    if (isVisible(ls) && isVisible(le)) {
      // Elbow should stay close to body (similar X position)
      if (Math.abs(le.x - ls.x) > 50) {
        messages.push('⚠️ Keep your elbow tucked in — avoid swinging');
        score -= 20;
      } else {
        messages.push('✅ Good elbow position');
      }
    }
    messages.push('💡 Control the negative (lowering) phase for best results');

  } else if (exercise === 'overhead_press') {
    const ls = kp[KP.LEFT_SHOULDER];
    const lw = kp[KP.LEFT_WRIST];
    const lh = kp[KP.LEFT_HIP];

    if (isVisible(ls) && isVisible(lw)) {
      // Wrists should be directly above shoulders at top
      if (Math.abs(lw.x - ls.x) > 40) {
        messages.push('⚠️ Press the bar directly overhead — arms too wide');
        score -= 20;
      } else {
        messages.push('✅ Good overhead position');
      }
    }
    if (isVisible(ls) && isVisible(lh)) {
      // Don't lean back excessively
      if (ls.x > lh.x + 30) {
        messages.push('⚠️ Avoid leaning back — engage your core');
        score -= 15;
      } else {
        messages.push('✅ Core stability looks solid');
      }
    }

  } else {
    messages.push('✅ Maintain steady form throughout the movement');
    messages.push('💡 Focus on controlled, deliberate motion');
  }

  const finalScore = Math.max(0, score);
  return {
    isGoodForm: finalScore >= 70,
    score: finalScore,
    messages,
  };
}

// ─── COCO-SSD Food Calorie Map ────────────────────────────────────────────────
export const FOOD_CALORIES: Record<string, { name: string; calories: number; portion: string }> = {
  banana: { name: 'Banana', calories: 89, portion: '1 medium (118g)' },
  apple: { name: 'Apple', calories: 95, portion: '1 medium (182g)' },
  sandwich: { name: 'Sandwich', calories: 350, portion: '1 sandwich' },
  orange: { name: 'Orange', calories: 62, portion: '1 medium (131g)' },
  broccoli: { name: 'Broccoli', calories: 55, portion: '1 cup (91g)' },
  carrot: { name: 'Carrot', calories: 52, portion: '1 medium (61g)' },
  'hot dog': { name: 'Hot Dog', calories: 290, portion: '1 hot dog' },
  pizza: { name: 'Pizza Slice', calories: 285, portion: '1 slice' },
  donut: { name: 'Donut', calories: 452, portion: '1 glazed donut' },
  cake: { name: 'Cake', calories: 395, portion: '1 slice (100g)' },
  cup: { name: 'Drink (Cup)', calories: 15, portion: '1 cup' },
  bowl: { name: 'Bowl (mixed)', calories: 300, portion: '1 bowl' },
  bottle: { name: 'Bottled Drink', calories: 150, portion: '1 bottle (500ml)' },
  'wine glass': { name: 'Wine', calories: 125, portion: '1 glass (150ml)' },
};
