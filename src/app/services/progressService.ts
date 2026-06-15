// ============================================================
// Fit Tracker PRO — Progress Service
// Manages:
//   • Personal Records (PRs) per exercise
//   • Workout sessions from the new builder
//   • Body measurement logs
//   • Strength progress charts
// ============================================================
import type { PersonalRecord, WorkoutSession, BodyMeasurement, ExerciseLog } from '../types';

// ─── Storage keys ─────────────────────────────────────────────────────────────
const PR_KEY = (uid: string) => `fit_prs_${uid}`;
const SESSION_KEY = (uid: string) => `fit_sessions_${uid}`;
const MEASUREMENT_KEY = (uid: string) => `fit_measurements_${uid}`;

// ─── Personal Records ─────────────────────────────────────────────────────────
export const prService = {
  /** Load all PRs for a user */
  getPRs(userId: string): PersonalRecord[] {
    return JSON.parse(localStorage.getItem(PR_KEY(userId)) || '[]');
  },

  /** Get PR for a specific exercise */
  getPR(userId: string, exerciseId: string, type: PersonalRecord['type']): PersonalRecord | null {
    const prs = prService.getPRs(userId);
    return prs.find(p => p.exerciseId === exerciseId && p.type === type) || null;
  },

  /**
   * Check if an exercise log contains new PRs.
   * Returns array of exercise names that hit new records.
   */
  checkAndSavePRs(userId: string, exerciseLogs: ExerciseLog[], workoutId: string): string[] {
    const prs = prService.getPRs(userId);
    const newPRNames: string[] = [];

    for (const log of exerciseLogs) {
      if (!log.sets?.length) continue;
      const completedSets = log.sets.filter(s => s.completed);
      if (!completedSets.length) continue;

      if (log.isTimed) {
        // Track max duration
        const maxDuration = Math.max(...completedSets.map(s => s.duration || 0));
        if (maxDuration > 0) {
          const existing = prs.find(p => p.exerciseId === log.exerciseId && p.type === 'duration');
          if (!existing || maxDuration > existing.value) {
            const newPR: PersonalRecord = {
              id: crypto.randomUUID(),
              userId,
              exerciseId: log.exerciseId,
              exerciseName: log.exerciseName,
              type: 'duration',
              value: maxDuration,
              unit: 'seconds',
              date: new Date().toISOString(),
              workoutId,
            };
            if (existing) {
              const idx = prs.findIndex(p => p.id === existing.id);
              prs[idx] = newPR;
            } else {
              prs.push(newPR);
            }
            newPRNames.push(log.exerciseName);
          }
        }
      } else {
        // Track max weight lifted in a set
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        if (maxWeight > 0) {
          const existing = prs.find(p => p.exerciseId === log.exerciseId && p.type === 'weight');
          if (!existing || maxWeight > existing.value) {
            const newPR: PersonalRecord = {
              id: crypto.randomUUID(),
              userId,
              exerciseId: log.exerciseId,
              exerciseName: log.exerciseName,
              type: 'weight',
              value: maxWeight,
              unit: 'kg',
              date: new Date().toISOString(),
              workoutId,
            };
            if (existing) {
              const idx = prs.findIndex(p => p.id === existing.id);
              prs[idx] = newPR;
            } else {
              prs.push(newPR);
            }
            newPRNames.push(log.exerciseName);
          }
        }

        // Track max reps in a single set
        const maxReps = Math.max(...completedSets.map(s => s.reps || 0));
        if (maxReps > 0) {
          const existing = prs.find(p => p.exerciseId === log.exerciseId && p.type === 'reps');
          if (!existing || maxReps > existing.value) {
            const newPR: PersonalRecord = {
              id: crypto.randomUUID(),
              userId,
              exerciseId: log.exerciseId,
              exerciseName: log.exerciseName,
              type: 'reps',
              value: maxReps,
              unit: 'reps',
              date: new Date().toISOString(),
              workoutId,
            };
            if (existing) {
              const idx = prs.findIndex(p => p.id === existing.id);
              prs[idx] = newPR;
            } else {
              prs.push(newPR);
            }
            // Only add once (weight PR takes priority over reps for same exercise)
            if (!newPRNames.includes(log.exerciseName)) {
              newPRNames.push(log.exerciseName);
            }
          }
        }
      }
    }

    localStorage.setItem(PR_KEY(userId), JSON.stringify(prs));
    return [...new Set(newPRNames)]; // deduplicate
  },

  /** Get all PRs sorted by recency */
  getRecentPRs(userId: string, limit = 5): PersonalRecord[] {
    return prService.getPRs(userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  },

  /** Delete a PR (if user wants to reset) */
  deletePR(userId: string, prId: string): void {
    const prs = prService.getPRs(userId).filter(p => p.id !== prId);
    localStorage.setItem(PR_KEY(userId), JSON.stringify(prs));
  },
};

// ─── Workout Sessions (enhanced tracking from builder) ────────────────────────
export const sessionService = {
  /** Save a completed workout session */
  saveSession(session: WorkoutSession): void {
    const all = sessionService.getSessions(session.userId);
    localStorage.setItem(SESSION_KEY(session.userId), JSON.stringify([session, ...all]));
  },

  /** Get all sessions for a user */
  getSessions(userId: string): WorkoutSession[] {
    return JSON.parse(localStorage.getItem(SESSION_KEY(userId)) || '[]')
      .sort((a: WorkoutSession, b: WorkoutSession) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
  },

  /** Get sessions in a date range */
  getSessionsInRange(userId: string, startDate: Date, endDate: Date): WorkoutSession[] {
    return sessionService.getSessions(userId).filter(s => {
      const d = new Date(s.startTime);
      return d >= startDate && d <= endDate;
    });
  },

  /** Delete a session */
  deleteSession(userId: string, sessionId: string): void {
    const all = sessionService.getSessions(userId).filter(s => s.id !== sessionId);
    localStorage.setItem(SESSION_KEY(userId), JSON.stringify(all));
  },

  /** Get strength progress for a specific exercise over time */
  getStrengthProgress(userId: string, exerciseName: string): Array<{ date: string; maxWeight: number; totalVolume: number }> {
    return sessionService.getSessions(userId)
      .map(session => {
        const log = session.exerciseLogs?.find(l =>
          l.exerciseName.toLowerCase() === exerciseName.toLowerCase()
        );
        if (!log) return null;
        const completedSets = log.sets.filter(s => s.completed);
        const maxWeight = Math.max(...completedSets.map(s => s.weight || 0));
        const totalVolume = completedSets.reduce((sum, s) => sum + ((s.weight || 0) * (s.reps || 0)), 0);
        return {
          date: new Date(session.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          maxWeight,
          totalVolume,
        };
      })
      .filter(Boolean) as Array<{ date: string; maxWeight: number; totalVolume: number }>;
  },

  /** Aggregate stats from sessions */
  getSessionStats(userId: string, days = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const sessions = sessionService.getSessionsInRange(userId, cutoff, new Date());

    const categoryCount = sessions.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions: sessions.length,
      totalMinutes: sessions.reduce((s, w) => s + (w.duration || 0), 0),
      totalCalories: sessions.reduce((s, w) => s + (w.totalCalories || 0), 0),
      categoryBreakdown: categoryCount,
    };
  },
};

// ─── Body Measurements ────────────────────────────────────────────────────────
export const measurementService = {
  /** Save a new body measurement */
  saveMeasurement(measurement: Omit<BodyMeasurement, 'id'>): BodyMeasurement {
    const all = measurementService.getMeasurements(measurement.userId);
    const newM: BodyMeasurement = { ...measurement, id: crypto.randomUUID() };
    localStorage.setItem(MEASUREMENT_KEY(measurement.userId), JSON.stringify([newM, ...all]));
    return newM;
  },

  /** Get all measurements for a user */
  getMeasurements(userId: string): BodyMeasurement[] {
    return JSON.parse(localStorage.getItem(MEASUREMENT_KEY(userId)) || '[]')
      .sort((a: BodyMeasurement, b: BodyMeasurement) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
  },

  /** Get weight trend data for chart */
  getWeightTrend(userId: string, limit = 10): Array<{ date: string; weight: number }> {
    return measurementService.getMeasurements(userId)
      .filter(m => m.weight !== undefined)
      .slice(0, limit)
      .reverse()
      .map(m => ({
        date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        weight: m.weight!,
      }));
  },
};
