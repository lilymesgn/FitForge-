// ============================================================
// Fit Tracker PRO — Calorie Tracker Page (v3)
// NEW: Barcode scanner via Open Food Facts API
// NEW: 7-day nutrition history view
// NEW: Fiber + sodium tracking (premium)
// Existing: calorie ring, meal categorization, macro bars, water
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Flame, Plus, X, Droplets, Lock, Crown,
  ChevronDown, ChevronUp, Trash2, Search, Coffee,
  Sun, Moon, Apple, Barcode, History, ChevronLeft, ChevronRight,
  Loader2, Zap, Pencil,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { searchFoods, lookupBarcode } from '../../services/foodDatabaseService';
import type { FoodDBItem } from '../../services/foodDatabaseService';

// ─── Types ────────────────────────────────────────────────────────────────────
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  mealType: MealType;
  time: string;
}

const MEAL_ICONS: Record<MealType, React.ElementType> = {
  breakfast: Coffee,
  lunch:     Sun,
  dinner:    Moon,
  snack:     Apple,
};

const MEAL_COLORS: Record<MealType, string> = {
  breakfast: 'text-orange-400',
  lunch:     'text-yellow-400',
  dinner:    'text-blue-400',
  snack:     'text-purple-400',
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
function getDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toDateString();
}

function loadEntriesForDate(userId: string, dateKey: string): FoodEntry[] {
  return JSON.parse(localStorage.getItem(`fit_calories_${userId}_${dateKey}`) || '[]');
}

function saveEntries(userId: string, entries: FoodEntry[], dateKey: string): void {
  localStorage.setItem(`fit_calories_${userId}_${dateKey}`, JSON.stringify(entries));
}

function loadWater(userId: string): number {
  return parseInt(localStorage.getItem(`fit_water_${userId}_${getDateKey()}`) || '0', 10);
}

function saveWater(userId: string, cups: number): void {
  localStorage.setItem(`fit_water_${userId}_${getDateKey()}`, String(cups));
}

// ─── Circular progress ring ───────────────────────────────────────────────────
function CalorieRing({ consumed, goal, size = 160 }: { consumed: number; goal: number; size?: number }) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / goal, 1);
  const offset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#27241f" strokeWidth={10} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={pct >= 1 ? '#ef4444' : '#5da831'}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-white text-2xl" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{consumed}</p>
        <p className="text-gray-500 text-xs">of {goal} cal</p>
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min((value / goal) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300">{Math.round(value)}g / {goal}g</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function PremiumLock({ feature }: { feature: string }) {
  return (
    <div className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-5 text-center">
      <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
        <Crown className="w-5 h-5 text-yellow-400" />
      </div>
      <p className="text-white text-sm font-semibold mb-1">{feature}</p>
      <p className="text-gray-400 text-xs mb-3">Upgrade to Premium to unlock this feature</p>
      <Link
        to="/subscription"
        className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-xs transition-colors font-semibold"
      >
        <Crown className="w-3 h-3" /> Upgrade — from $4.99/mo
      </Link>
    </div>
  );
}

// ─── Barcode Scanner Component ────────────────────────────────────────────────
function BarcodeScanner({ onFound, onClose }: { onFound: (item: FoodDBItem) => void; onClose: () => void }) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = useCallback(async () => {
    if (!barcode.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await lookupBarcode(barcode.trim());
      if (result) {
        onFound(result);
      } else {
        setError('Product not found. Try a different barcode or add it manually.');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [barcode, onFound]);

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl p-6 space-y-4"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="w-5 h-5 text-green-400" />
            <h3 className="text-white font-bold">Barcode Lookup</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 text-sm">
          Enter the barcode number from your food packaging. Powered by Open Food Facts (3M+ products).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
            placeholder="e.g. 0012000001543"
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
            autoFocus
          />
          <button
            onClick={handleLookup}
            disabled={loading || !barcode.trim()}
            className="bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-4 rounded-xl transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Add Food Modal (upgraded with barcode + expanded DB) ─────────────────────
interface AddFoodModalProps {
  onAdd: (entry: Omit<FoodEntry, 'id' | 'time'>) => void;
  onClose: () => void;
  isPremium: boolean;
  defaultMeal?: MealType;
}

function AddFoodModal({ onAdd, onClose, isPremium, defaultMeal = 'breakfast' }: AddFoodModalProps) {
  const [search, setSearch] = useState('');
  const [mealType, setMealType] = useState<MealType>(defaultMeal);
  const [custom, setCustom] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [tab, setTab] = useState<'quick' | 'manual' | 'barcode'>('quick');
  const [showBarcode, setShowBarcode] = useState(false);
  const [prefilled, setPrefilled] = useState<FoodDBItem | null>(null);

  const filtered = useMemo(() => searchFoods(search), [search]);

  const handleQuickAdd = (food: FoodDBItem) => {
    onAdd({ ...food, mealType });
    onClose();
  };

  const handleBarcodeFound = (item: FoodDBItem) => {
    setShowBarcode(false);
    setPrefilled(item);
    setCustom({
      name: item.name,
      calories: String(item.calories),
      protein: String(item.protein),
      carbs: String(item.carbs),
      fat: String(item.fat),
      fiber: String(item.fiber || 0),
    });
    setTab('manual');
  };

  const handleManualAdd = () => {
    if (!custom.name || !custom.calories) return;
    onAdd({
      name: custom.name,
      calories: parseInt(custom.calories),
      protein: parseFloat(custom.protein) || 0,
      carbs: parseFloat(custom.carbs) || 0,
      fat: parseFloat(custom.fat) || 0,
      fiber: parseFloat(custom.fiber) || 0,
      mealType,
    });
    onClose();
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden max-h-[85vh] flex flex-col"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
            <h3 className="text-white font-bold">Add Food</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBarcode(true)}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white px-3 py-1.5 rounded-xl text-xs transition-colors"
              >
                <Barcode className="w-3.5 h-3.5" />
                Barcode
              </button>
              <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Prefilled notice */}
          {prefilled && (
            <div className="mx-5 mb-3 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-400">
              ✓ Loaded from barcode: {prefilled.name}
            </div>
          )}

          {/* Meal selector */}
          <div className="flex gap-2 px-5 pb-3 flex-shrink-0">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(m => {
              const Icon = MEAL_ICONS[m];
              return (
                <button
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`flex-1 py-1.5 rounded-xl text-xs capitalize flex items-center justify-center gap-1 transition-all ${
                    mealType === m
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-gray-800 border border-gray-700 text-gray-500'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {m}
                </button>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-800 px-5 flex-shrink-0">
            {(['quick', 'manual'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2.5 mr-4 text-sm transition-colors border-b-2 flex items-center gap-1.5 ${
                  tab === t ? 'text-green-400 border-green-500' : 'text-gray-500 border-transparent'
                }`}
                style={{ fontWeight: tab === t ? 600 : 400 }}
              >
                {t === 'quick' ? <Zap className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                {t === 'quick' ? 'Quick Add' : 'Manual'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {tab === 'quick' ? (
              <>
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search 30+ foods..."
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                  />
                </div>

                <div className="space-y-2">
                  {filtered.map(food => (
                    <button
                      key={food.name}
                      onClick={() => handleQuickAdd(food)}
                      className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-left"
                    >
                      <div>
                        <p className="text-white text-sm">{food.name}</p>
                        <p className="text-gray-500 text-xs">
                          P:{food.protein}g · C:{food.carbs}g · F:{food.fat}g
                          {food.fiber ? ` · Fiber:${food.fiber}g` : ''}
                        </p>
                      </div>
                      <span className="text-orange-400 text-sm font-semibold">{food.calories}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Food Name *</label>
                  <input
                    type="text"
                    value={custom.name}
                    onChange={e => setCustom(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Homemade Salad"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Calories *</label>
                  <input
                    type="number"
                    value={custom.calories}
                    onChange={e => setCustom(p => ({ ...p, calories: e.target.value }))}
                    placeholder="e.g. 350"
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                  />
                </div>
                {isPremium && (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'protein', label: 'Protein (g)' },
                        { key: 'carbs',   label: 'Carbs (g)'   },
                        { key: 'fat',     label: 'Fat (g)'     },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-400 mb-1">{label}</label>
                          <input
                            type="number"
                            value={custom[key as keyof typeof custom]}
                            onChange={e => setCustom(p => ({ ...p, [key]: e.target.value }))}
                            placeholder="0"
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Fiber (g)</label>
                      <input
                        type="number"
                        value={custom.fiber}
                        onChange={e => setCustom(p => ({ ...p, fiber: e.target.value }))}
                        placeholder="0"
                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-500 placeholder-gray-600"
                      />
                    </div>
                  </>
                )}
                <button
                  onClick={handleManualAdd}
                  disabled={!custom.name || !custom.calories}
                  className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
                >
                  Add Food
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Barcode scanner modal */}
      <AnimatePresence>
        {showBarcode && (
          <BarcodeScanner onFound={handleBarcodeFound} onClose={() => setShowBarcode(false)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── History Day Card ─────────────────────────────────────────────────────────
function HistoryDayCard({ userId, offset }: { userId: string; offset: number }) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const dateKey = d.toDateString();
  const entries: FoodEntry[] = loadEntriesForDate(userId, dateKey);
  const total = entries.reduce((s, e) => s + e.calories, 0);
  const label = offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-white text-sm font-semibold">{label}</p>
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-orange-400 text-sm font-bold">{total} cal</span>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="text-gray-600 text-xs">No food logged</p>
      ) : (
        <div className="space-y-1">
          {entries.slice(0, 4).map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs">
              <span className="text-gray-400 truncate flex-1 mr-2">{e.name}</span>
              <span className="text-gray-500 flex-shrink-0 capitalize mr-2">{e.mealType}</span>
              <span className="text-orange-400 flex-shrink-0">{e.calories}</span>
            </div>
          ))}
          {entries.length > 4 && (
            <p className="text-gray-600 text-xs">+{entries.length - 4} more</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CalorieTrackerPage() {
  const { user } = useAuth();
  const { isPremium, canAccess } = useFreemium();

  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [waterCups, setWaterCups] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>('breakfast');
  const [viewMode, setViewMode] = useState<'today' | 'history'>('today');
  const [historyPage, setHistoryPage] = useState(0); // 0 = days 1-7, 1 = 8-14

  const todayKey = getDateKey(0);

  useEffect(() => {
    if (!user) return;
    setEntries(loadEntriesForDate(user.id, todayKey));
    setWaterCups(loadWater(user.id));
  }, [user, todayKey]);

  const calorieGoal = 2000;
  const macroGoals = { protein: 150, carbs: 250, fat: 65 };

  const totals = useMemo(() => entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      carbs:    acc.carbs    + e.carbs,
      fat:      acc.fat      + e.fat,
      fiber:    (acc.fiber || 0) + (e.fiber || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  ), [entries]);

  const byMeal = useMemo(() => {
    const map: Record<MealType, FoodEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    entries.forEach(e => map[e.mealType].push(e));
    return map;
  }, [entries]);

  const freeLimit = 3;
  const canAddMore = isPremium || entries.length < freeLimit;

  const handleAddFood = (entry: Omit<FoodEntry, 'id' | 'time'>) => {
    if (!user || !canAddMore) return;
    const newEntry: FoodEntry = {
      ...entry,
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    const updated = [...entries, newEntry];
    setEntries(updated);
    saveEntries(user.id, updated, todayKey);
  };

  const handleDeleteEntry = (id: string) => {
    if (!user) return;
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    saveEntries(user.id, updated, todayKey);
  };

  const handleAddWater = () => {
    if (!user) return;
    const next = Math.min(waterCups + 1, 12);
    setWaterCups(next);
    saveWater(user.id, next);
  };

  const handleRemoveWater = () => {
    if (!user) return;
    const next = Math.max(waterCups - 1, 0);
    setWaterCups(next);
    saveWater(user.id, next);
  };

  // History: 7 days per page
  const historyOffsets = Array.from({ length: 7 }, (_, i) => i + 1 + historyPage * 7);

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div className="space-y-3" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              <Flame className="w-5 h-5 text-orange-400 flex-shrink-0" /> Calories
            </h1>
            <p className="text-gray-400 text-xs mt-0.5 truncate">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          {/* Today / History toggle */}
          <div className="flex bg-gray-800 border border-gray-700 rounded-xl overflow-hidden flex-shrink-0">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'today' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'history' ? 'bg-green-500 text-white' : 'text-gray-500'}`}
            >
              <History className="w-3 h-3" />
              History
            </button>
          </div>
        </div>

        {/* Free plan limit badge — own row so it never crowds the toggle on small screens */}
        {!isPremium && viewMode === 'today' && (
          <div className="flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-1.5 w-fit">
            <Lock className="w-3 h-3 text-yellow-400" />
            <span className="text-yellow-400 text-xs">{freeLimit - entries.length} entries left today</span>
          </div>
        )}
      </motion.div>

      {/* ── TODAY VIEW ── */}
      {viewMode === 'today' && (
        <>
          {/* Calorie ring */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <CalorieRing consumed={totals.calories} goal={calorieGoal} />
              <div className="flex-1 w-full space-y-3">
                <div className="flex justify-between text-sm">
                  <div className="text-center">
                    <p className="text-orange-400 font-bold">{totals.calories}</p>
                    <p className="text-gray-500 text-xs">eaten</p>
                  </div>
                  <div className="text-center">
                    <p className="text-blue-400 font-bold">{Math.max(0, calorieGoal - totals.calories)}</p>
                    <p className="text-gray-500 text-xs">remaining</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-300 font-bold">{calorieGoal}</p>
                    <p className="text-gray-500 text-xs">goal</p>
                  </div>
                </div>

                {canAccess('macros_tracking') ? (
                  <div className="space-y-2">
                    <MacroBar label="Protein" value={totals.protein} goal={macroGoals.protein} color="bg-blue-500" />
                    <MacroBar label="Carbs"   value={totals.carbs}   goal={macroGoals.carbs}   color="bg-yellow-500" />
                    <MacroBar label="Fat"     value={totals.fat}     goal={macroGoals.fat}     color="bg-red-500" />
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-gray-400">Fiber</span>
                      <span className="text-green-400 font-semibold">{Math.round(totals.fiber)}g / 25g</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2">
                    <Crown className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                    <span className="text-yellow-400 text-xs">Macro tracking — Premium</span>
                    <Link to="/subscription" className="text-green-400 text-xs underline ml-auto">Upgrade</Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Add food button */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            {canAddMore ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-3.5 flex items-center justify-center gap-2 transition-colors font-semibold"
              >
                <Plus className="w-5 h-5" /> Add Food
              </button>
            ) : (
              <PremiumLock feature="Unlimited food logging" />
            )}
          </motion.div>

          {/* Meal sections */}
          {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(meal => {
            const mealEntries = byMeal[meal];
            const mealCals = mealEntries.reduce((s, e) => s + e.calories, 0);
            const Icon = MEAL_ICONS[meal];
            const colorClass = MEAL_COLORS[meal];
            const isExpanded = expandedMeal === meal;

            return (
              <motion.div
                key={meal}
                className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <button
                  onClick={() => setExpandedMeal(isExpanded ? null : meal)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-800 rounded-xl flex items-center justify-center">
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm capitalize font-semibold">{meal}</p>
                      <p className="text-gray-500 text-xs">{mealEntries.length} items</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-400 text-sm font-semibold">{mealCals} cal</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {mealEntries.length === 0 ? (
                          <p className="text-gray-600 text-sm text-center py-3">No {meal} logged yet</p>
                        ) : (
                          mealEntries.map(entry => (
                            <motion.div
                              key={entry.id}
                              className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -10 }}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm truncate">{entry.name}</p>
                                {isPremium && (
                                  <p className="text-gray-500 text-xs">
                                    P:{entry.protein}g C:{entry.carbs}g F:{entry.fat}g
                                    {entry.fiber ? ` Fiber:${entry.fiber}g` : ''}
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-orange-400 text-sm font-semibold">{entry.calories}</p>
                                <p className="text-gray-600 text-xs">{entry.time}</p>
                              </div>
                              <button onClick={() => handleDeleteEntry(entry.id)} className="text-gray-600 hover:text-red-400 transition-colors ml-1">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </motion.div>
                          ))
                        )}
                        {canAddMore && (
                          <button
                            onClick={() => setShowAddModal(true)}
                            className="w-full flex items-center justify-center gap-1 py-2 border border-dashed border-gray-700 hover:border-green-500/50 rounded-xl text-gray-500 hover:text-green-400 text-xs transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add to {meal}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {/* Water tracker */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span className="text-white text-sm font-semibold">Water Intake</span>
              </div>
              <span className="text-blue-400 text-sm font-semibold">{waterCups} / 8 cups</span>
            </div>
            <div className="flex gap-1.5 mb-3">
              {Array.from({ length: 8 }, (_, i) => (
                <motion.div
                  key={i}
                  className={`flex-1 h-7 rounded-lg transition-colors ${i < waterCups ? 'bg-blue-500' : 'bg-gray-800'}`}
                  animate={{ scale: i === waterCups - 1 ? [1, 1.15, 1] : 1 }}
                  transition={{ duration: 0.2 }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={handleRemoveWater} disabled={waterCups === 0} className="flex-1 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 rounded-xl py-2 text-sm transition-colors">
                − Remove
              </button>
              <button onClick={handleAddWater} disabled={waterCups >= 8} className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-40 text-blue-400 rounded-xl py-2 text-sm font-semibold transition-colors">
                + Add Cup
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* ── HISTORY VIEW ── */}
      {viewMode === 'history' && user && (
        <motion.div className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Past 14 days</p>
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryPage(p => Math.max(0, p - 1))}
                disabled={historyPage === 0}
                className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl disabled:opacity-40 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setHistoryPage(p => Math.min(1, p + 1))}
                disabled={historyPage === 1}
                className="w-8 h-8 flex items-center justify-center bg-gray-800 border border-gray-700 rounded-xl disabled:opacity-40 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          {historyOffsets.map(offset => (
            <HistoryDayCard key={offset} userId={user.id} offset={offset} />
          ))}
        </motion.div>
      )}

      {/* Add food modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddFoodModal
            onAdd={handleAddFood}
            onClose={() => setShowAddModal(false)}
            isPremium={isPremium}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
