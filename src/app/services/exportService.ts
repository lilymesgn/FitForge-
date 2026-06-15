// ============================================================
// Fit Tracker PRO — Data Export Service
// NEW FEATURE: Export workouts + nutrition to CSV
// ============================================================
import type { Workout, WorkoutSession } from '../types';

function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(headers: string[], rows: unknown[][]): string {
  const head = headers.map(escapeCSV).join(',');
  const body = rows.map(r => r.map(escapeCSV).join(',')).join('\n');
  return `${head}\n${body}`;
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const exportService = {
  exportWorkouts(workouts: Workout[], sessions: WorkoutSession[]) {
    const headers = ['Date', 'Name', 'Category', 'Duration (min)', 'Calories', 'Notes'];
    const rows: unknown[][] = [
      ...workouts.map(w => [w.date, w.name, w.category || 'strength', w.duration, w.calories, w.notes || '']),
      ...sessions.map(s => [
        s.startTime.split('T')[0], s.planName, s.category, s.duration, s.totalCalories, s.notes || '',
      ]),
    ].sort((a, b) => String(b[0]).localeCompare(String(a[0])));

    downloadCSV(toCSV(headers, rows), `fit_tracker_workouts_${new Date().toISOString().split('T')[0]}.csv`);
  },

  exportNutrition(userId: string) {
    const headers = ['Date', 'Meal', 'Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
    const rows: unknown[][] = [];

    // Scan last 90 days of calorie entries
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = `fit_calories_${userId}_${d.toDateString()}`;
      const entries = JSON.parse(localStorage.getItem(key) || '[]');
      for (const e of entries) {
        rows.push([
          d.toISOString().split('T')[0],
          e.mealType,
          e.name,
          e.calories,
          e.protein,
          e.carbs,
          e.fat,
        ]);
      }
    }

    if (rows.length === 0) {
      alert('No nutrition data to export yet. Start logging meals first!');
      return;
    }

    downloadCSV(toCSV(headers, rows), `fit_tracker_nutrition_${new Date().toISOString().split('T')[0]}.csv`);
  },
};
