// ============================================================
// Fit Tracker PRO — Reusable Video Player Component
// Features:
//   • Lazy loads via IntersectionObserver (no blocking)
//   • Supports YouTube embed URLs & direct video files
//   • Preview mode: shows placeholder until user clicks
//   • Mobile-optimized 16:9 aspect ratio
//   • Graceful fallback for missing/invalid URLs
// ============================================================
import { useState, useRef, useEffect } from 'react';
import { Play, Video } from 'lucide-react';
import { motion } from 'motion/react';

interface VideoPlayerProps {
  url?: string;             // YouTube embed URL or direct video URL
  title?: string;           // Exercise name for alt text
  autoLoad?: boolean;       // Skip preview, load immediately
  className?: string;
}

/** Detect if URL is a YouTube embed */
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com/embed') || url.includes('youtu.be');
}

/** Placeholder shown when no video URL is provided */
function VideoPlaceholder({ title }: { title?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-2 bg-gray-900 rounded-xl">
      <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center">
        <Video className="w-5 h-5 text-gray-600" />
      </div>
      <p className="text-gray-600 text-xs text-center px-4">
        {title ? `${title} demo` : 'Exercise demo video'}
      </p>
      <p className="text-gray-700 text-xs">Video coming soon</p>
    </div>
  );
}

/** Preview state — shows thumbnail-like placeholder with play button */
function VideoPreview({ title, onPlay }: { title?: string; onPlay: () => void }) {
  return (
    <motion.button
      onClick={onPlay}
      className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 hover:border-green-500/40 transition-colors group"
      whileTap={{ scale: 0.98 }}
    >
      <motion.div
        className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center group-hover:bg-green-500/30 transition-colors"
        whileHover={{ scale: 1.1 }}
      >
        <Play className="w-6 h-6 text-green-400 ml-0.5" fill="currentColor" />
      </motion.div>
      <div className="text-center">
        <p className="text-white text-sm" style={{ fontWeight: 600 }}>
          {title ? `Watch ${title}` : 'Watch Demo'}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">Tap to play exercise demo</p>
      </div>
    </motion.button>
  );
}

export function VideoPlayer({ url, title, autoLoad = false, className = '' }: VideoPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(autoLoad);
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── IntersectionObserver: only mount player when visible ──────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handlePlay = () => setIsLoaded(true);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl bg-gray-900 ${className}`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* No URL → show placeholder */}
      {!url && <VideoPlaceholder title={title} />}

      {/* Has URL, not loaded yet → show preview */}
      {url && !isLoaded && isVisible && (
        <VideoPreview title={title} onPlay={handlePlay} />
      )}

      {/* Lazy placeholder before visible */}
      {url && !isVisible && (
        <VideoPlaceholder title={title} />
      )}

      {/* Loaded: render player */}
      {url && isLoaded && isVisible && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isYouTubeUrl(url) ? (
            <iframe
              src={`${url}?autoplay=1&rel=0&modestbranding=1`}
              title={title || 'Exercise demo'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0 rounded-xl"
              loading="lazy"
            />
          ) : (
            <video
              src={url}
              autoPlay
              controls
              playsInline
              className="w-full h-full object-cover rounded-xl"
            />
          )}
        </motion.div>
      )}
    </div>
  );
}
