// ============================================================
// Fit Tracker PRO — AI Form Analyzer
// Uses TensorFlow MoveNet to detect body pose,
// count reps, and provide real-time form feedback.
// Premium feature — shows lock for free users.
// NOTE: TF.js imports are fully dynamic to avoid ModuleFetchError
//       in sandboxed preview environments (Figma Make).
// ============================================================
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Zap, RotateCcw, AlertCircle, CheckCircle, Activity, Crown } from 'lucide-react';
import { Link } from 'react-router';
import {
  calculateAngle, countRep, resetReps, analyzeForm, isVisible,
  type ExerciseType, type Keypoint, KP,
} from '../../utils/exerciseRecognition';
import { useFreemium } from '../../context/FreemiumContext';

// Skeleton connections for drawing
const SKELETON_CONNECTIONS: [number, number][] = [
  [KP.LEFT_SHOULDER, KP.RIGHT_SHOULDER],
  [KP.LEFT_SHOULDER, KP.LEFT_ELBOW], [KP.LEFT_ELBOW, KP.LEFT_WRIST],
  [KP.RIGHT_SHOULDER, KP.RIGHT_ELBOW], [KP.RIGHT_ELBOW, KP.RIGHT_WRIST],
  [KP.LEFT_SHOULDER, KP.LEFT_HIP], [KP.RIGHT_SHOULDER, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.RIGHT_HIP],
  [KP.LEFT_HIP, KP.LEFT_KNEE], [KP.LEFT_KNEE, KP.LEFT_ANKLE],
  [KP.RIGHT_HIP, KP.RIGHT_KNEE], [KP.RIGHT_KNEE, KP.RIGHT_ANKLE],
];

const EXERCISES: { id: ExerciseType; label: string; emoji: string; tip: string }[] = [
  { id: 'bicep_curl', label: 'Bicep Curl', emoji: '💪', tip: 'Keep elbow tucked in — curl slowly' },
  { id: 'squat', label: 'Squat', emoji: '🏋️', tip: 'Keep chest up, knees over toes' },
  { id: 'push_up', label: 'Push-up', emoji: '⬇️', tip: 'Keep body straight like a plank' },
  { id: 'overhead_press', label: 'OH Press', emoji: '🙌', tip: 'Press directly overhead' },
  { id: 'lateral_raise', label: 'Lateral Raise', emoji: '↔️', tip: 'Raise arms to shoulder height' },
];

type PoseDetector = { estimatePoses: (video: HTMLVideoElement) => Promise<{ keypoints: { x: number; y: number; score?: number; name?: string }[]; score?: number }[]> };

export default function FormAnalyzerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<PoseDetector | null>(null);
  const animRef = useRef<number>(0);
  const sessionId = useRef(crypto.randomUUID());

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('bicep_curl');
  const [repCount, setRepCount] = useState(0);
  const [formScore, setFormScore] = useState<number | null>(null);
  const [formMessages, setFormMessages] = useState<string[]>([]);
  const [isGoodForm, setIsGoodForm] = useState(true);
  const [error, setError] = useState('');

  // ── Load MoveNet model ───────────────────────────────────────────────────
  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      try {
        // Fully dynamic imports to prevent ModuleFetchError in sandboxed envs
        await import('@tensorflow/tfjs');
        await import('@tensorflow/tfjs-backend-webgl');
        const tf = await import('@tensorflow/tfjs');
        await tf.setBackend('webgl');
        await tf.ready();
        const poseDetection = await import('@tensorflow-models/pose-detection');
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
          }
        );
        detectorRef.current = detector as unknown as PoseDetector;
        setIsModelReady(true);
      } catch (e) {
        console.error(e);
        setError('Failed to load MoveNet model. Please refresh and try again.');
      } finally {
        setIsModelLoading(false);
      }
    };
    loadModel();
    return () => {
      // BUG FIX #4: Stop camera stream tracks on unmount to kill camera light
      if (animRef.current) cancelAnimationFrame(animRef.current);
      const vid = videoRef.current;
      if (vid?.srcObject) {
        (vid.srcObject as MediaStream).getTracks().forEach(t => t.stop());
        vid.srcObject = null;
      }
    };
  }, []);

  // ── Start camera ─────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraOn(true);
      }
    } catch {
      setError('Camera access denied. Please grant camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setIsAnalyzing(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOn(false);
    setFormScore(null);
    setFormMessages([]);
    setRepCount(0);
  }, []);

  // ── Draw skeleton on canvas ──────────────────────────────────────────────
  const drawPose = useCallback((keypoints: Keypoint[]) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections (skeleton)
    ctx.strokeStyle = '#5da831';
    ctx.lineWidth = 3;
    SKELETON_CONNECTIONS.forEach(([a, b]) => {
      const kpA = keypoints[a];
      const kpB = keypoints[b];
      if (isVisible(kpA) && isVisible(kpB)) {
        ctx.beginPath();
        ctx.moveTo(kpA.x, kpA.y);
        ctx.lineTo(kpB.x, kpB.y);
        ctx.stroke();
      }
    });

    // Draw joints
    keypoints.forEach(kp => {
      if (!isVisible(kp)) return;
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = kp.score > 0.7 ? '#5da831' : '#f59e0b';
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Show angle for the primary joint of selected exercise
    if (selectedExercise === 'bicep_curl') {
      const ls = keypoints[KP.LEFT_SHOULDER];
      const le = keypoints[KP.LEFT_ELBOW];
      const lw = keypoints[KP.LEFT_WRIST];
      if (isVisible(ls) && isVisible(le) && isVisible(lw)) {
        const angle = Math.round(calculateAngle(ls, le, lw));
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(`${angle}°`, le.x + 10, le.y);
      }
    } else if (selectedExercise === 'squat') {
      const lh = keypoints[KP.LEFT_HIP];
      const lk = keypoints[KP.LEFT_KNEE];
      const la = keypoints[KP.LEFT_ANKLE];
      if (isVisible(lh) && isVisible(lk) && isVisible(la)) {
        const angle = Math.round(calculateAngle(lh, lk, la));
        ctx.fillStyle = '#fff';
        ctx.font = '16px sans-serif';
        ctx.fillText(`${angle}°`, lk.x + 10, lk.y);
      }
    }
  }, [selectedExercise]);

  // ── Main detection loop ──────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      animRef.current = requestAnimationFrame(runAnalysis);
      return;
    }
    try {
      const poses = await detector.estimatePoses(video);
      if (poses.length > 0) {
        const rawKPs = poses[0].keypoints;
        // Normalize keypoints to Keypoint type
        const kps: Keypoint[] = rawKPs.map(k => ({
          x: k.x,
          y: k.y,
          score: k.score ?? 0,
        }));

        drawPose(kps);

        // Rep counting
        const reps = countRep(selectedExercise, kps, sessionId.current);
        setRepCount(reps);

        // Form analysis (run every few frames for performance)
        if (Math.random() < 0.1) {
          const analysis = analyzeForm(selectedExercise, kps);
          setFormScore(analysis.score);
          setFormMessages(analysis.messages);
          setIsGoodForm(analysis.isGoodForm);
        }
      }
    } catch (e) {
      console.warn('Pose detection error:', e);
    }
    animRef.current = requestAnimationFrame(runAnalysis);
  }, [selectedExercise, drawPose]);

  const startAnalysis = useCallback(() => {
    resetReps(sessionId.current);
    sessionId.current = crypto.randomUUID();
    setRepCount(0);
    setIsAnalyzing(true);
    runAnalysis();
  }, [runAnalysis]);

  const handleExerciseChange = (ex: ExerciseType) => {
    if (isAnalyzing) {
      cancelAnimationFrame(animRef.current);
      setIsAnalyzing(false);
    }
    setSelectedExercise(ex);
    setRepCount(0);
    resetReps(sessionId.current);
    setFormMessages([]);
    setFormScore(null);
  };

  const exerciseInfo = EXERCISES.find(e => e.id === selectedExercise)!;

  const { isPremium } = useFreemium();

  // ── Premium gate ──────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          className="bg-gray-900 border border-yellow-500/20 rounded-3xl p-10 text-center w-full"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
          <h2 className="text-white text-xl mb-2" style={{ fontWeight: 700 }}>
            AI Form Analyzer
          </h2>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Real-time pose detection, rep counting, and form analysis with TensorFlow MoveNet.
            This is a Premium feature.
          </p>
          <div className="space-y-3 mb-8 text-left max-w-xs mx-auto">
            {[
              '17-point body keypoint detection',
              'Real-time rep counting',
              'Form score & correction feedback',
              '5 exercise types supported',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                {f}
              </div>
            ))}
          </div>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-6 py-3 rounded-2xl transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Crown className="w-4 h-4" /> Upgrade to Premium — from $4.99/mo
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl text-white" style={{ fontWeight: 700 }}>🤖 AI Form Analyzer</h1>
        <p className="text-gray-400 text-sm mt-1">Real-time pose detection and rep counting via MoveNet</p>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Exercise selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {EXERCISES.map(ex => (
          <motion.button
            key={ex.id}
            onClick={() => handleExerciseChange(ex.id)}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm ${
              selectedExercise === ex.id
                ? 'border-green-500 bg-green-500/10 text-green-400'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
            }`}
            whileTap={{ scale: 0.96 }}
          >
            <span>{ex.emoji}</span>
            <span style={{ fontWeight: selectedExercise === ex.id ? 600 : 400 }}>{ex.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Camera & Canvas */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="relative aspect-video bg-black">
              {/* Mirror video for selfie cam */}
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                muted
                playsInline
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: 'scaleX(-1)', objectFit: 'cover' }}
              />

              {!isCameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-600">
                  <Camera className="w-16 h-16 mb-3 opacity-30" />
                  <p className="text-sm">Camera off</p>
                </div>
              )}

              {isModelLoading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-gray-300 text-sm">Loading MoveNet...</p>
                </div>
              )}

              {/* Live status badges */}
              {isAnalyzing && (
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-green-500/20 border border-green-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span className="text-green-400 text-xs">Live</span>
                  </div>
                  {formScore !== null && (
                    <div
                      className={`rounded-lg px-3 py-1.5 text-xs border ${
                        isGoodForm
                          ? 'bg-green-500/20 border-green-500/40 text-green-400'
                          : 'bg-red-500/20 border-red-500/40 text-red-400'
                      }`}
                    >
                      Form: {formScore}%
                    </div>
                  )}
                </div>
              )}

              {/* Rep counter overlay */}
              {isAnalyzing && (
                <div className="absolute top-3 right-3 bg-black/60 border border-green-500/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-green-400 text-3xl" style={{ fontWeight: 700 }}>{repCount}</p>
                  <p className="text-gray-400 text-xs">REPS</p>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 flex gap-3 flex-wrap">
              {!isCameraOn ? (
                <button
                  onClick={startCamera}
                  disabled={isModelLoading || !isModelReady}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Camera className="w-4 h-4" />
                  {isModelLoading ? 'Loading AI...' : 'Start Camera'}
                </button>
              ) : (
                <>
                  {!isAnalyzing ? (
                    <button
                      onClick={startAnalysis}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
                    >
                      <Zap className="w-4 h-4" /> Start Analysis
                    </button>
                  ) : (
                    <button
                      onClick={() => { cancelAnimationFrame(animRef.current); setIsAnalyzing(false); }}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white px-4 py-2.5 rounded-xl transition-colors text-sm"
                    >
                      <X className="w-4 h-4" /> Pause
                    </button>
                  )}
                  <button
                    onClick={() => { resetReps(sessionId.current); sessionId.current = crypto.randomUUID(); setRepCount(0); }}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Reps
                  </button>
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-400 px-4 py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <X className="w-4 h-4" /> Stop
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Exercise tip */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-blue-400 text-xs" style={{ fontWeight: 600 }}>
              💡 {exerciseInfo.label} Tip
            </p>
            <p className="text-blue-300 text-sm mt-1">{exerciseInfo.tip}</p>
          </div>
        </div>

        {/* Right panel: stats & feedback */}
        <div className="lg:col-span-2 space-y-4">
          {/* Rep counter card */}
          <motion.div
            className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center"
            animate={{ borderColor: repCount > 0 ? 'rgba(34,197,94,0.4)' : undefined }}
          >
            <Activity className="w-7 h-7 text-green-400 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">{exerciseInfo.emoji} {exerciseInfo.label}</p>
            <motion.p
              className="text-6xl text-white mt-2"
              style={{ fontWeight: 700 }}
              key={repCount}
              initial={{ scale: 1.3, color: '#5da831' }}
              animate={{ scale: 1, color: '#ffffff' }}
              transition={{ duration: 0.3 }}
            >
              {repCount}
            </motion.p>
            <p className="text-gray-500 text-sm">reps completed</p>
          </motion.div>

          {/* Form score */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h3 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Form Analysis</h3>
            {formScore !== null ? (
              <>
                {/* Score bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-400">Score</span>
                    <span className={isGoodForm ? 'text-green-400' : 'text-red-400'} style={{ fontWeight: 600 }}>
                      {formScore}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${isGoodForm ? 'bg-green-500' : 'bg-red-500'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${formScore}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  <div className="space-y-2">
                    {formMessages.map((msg, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-2 text-sm"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        {msg.startsWith('✅') ? (
                          <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={msg.startsWith('✅') ? 'text-green-300' : 'text-orange-300'}>
                          {msg.replace(/^[✅⚠️💡]\s*/, '')}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              </>
            ) : (
              <div className="text-center py-6 text-gray-600">
                <Camera className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Start analysis to see form feedback</p>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <h3 className="text-gray-400 text-xs mb-3" style={{ fontWeight: 600 }}>HOW IT WORKS</h3>
            {[
              { step: '1', text: 'AI detects 17 body keypoints' },
              { step: '2', text: 'Calculates joint angles in real-time' },
              { step: '3', text: 'Counts reps by tracking movement patterns' },
              { step: '4', text: 'Gives specific form correction feedback' },
            ].map(item => (
              <div key={item.step} className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 text-xs">{item.step}</span>
                </div>
                <span className="text-gray-400 text-xs">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}