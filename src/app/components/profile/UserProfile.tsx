// ============================================================
// Fit Tracker PRO — User Profile Page
// Displays and edits user info, body measurements, and stats.
// ============================================================
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  User, Save, Activity, Target, Calendar, Edit2, Check,
  Dumbbell, Flame, Clock, Zap, Download, Bell, Sunset,
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { workoutService } from '../../services/workoutService';
import { sessionService } from '../../services/progressService';
import { stripeService } from '../../services/stripeService';
import { exportService } from '../../services/exportService';
import { notificationService, type ReminderSettings } from '../../services/notificationService';
import type { FitnessGoal, Gender } from '../../types';

const GOALS: { id: FitnessGoal; label: string }[] = [
  { id: 'lose_weight', label: 'Lose Weight' },
  { id: 'build_muscle', label: 'Build Muscle' },
  { id: 'get_fit', label: 'Get Fit' },
  { id: 'improve_endurance', label: 'Improve Endurance' },
];

// Mock weight progress for chart
const generateWeightHistory = (currentWeight: number) =>
  Array.from({ length: 8 }, (_, i) => ({
    week: `W${i + 1}`,
    weight: parseFloat((currentWeight + (7 - i) * 0.4 + (Math.random() - 0.5) * 0.3).toFixed(1)),
  }));

// Fitness attribute radar data
const generateRadarData = (workouts: number) => [
  { attr: 'Strength', value: Math.min(100, workouts * 8) },
  { attr: 'Cardio', value: Math.min(100, workouts * 6) },
  { attr: 'Flexibility', value: Math.min(100, workouts * 5) },
  { attr: 'Endurance', value: Math.min(100, workouts * 7) },
  { attr: 'Balance', value: Math.min(100, workouts * 6) },
  { attr: 'Core', value: Math.min(100, workouts * 9) },
];

export default function UserProfile() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState({ totalWorkouts: 0, totalCalories: 0, totalDuration: 0, streak: 0 });
  const [trialDays, setTrialDays] = useState<number | null>(null);

  // Form fields
  const [name, setName] = useState(user?.name || '');
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [weight, setWeight] = useState(user?.weight?.toString() || '');
  const [height, setHeight] = useState(user?.height?.toString() || '');
  const [goal, setGoal] = useState<FitnessGoal>(user?.goal || 'get_fit');
  const [gender, setGender] = useState<Gender>(user?.gender || 'male');

  // Reminder settings
  const [reminders, setReminders] = useState<ReminderSettings>({
    mealRemindersEnabled: true,
    workoutRemindersEnabled: true,
    mealReminderTime: '19:00',
    workoutReminderTime: '18:00',
  });
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const data = workoutService.getStats(user.id);
    setStats({ totalWorkouts: data.totalWorkouts, totalCalories: data.totalCalories, totalDuration: data.totalDuration, streak: data.streak });
    if (user.subscription === 'trial' && user.trialStartDate) {
      setTrialDays(stripeService.getTrialDaysLeft(user.trialStartDate));
    }
    setReminders(notificationService.getReminderSettings(user.id));
    setNotifGranted(notificationService.isPermitted());
  }, [user]);

  const updateReminders = (patch: Partial<ReminderSettings>) => {
    if (!user) return;
    const updated = { ...reminders, ...patch };
    setReminders(updated);
    notificationService.saveReminderSettings(user.id, updated);
  };

  const handleEnableNotifications = async () => {
    const granted = await notificationService.requestPermission();
    setNotifGranted(granted);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 500));
    updateUser({
      name,
      age: age ? parseInt(age) : undefined,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
      goal,
      gender,
    });
    setIsSaving(false);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const weightHistory = generateWeightHistory(parseFloat(weight) || 75);
  const radarData = generateRadarData(stats.totalWorkouts);

  const bmi =
    weight && height
      ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1)
      : null;

  const bmiCategory = bmi
    ? parseFloat(bmi) < 18.5
      ? { label: 'Underweight', color: 'text-blue-400' }
      : parseFloat(bmi) < 25
      ? { label: 'Normal', color: 'text-green-400' }
      : parseFloat(bmi) < 30
      ? { label: 'Overweight', color: 'text-yellow-400' }
      : { label: 'Obese', color: 'text-red-400' }
    : null;

  if (!user) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>My Profile</h1>
          <p className="text-gray-400 text-sm mt-1">Manage your account and track your body metrics</p>
        </div>
        {saved && (
          <motion.div
            className="flex items-center gap-2 text-green-400 text-sm"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Check className="w-4 h-4" /> Saved!
          </motion.div>
        )}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Profile Card */}
        <motion.div
          className="lg:col-span-1 space-y-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Avatar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-3xl" style={{ fontWeight: 700 }}>
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <h2 className="text-white text-lg" style={{ fontWeight: 700 }}>{user.name}</h2>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <div className="mt-3 inline-flex items-center gap-2 bg-gray-800 rounded-full px-4 py-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  user.subscription === 'active' ? 'bg-green-400' :
                  user.subscription === 'trial' ? 'bg-yellow-400' : 'bg-gray-500'
                }`}
              />
              <span className="text-gray-300 text-xs capitalize">{user.subscription} plan</span>
            </div>

            {trialDays !== null && trialDays > 0 && (
              <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                <p className="text-yellow-400 text-xs">⏱️ {trialDays} trial days left</p>
              </div>
            )}

            <button
              onClick={() => setIsEditing(v => !v)}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl py-2.5 text-sm transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Dumbbell, label: 'Workouts', value: stats.totalWorkouts, color: 'text-blue-400' },
              { icon: Flame, label: 'Calories', value: `${(stats.totalCalories / 1000).toFixed(1)}k`, color: 'text-orange-400' },
              { icon: Clock, label: 'Hours', value: `${Math.round(stats.totalDuration / 60)}h`, color: 'text-purple-400' },
              { icon: Zap, label: 'Streak', value: `${stats.streak}d`, color: 'text-green-400' },
            ].map(item => (
              <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
                <p className="text-white text-lg" style={{ fontWeight: 700 }}>{item.value}</p>
                <p className="text-gray-500 text-xs">{item.label}</p>
              </div>
            ))}
          </div>

          {/* BMI card */}
          {bmi && bmiCategory && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <p className="text-gray-400 text-sm mb-2">BMI Indicator</p>
              <div className="flex items-end gap-2">
                <p className="text-3xl text-white" style={{ fontWeight: 700 }}>{bmi}</p>
                <p className={`text-sm mb-1 ${bmiCategory.color}`}>{bmiCategory.label}</p>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-green-500 to-red-500"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </motion.div>

        {/* Right: Edit form + Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Form */}
          {isEditing && (
            <motion.div
              className="bg-gray-900 border border-green-500/20 rounded-2xl p-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-white mb-5" style={{ fontWeight: 600 }}>Edit Profile</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Age</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    placeholder="e.g. 75"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={e => setHeight(e.target.value)}
                    placeholder="e.g. 175"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors placeholder-gray-600"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gender</label>
                  <div className="flex gap-2">
                    {(['male', 'female'] as Gender[]).map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`flex-1 py-2.5 rounded-xl border text-sm transition-all capitalize ${
                          gender === g
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : 'border-gray-700 bg-gray-800 text-gray-400'
                        }`}
                      >
                        {g === 'male' ? '👨 Male' : '👩 Female'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Goal */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Fitness Goal</label>
                  <select
                    value={goal}
                    onChange={e => setGoal(e.target.value as FitnessGoal)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 outline-none focus:border-green-500 transition-colors"
                  >
                    {GOALS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                  </select>
                </div>
              </div>

              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                className="mt-5 w-full bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                whileTap={{ scale: 0.98 }}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><Save className="w-4 h-4" /> Save Changes</>
                )}
              </motion.button>
            </motion.div>
          )}

          {/* Weight Progress Chart */}
          {weight && (
            <motion.div
              className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-green-400" />
                <h3 className="text-white" style={{ fontWeight: 600 }}>Weight Progress</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={weightHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27241f" />
                  <XAxis dataKey="week" tick={{ fill: '#7c7468', fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fill: '#7c7468', fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: '#27241f', border: '1px solid #38332c', borderRadius: '12px', color: '#fff' }}
                    formatter={(v) => [`${v} kg`, 'Weight']}
                  />
                  <Line type="monotone" dataKey="weight" stroke="#5da831" strokeWidth={2.5} dot={{ fill: '#5da831', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Fitness Radar */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-blue-400" />
              <h3 className="text-white" style={{ fontWeight: 600 }}>Fitness Attributes</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#27241f" />
                <PolarAngleAxis dataKey="attr" tick={{ fill: '#7c7468', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="value" stroke="#5da831" fill="#5da831" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Daily Reminders */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-green-400" />
              <h3 className="text-white font-semibold">Daily Reminders</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Get a nudge if you haven't logged your meals or workout by a certain time.
            </p>

            {!notifGranted && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/25 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <p className="text-yellow-400 text-xs">Enable browser notifications to receive these reminders.</p>
                <button
                  onClick={handleEnableNotifications}
                  className="flex-shrink-0 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Enable
                </button>
              </div>
            )}

            <div className="space-y-3">
              {/* Meal reminder */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sunset className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">Meal logging</p>
                    <p className="text-gray-500 text-xs">If nothing logged by this time</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pl-12 sm:pl-0">
                  <input
                    type="time"
                    value={reminders.mealReminderTime}
                    onChange={e => updateReminders({ mealReminderTime: e.target.value })}
                    disabled={!reminders.mealRemindersEnabled}
                    className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-green-500 disabled:opacity-40"
                  />
                  <button
                    onClick={() => updateReminders({ mealRemindersEnabled: !reminders.mealRemindersEnabled })}
                    className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                      reminders.mealRemindersEnabled ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      reminders.mealRemindersEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>

              {/* Workout reminder */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-800 rounded-xl p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold">Workout</p>
                    <p className="text-gray-500 text-xs">If no session logged by this time</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0 pl-12 sm:pl-0">
                  <input
                    type="time"
                    value={reminders.workoutReminderTime}
                    onChange={e => updateReminders({ workoutReminderTime: e.target.value })}
                    disabled={!reminders.workoutRemindersEnabled}
                    className="bg-gray-900 border border-gray-700 text-white text-sm rounded-lg px-2 py-1.5 outline-none focus:border-green-500 disabled:opacity-40"
                  />
                  <button
                    onClick={() => updateReminders({ workoutRemindersEnabled: !reminders.workoutRemindersEnabled })}
                    className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${
                      reminders.workoutRemindersEnabled ? 'bg-green-500' : 'bg-gray-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      reminders.workoutRemindersEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-xs mt-3">
              Reminders fire at most once per day, only while the app is open in a browser tab.
            </p>
          </motion.div>

          {/* Data Export */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-5 h-5 text-green-400" />
              <h3 className="text-white font-semibold">Export Your Data</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">Download your fitness data as CSV files — your data, your control.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const workouts = workoutService.getWorkouts(user.id);
                  const sessions = sessionService.getSessions(user.id);
                  exportService.exportWorkouts(workouts, sessions);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Workouts CSV
              </button>
              <button
                onClick={() => exportService.exportNutrition(user.id)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                <Download className="w-4 h-4" />
                Nutrition CSV
              </button>
            </div>
          </motion.div>

          {/* Account info */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-purple-400" />
              <h3 className="text-white" style={{ fontWeight: 600 }}>Account Info</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Member since', value: new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) },
                { label: 'Email', value: user.email },
                { label: 'Goal', value: GOALS.find(g => g.id === user.goal)?.label || 'Get Fit' },
                { label: 'User ID', value: user.id.slice(0, 8) + '...' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className="text-gray-200 text-sm">{item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
