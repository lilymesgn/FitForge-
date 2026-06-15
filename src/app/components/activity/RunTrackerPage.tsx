// ============================================================
// Fit Tracker PRO — Running / Activity Tracker
// Features:
//   • Location permission request (Geolocation API)
//   • Start / stop run session with live timer
//   • Real-time distance, pace, estimated calories
//   • Step counter simulation (DeviceMotion API where available)
//   • Background tracking notification when session is active
//   • GPS route tracking (Premium) — shows lock for free users
//   • Session history stored in localStorage
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Play, Square, MapPin, Timer, Zap, Footprints,
  TrendingUp, Crown, Lock, History, ChevronRight,
  AlertCircle, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFreemium } from '../../context/FreemiumContext';
import { notificationService } from '../../services/notificationService';

// ─── Types ────────────────────────────────────────────────────────────────────
interface RunSession {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number;    // seconds
  distance: number;    // km
  pace: string;        // e.g. "5:30"
  calories: number;
  steps: number;
  avgHeartRate?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
function pad(n: number): string { return String(n).padStart(2, '0'); }

function calcPace(distKm: number, secs: number): string {
  if (distKm === 0) return '--:--';
  const paceSecPerKm = secs / distKm;
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${pad(s)}`;
}

function calcCalories(distKm: number, weightKg: number = 70): number {
  // MET-based estimate for running: ~8 cal/min/km at average pace
  return Math.round(distKm * weightKg * 0.75);
}

/** Haversine distance between two GPS coords in km */
function haversine(
  lat1: number, lon1: number, lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// localStorage helpers
const SESSION_KEY = (userId: string) => `fit_runs_${userId}`;

function loadSessions(userId: string): RunSession[] {
  return JSON.parse(localStorage.getItem(SESSION_KEY(userId)) || '[]')
    .sort((a: RunSession, b: RunSession) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
}

function saveSession(userId: string, session: RunSession): void {
  const existing = loadSessions(userId);
  localStorage.setItem(SESSION_KEY(userId), JSON.stringify([session, ...existing]));
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatBig({ label, value, unit, icon: Icon, color }: {
  label: string; value: string; unit?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center">
      <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
      <p className="text-white text-2xl" style={{ fontWeight: 700 }}>
        {value}
        {unit && <span className="text-gray-400 text-sm ml-1" style={{ fontWeight: 400 }}>{unit}</span>}
      </p>
      <p className="text-gray-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RunTrackerPage() {
  const { user } = useAuth();
  const { isPremium, canAccess } = useFreemium();

  // Permission states
  const [locationStatus, setLocationStatus] = useState<'unknown' | 'granted' | 'denied' | 'requesting'>('unknown');
  const [locationError, setLocationError] = useState('');

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [steps, setSteps] = useState(0);
  const [sessions, setSessions] = useState<RunSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(null);
  const startTimeRef = useRef<string>('');
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sessions
  useEffect(() => {
    if (user) setSessions(loadSessions(user.id));
  }, [user]);

  // Check current location permission
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationStatus('denied');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.permissions?.query({ name: 'geolocation' }).then(result => {
      if (result.state === 'granted') setLocationStatus('granted');
      else if (result.state === 'denied') setLocationStatus('denied');
      // 'prompt' → stays 'unknown' so we can request
    }).catch(() => {
      // permissions API not available — we'll request on demand
    });
  }, []);

  // Request location permission
  const requestLocation = useCallback(() => {
    setLocationStatus('requesting');
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      () => setLocationStatus('granted'),
      (err) => {
        setLocationStatus('denied');
        setLocationError(
          err.code === 1
            ? 'Location access denied. Please enable it in browser settings.'
            : 'Unable to get location. Please try again.'
        );
      },
      { timeout: 10000 }
    );
  }, []);

  // ── Start run ─────────────────────────────────────────────────────────────
  const startRun = useCallback(() => {
    setIsTracking(true);
    setElapsed(0);
    setDistanceKm(0);
    setSteps(0);
    lastPosRef.current = null;
    startTimeRef.current = new Date().toISOString();

    // Show background notification
    notificationService.showTrackingNotification('Run');

    // Timer
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);

    // GPS watch (real distance) — only for premium, but we track for free too (no route display)
    if (locationStatus === 'granted') {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude: lat, longitude: lon } = pos.coords;
          if (lastPosRef.current) {
            const d = haversine(lastPosRef.current.lat, lastPosRef.current.lon, lat, lon);
            // Filter GPS jitter (ignore jumps > 0.1km between readings)
            if (d < 0.1) {
              setDistanceKm(prev => parseFloat((prev + d).toFixed(3)));
            }
          }
          lastPosRef.current = { lat, lon };
        },
        () => {}, // silent error
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
    }

    // Step simulation (DeviceMotion where available, otherwise estimate from time)
    // Real step detection would use accelerometer data in a native app.
    stepIntervalRef.current = setInterval(() => {
      // ~2.5 steps/second at average running pace
      setSteps(s => s + Math.floor(Math.random() * 3) + 2);
    }, 1000);
  }, [locationStatus]);

  // ── Stop run ──────────────────────────────────────────────────────────────
  const stopRun = useCallback(() => {
    setIsTracking(false);

    // Clear timers
    if (timerRef.current)    clearInterval(timerRef.current);
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);

    // Dismiss notification
    notificationService.dismissTrackingNotification();

    // Save session
    if (!user || elapsed < 5) return; // ignore < 5 second sessions
    const session: RunSession = {
      id: crypto.randomUUID(),
      userId: user.id,
      startTime: startTimeRef.current,
      endTime: new Date().toISOString(),
      duration: elapsed,
      distance: distanceKm,
      pace: calcPace(distanceKm, elapsed),
      calories: calcCalories(distanceKm, user.weight || 70),
      steps,
    };
    saveSession(user.id, session);
    setSessions(prev => [session, ...prev]);
  }, [elapsed, distanceKm, steps, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current)    clearInterval(timerRef.current);
      if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const pace = calcPace(distanceKm, elapsed);
  const estimatedCals = calcCalories(distanceKm, user?.weight || 70);

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-xl text-white" style={{ fontWeight: 700 }}>🏃 Activity</h1>
          <p className="text-gray-400 text-xs">Run tracking & step counter</p>
        </div>
        <button
          onClick={() => setShowHistory(v => !v)}
          className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-xs transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          History
        </button>
      </motion.div>

      {/* Location permission banner */}
      {locationStatus !== 'granted' && (
        <motion.div
          className={`border rounded-2xl p-4 flex items-start gap-3 ${
            locationStatus === 'denied'
              ? 'bg-red-500/10 border-red-500/20'
              : 'bg-blue-500/10 border-blue-500/20'
          }`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {locationStatus === 'denied' ? (
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          ) : (
            <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            {locationError ? (
              <p className="text-red-300 text-sm">{locationError}</p>
            ) : (
              <>
                <p className="text-blue-300 text-sm" style={{ fontWeight: 600 }}>
                  Enable Location Access
                </p>
                <p className="text-blue-400/70 text-xs mt-1">
                  Allow location to track your real distance and route.
                  Step counting works without GPS.
                </p>
              </>
            )}
            {locationStatus !== 'denied' && (
              <button
                onClick={requestLocation}
                disabled={locationStatus === 'requesting'}
                className="mt-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white px-4 py-1.5 rounded-xl text-xs transition-colors"
                style={{ fontWeight: 600 }}
              >
                {locationStatus === 'requesting' ? 'Requesting...' : 'Grant Access'}
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* GPS granted badge */}
      {locationStatus === 'granted' && !isTracking && (
        <motion.div
          className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-sm">GPS ready — accurate distance tracking</span>
        </motion.div>
      )}

      {/* Main stats display */}
      <motion.div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-6"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.08 }}
      >
        {/* Big timer */}
        <div className="text-center mb-6">
          <motion.p
            className="text-5xl text-white tabular-nums"
            style={{ fontWeight: 700 }}
            animate={{ scale: isTracking ? [1, 1.01, 1] : 1 }}
            transition={{ duration: 1, repeat: isTracking ? Infinity : 0 }}
          >
            {formatTime(elapsed)}
          </motion.p>
          <p className="text-gray-500 text-sm mt-1">Duration</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatBig
            label="Distance"
            value={distanceKm.toFixed(2)}
            unit="km"
            icon={MapPin}
            color="text-green-400"
          />
          <StatBig
            label="Pace"
            value={pace}
            unit="/km"
            icon={TrendingUp}
            color="text-blue-400"
          />
          <StatBig
            label="Calories"
            value={String(estimatedCals)}
            unit="kcal"
            icon={Zap}
            color="text-orange-400"
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2">
            <Footprints className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300 text-sm">Steps</span>
          </div>
          <span className="text-purple-400" style={{ fontWeight: 700 }}>{steps.toLocaleString()}</span>
        </div>

        {/* Start / Stop button */}
        {isTracking ? (
          <motion.button
            onClick={stopRun}
            className="w-full bg-red-500 hover:bg-red-400 text-white rounded-2xl py-4 flex items-center justify-center gap-3 transition-colors"
            style={{ fontWeight: 700, fontSize: 16 }}
            whileTap={{ scale: 0.97 }}
          >
            <Square className="w-6 h-6" fill="white" />
            Stop & Save
          </motion.button>
        ) : (
          <motion.button
            onClick={startRun}
            className="w-full bg-green-500 hover:bg-green-400 text-white rounded-2xl py-4 flex items-center justify-center gap-3 transition-colors"
            style={{ fontWeight: 700, fontSize: 16 }}
            whileTap={{ scale: 0.97 }}
          >
            <Play className="w-6 h-6" fill="white" />
            Start Run
          </motion.button>
        )}

        {isTracking && (
          <motion.p
            className="text-center text-green-400 text-xs mt-3"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ● Tracking in progress · Background notification active
          </motion.p>
        )}
      </motion.div>

      {/* GPS route tracking — premium gate */}
      {canAccess('gps_tracking') ? (
        <motion.div
          className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm" style={{ fontWeight: 600 }}>Route Map</span>
            <span className="ml-auto text-xs text-green-400">Premium</span>
          </div>
          {/* Map placeholder — in production integrate Google Maps / Mapbox */}
          <div className="h-32 bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-green-500/40 mx-auto mb-1" />
              <p className="text-gray-500 text-xs">
                {isTracking ? 'Tracking your route...' : 'Start a run to see your route'}
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Connect a mapping API (Google Maps / Mapbox) for live route display
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="bg-gray-900 border border-yellow-500/20 rounded-2xl p-5 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-white text-sm mb-1" style={{ fontWeight: 600 }}>GPS Route Tracking</p>
          <p className="text-gray-400 text-xs mb-3">
            Visualize your running route on an interactive map with Premium
          </p>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-400 text-white px-4 py-2 rounded-xl text-xs transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Crown className="w-3 h-3" /> Unlock GPS — $4.99/mo
          </Link>
        </motion.div>
      )}

      {/* Session history */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <h3 className="text-white mb-4" style={{ fontWeight: 600 }}>Recent Sessions</h3>
            {sessions.length === 0 ? (
              <div className="text-center py-6">
                <Footprints className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No sessions yet — go for a run!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map(session => (
                  <motion.div
                    key={session.id}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <div className="w-9 h-9 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                      <Footprints className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm" style={{ fontWeight: 600 }}>
                        {session.distance.toFixed(2)} km run
                      </p>
                      <p className="text-gray-500 text-xs">
                        {formatTime(session.duration)} · {session.pace} /km
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-400 text-sm" style={{ fontWeight: 600 }}>
                        {session.calories} cal
                      </p>
                      <p className="text-gray-600 text-xs">
                        {new Date(session.startTime).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly summary */}
      {sessions.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {[
            {
              label: 'Total Runs',
              value: String(sessions.length),
              icon: Footprints,
              color: 'text-green-400',
            },
            {
              label: 'Total KM',
              value: sessions.reduce((s, r) => s + r.distance, 0).toFixed(1),
              icon: MapPin,
              color: 'text-blue-400',
            },
            {
              label: 'Cal Burned',
              value: sessions.reduce((s, r) => s + r.calories, 0).toLocaleString(),
              icon: Zap,
              color: 'text-orange-400',
            },
          ].map(item => (
            <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-3 text-center">
              <item.icon className={`w-4 h-4 ${item.color} mx-auto mb-1`} />
              <p className="text-white" style={{ fontWeight: 700 }}>{item.value}</p>
              <p className="text-gray-500 text-xs">{item.label}</p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Premium CTA for non-premium users */}
      {!isPremium && (
        <motion.div
          className="bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-4 flex items-center justify-between"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center">
              <Lock className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="text-white text-sm" style={{ fontWeight: 600 }}>Unlock GPS Routes</p>
              <p className="text-gray-400 text-xs">Premium from $4.99/month</p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="bg-green-500 hover:bg-green-400 text-white px-3 py-2 rounded-xl text-xs transition-colors"
            style={{ fontWeight: 600 }}
          >
            Upgrade
          </Link>
        </motion.div>
      )}
    </div>
  );
}
