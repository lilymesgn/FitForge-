// ============================================================
// Fit Tracker PRO — Notification Service
// Handles browser Web Notifications API for activity tracking
// alerts, workout reminders, and background tracking status.
//
// NEW: Daily reminder scheduling (meal logging + workout).
// Since this is a web app without a push server, reminders
// are checked locally (on load + every minute while the tab
// is open + on visibility change) against a "fired today"
// flag in localStorage so each reminder fires at most once
// per day, at-or-after its configured time.
// ============================================================

const PERMISSION_ASKED_KEY = 'fit_notification_permission_asked';

// ─── Reminder settings ─────────────────────────────────────────────────────
export interface ReminderSettings {
  mealRemindersEnabled: boolean;
  workoutRemindersEnabled: boolean;
  mealReminderTime: string;    // "HH:MM", 24-hour
  workoutReminderTime: string; // "HH:MM", 24-hour
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  mealRemindersEnabled: true,
  workoutRemindersEnabled: true,
  mealReminderTime: '19:00',
  workoutReminderTime: '18:00',
};

function settingsKey(userId: string): string {
  return `fit_reminder_settings_${userId}`;
}

function firedKey(userId: string, type: 'meal' | 'workout', dateKey: string): string {
  return `fit_reminder_fired_${type}_${userId}_${dateKey}`;
}

/** Parse "HH:MM" into total minutes since midnight */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function currentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}


export const notificationService = {
  /**
   * Request notification permission on first app launch.
   * Returns true if granted, false otherwise.
   */
  async requestPermission(): Promise<boolean> {
    // Only request in browser environments that support Notification API
    if (!('Notification' in window)) return false;

    // Already granted
    if (Notification.permission === 'granted') return true;

    // Already denied — do not re-ask
    if (Notification.permission === 'denied') return false;

    // Mark that we've asked so we don't ask again on every refresh
    const alreadyAsked = localStorage.getItem(PERMISSION_ASKED_KEY);
    if (alreadyAsked) return false; // permission is 'default' at this point (not granted/denied)

    localStorage.setItem(PERMISSION_ASKED_KEY, 'true');
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  /** Check if notifications are currently permitted */
  isPermitted(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  /**
   * Show a persistent notification that background activity tracking is active.
   * Uses the 'tag' option so duplicate notifications are replaced, not stacked.
   */
  showTrackingNotification(activityType: string = 'Activity'): void {
    if (!notificationService.isPermitted()) return;
    try {
      new Notification(`${activityType} Tracking Active 🏃`, {
        body: 'Fit Tracker PRO is monitoring your activity in the background.',
        icon: '/favicon.ico',
        tag: 'fit-tracking-active',       // replaces previous notification with same tag
        requireInteraction: true,         // stays until dismissed
        silent: true,
      });
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  /** Dismiss the active tracking notification */
  dismissTrackingNotification(): void {
    // Web Notifications API doesn't support programmatic dismiss,
    // but sending a new notification with same tag without requireInteraction
    // effectively replaces and allows auto-dismiss.
    if (!notificationService.isPermitted()) return;
    try {
      const n = new Notification('Tracking Stopped', {
        body: 'Your activity session has been saved.',
        icon: '/favicon.ico',
        tag: 'fit-tracking-active',
        silent: true,
      });
      // Auto-close after 3 seconds
      setTimeout(() => n.close(), 3000);
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  /** Show a simple one-shot notification (workout reminder, milestone, etc.) */
  show(title: string, body: string, tag?: string): void {
    if (!notificationService.isPermitted()) return;
    try {
      new Notification(title, { body, icon: '/favicon.ico', tag });
    } catch (e) {
      console.warn('Notification error:', e);
    }
  },

  // ── Reminder settings ──────────────────────────────────────────────────
  getReminderSettings(userId: string): ReminderSettings {
    try {
      const raw = localStorage.getItem(settingsKey(userId));
      if (!raw) return { ...DEFAULT_REMINDER_SETTINGS };
      return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_REMINDER_SETTINGS };
    }
  },

  saveReminderSettings(userId: string, settings: ReminderSettings): void {
    localStorage.setItem(settingsKey(userId), JSON.stringify(settings));
  },

  /**
   * Checks whether either reminder is due and fires it if so.
   * `status` reflects whether the user has already done the
   * relevant activity today (meal logged / workout done) —
   * if they have, the reminder is skipped and marked as fired
   * so it won't nag for the rest of the day.
   *
   * Safe to call frequently (on load, every minute, on focus) —
   * each reminder fires at most once per calendar day.
   */
  checkAndFireReminders(
    userId: string,
    status: { loggedMealsToday: boolean; workedOutToday: boolean }
  ): void {
    const settings = notificationService.getReminderSettings(userId);
    const dateKey = new Date().toDateString();
    const nowMin = currentMinutes();

    // Meal reminder
    if (settings.mealRemindersEnabled) {
      const key = firedKey(userId, 'meal', dateKey);
      const alreadyFired = localStorage.getItem(key);
      if (!alreadyFired && status.loggedMealsToday) {
        // User already logged — mark as satisfied, no notification needed
        localStorage.setItem(key, 'satisfied');
      } else if (!alreadyFired && !status.loggedMealsToday && nowMin >= timeToMinutes(settings.mealReminderTime)) {
        notificationService.show(
          '🍽️ Don\'t forget to log your meals',
          'Tap to open Fit Tracker PRO and track today\'s nutrition.',
          'fit-meal-reminder'
        );
        localStorage.setItem(key, 'fired');
      }
    }

    // Workout reminder
    if (settings.workoutRemindersEnabled) {
      const key = firedKey(userId, 'workout', dateKey);
      const alreadyFired = localStorage.getItem(key);
      if (!alreadyFired && status.workedOutToday) {
        localStorage.setItem(key, 'satisfied');
      } else if (!alreadyFired && !status.workedOutToday && nowMin >= timeToMinutes(settings.workoutReminderTime)) {
        notificationService.show(
          '🔥 Keep your streak alive!',
          'You haven\'t logged a workout today — even a quick session counts.',
          'fit-workout-reminder'
        );
        localStorage.setItem(key, 'fired');
      }
    }
  },
};
