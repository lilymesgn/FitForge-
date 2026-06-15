// ============================================================
// Fit Tracker PRO — Habit & Streak Service
// Tracks:
//   • Daily workout streaks (current + longest)
//   • Weekly workout goals
//   • Training balance analysis
//   • Smart notification logic (behavior-based, not generic)
//   • AI-style behavioral insights
// ============================================================
import type { HabitStats, AIInsight, Workout } from '../types';
import type { WorkoutSession } from '../types';

// ─── Streak Calculation ───────────────────────────────────────────────────────
export const habitService = {
  /**
   * Compute full habit stats from combined workout history.
   * Accepts both legacy Workouts and new WorkoutSessions.
   */
  getHabitStats(
    userId: string,
    legacyWorkouts: Workout[],
    sessions: WorkoutSession[],
    weeklyGoal = 4
  ): HabitStats {
    // Combine all workout dates from both sources
    const allDates: Date[] = [
      ...legacyWorkouts.map(w => new Date(w.date)),
      ...sessions.map(s => new Date(s.startTime)),
    ].sort((a, b) => b.getTime() - a.getTime());

    if (allDates.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        weeklyWorkouts: 0,
        weeklyGoal,
        lastWorkoutDate: null,
        daysSinceCardio: null,
        daysSinceStrength: null,
        daysSinceFlexibility: null,
        workoutBalance: { strength: 0, cardio: 0, flexibility: 0, sports: 0 },
      };
    }

    // ── Current streak ─────────────────────────────────────────────────────
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set(allDates.map(d => {
      const copy = new Date(d);
      copy.setHours(0, 0, 0, 0);
      return copy.getTime();
    }));

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      if (uniqueDays.has(checkDate.getTime())) {
        currentStreak++;
      } else if (i > 0) {
        break; // Gap in streak
      }
    }

    // ── Longest streak ─────────────────────────────────────────────────────
    const sortedDays = [...uniqueDays].sort();
    let longestStreak = 0;
    let tempStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (sortedDays[i] - sortedDays[i - 1]) / 86400000;
      if (diff === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak, 1);

    // ── Weekly workouts (this calendar week Mon-Sun) ───────────────────────
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
    const weeklyWorkouts = allDates.filter(d => {
      const day = new Date(d);
      day.setHours(0, 0, 0, 0);
      return day >= startOfWeek;
    }).length;

    // ── Last workout date ──────────────────────────────────────────────────
    const lastWorkoutDate = allDates.length > 0 ? allDates[0].toISOString() : null;

    // ── Category balance (last 30 days) ───────────────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const balance = { strength: 0, cardio: 0, flexibility: 0, sports: 0 };

    // From legacy workouts
    legacyWorkouts.filter(w => new Date(w.date) >= thirtyDaysAgo).forEach(w => {
      const cat = (w.category || '').toLowerCase();
      if (cat === 'strength' || cat === 'core') balance.strength++;
      else if (cat === 'cardio' || cat === 'hiit') balance.cardio++;
      else if (cat === 'flexibility' || cat === 'yoga') balance.flexibility++;
      else balance.strength++; // default to strength
    });

    // From sessions
    sessions.filter(s => new Date(s.startTime) >= thirtyDaysAgo).forEach(s => {
      const cat = s.category;
      if (cat === 'strength') balance.strength++;
      else if (cat === 'cardio' || cat === 'hiit') balance.cardio++;
      else if (cat === 'flexibility' || cat === 'yoga') balance.flexibility++;
      else if (cat === 'sports') balance.sports++;
    });

    // ── Days since each category ───────────────────────────────────────────
    const daysSince = (category: string): number | null => {
      const workoutsInCat = [
        ...legacyWorkouts.filter(w => {
          const cat = (w.category || '').toLowerCase();
          return cat === category || (category === 'cardio' && cat === 'hiit');
        }).map(w => new Date(w.date)),
        ...sessions.filter(s => {
          const cat = s.category;
          return cat === category || (category === 'cardio' && (cat === 'hiit' || cat === 'cardio'));
        }).map(s => new Date(s.startTime)),
      ];
      if (workoutsInCat.length === 0) return null;
      const lastDate = new Date(Math.max(...workoutsInCat.map(d => d.getTime())));
      return Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    };

    return {
      currentStreak,
      longestStreak,
      weeklyWorkouts,
      weeklyGoal,
      lastWorkoutDate,
      daysSinceCardio:     daysSince('cardio'),
      daysSinceStrength:   daysSince('strength'),
      daysSinceFlexibility: daysSince('flexibility'),
      workoutBalance: balance,
    };
  },

  /**
   * Generate behavior-based AI insights (rule engine, no API needed).
   * These are smart, personalized suggestions based on actual usage patterns.
   */
  generateInsights(habits: HabitStats, totalWorkouts: number): AIInsight[] {
    const insights: AIInsight[] = [];
    const { currentStreak, weeklyWorkouts, weeklyGoal, workoutBalance,
            daysSinceCardio, daysSinceStrength, daysSinceFlexibility } = habits;

    // ── Streak highlights ──────────────────────────────────────────────────
    if (currentStreak >= 7) {
      insights.push({
        id: 'streak-7',
        type: 'success',
        icon: '🔥',
        title: `${currentStreak}-day streak!`,
        message: 'Incredible consistency. Your discipline is building real results.',
      });
    } else if (currentStreak === 0) {
      insights.push({
        id: 'streak-broken',
        type: 'warning',
        icon: '⚡',
        title: 'Time to restart your streak',
        message: 'Every champion takes rest days. Get back in today — your body is ready.',
        action: { label: 'Start Workout', route: '/workout' },
      });
    }

    // ── Weekly goal progress ───────────────────────────────────────────────
    const weekRemaining = weeklyGoal - weeklyWorkouts;
    if (weekRemaining > 0) {
      insights.push({
        id: 'weekly-goal',
        type: weekRemaining <= 1 ? 'info' : 'tip',
        icon: '🎯',
        title: `${weekRemaining} workout${weekRemaining > 1 ? 's' : ''} to hit weekly goal`,
        message: weekRemaining === 1
          ? 'One more session and you hit your weekly goal! Push through.'
          : `You're at ${weeklyWorkouts}/${weeklyGoal} this week. Stay on track.`,
        action: { label: 'Log Workout', route: '/workout' },
      });
    } else if (weeklyWorkouts >= weeklyGoal) {
      insights.push({
        id: 'weekly-done',
        type: 'success',
        icon: '✅',
        title: 'Weekly goal achieved!',
        message: `${weeklyWorkouts}/${weeklyGoal} workouts done. Outstanding commitment!`,
      });
    }

    // ── Cardio balance warning ─────────────────────────────────────────────
    if (daysSinceCardio !== null && daysSinceCardio >= 5) {
      insights.push({
        id: 'cardio-warning',
        type: 'warning',
        icon: '🏃',
        title: `No cardio for ${daysSinceCardio} days`,
        message: 'Cardiovascular health needs regular attention. A 20-min session will do.',
        action: { label: 'Start Cardio', route: '/workout' },
      });
    } else if (daysSinceCardio === null && totalWorkouts >= 5) {
      insights.push({
        id: 'no-cardio',
        type: 'warning',
        icon: '❤️',
        title: 'No cardio logged yet',
        message: 'Mix in some cardio for heart health and fat burning.',
        action: { label: 'Try HIIT', route: '/workout' },
      });
    }

    // ── Flexibility reminder ───────────────────────────────────────────────
    if (workoutBalance.flexibility === 0 && totalWorkouts >= 4) {
      insights.push({
        id: 'flexibility-tip',
        type: 'tip',
        icon: '🧘',
        title: 'Add flexibility training',
        message: 'Stretching reduces injury risk and improves performance. Try a 20-min yoga session.',
        action: { label: 'Start Yoga', route: '/workout' },
      });
    } else if (daysSinceFlexibility !== null && daysSinceFlexibility >= 7) {
      insights.push({
        id: 'flexibility-gap',
        type: 'tip',
        icon: '🧘',
        title: `No flexibility work for ${daysSinceFlexibility} days`,
        message: 'Your muscles need to recover properly. Schedule a stretching session.',
      });
    }

    // ── Overtraining warning ───────────────────────────────────────────────
    if (currentStreak >= 7 && daysSinceFlexibility !== null && daysSinceFlexibility >= 7) {
      insights.push({
        id: 'overtraining',
        type: 'warning',
        icon: '😴',
        title: 'Consider a recovery day',
        message: 'Great streak! But recovery is where gains happen. A light yoga or rest day will boost performance.',
      });
    }

    // ── Balance insight ────────────────────────────────────────────────────
    const total = workoutBalance.strength + workoutBalance.cardio + workoutBalance.flexibility + workoutBalance.sports;
    if (total >= 6 && workoutBalance.strength / total > 0.8) {
      insights.push({
        id: 'strength-heavy',
        type: 'tip',
        icon: '⚖️',
        title: 'Training imbalance detected',
        message: '80%+ of your sessions are strength. Add some cardio and flexibility for balanced fitness.',
      });
    }

    // ── First workout motivation ───────────────────────────────────────────
    if (totalWorkouts === 0) {
      insights.push({
        id: 'first-workout',
        type: 'info',
        icon: '🚀',
        title: 'Ready to start your journey?',
        message: 'Log your first workout today. The hardest part is just showing up.',
        action: { label: 'Start Now', route: '/workout' },
      });
    }

    return insights.slice(0, 4); // Limit to 4 insights
  },

  /**
   * Get smart notification message based on behavior.
   * Returns null if no notification is needed.
   */
  getSmartNotification(habits: HabitStats): string | null {
    const { currentStreak, daysSinceCardio, weeklyWorkouts, weeklyGoal, lastWorkoutDate } = habits;

    if (!lastWorkoutDate) return 'Start your fitness journey today! 💪';

    const daysSinceLast = Math.floor(
      (new Date().getTime() - new Date(lastWorkoutDate).getTime()) / 86400000
    );

    if (daysSinceLast === 1 && currentStreak > 0) {
      return `${currentStreak}-day streak! Keep it going 🔥`;
    }
    if (daysSinceLast === 2) {
      return 'You missed yesterday. Don\'t lose your progress! 💪';
    }
    if (daysSinceLast >= 3) {
      return `It's been ${daysSinceLast} days. Your muscles are rested — let's go! 🚀`;
    }
    if (daysSinceCardio !== null && daysSinceCardio >= 5) {
      return 'Your cardio is overdue! 15 min of HIIT burns 200+ calories 🏃';
    }
    if (weeklyWorkouts >= weeklyGoal) {
      return `Weekly goal crushed! ${weeklyWorkouts}/${weeklyGoal} workouts ✅`;
    }

    return null;
  },
};
