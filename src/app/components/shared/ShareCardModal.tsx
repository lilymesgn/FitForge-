// ============================================================
// Fit Tracker PRO — Share Card Modal
// NEW FEATURE: Reusable modal that renders a branded PNG
// summary card (workout completion or daily progress) and
// lets the user share it natively or download it.
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { X, Share2, Download, Loader2, Check } from 'lucide-react';
import { renderShareCard, shareCardImage, type ShareCardData } from '../../services/shareCardService';

interface ShareCardModalProps {
  data: ShareCardData;
  onClose: () => void;
}

export default function ShareCardModal({ data, onClose }: ShareCardModalProps) {
  const canvasPreviewRef = useRef<HTMLImageElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'busy' | 'shared' | 'downloaded'>('idle');

  // Generate the card image once on mount
  useEffect(() => {
    let url: string | null = null;
    renderShareCard(data).then(b => {
      setBlob(b);
      url = URL.createObjectURL(b);
      setPreviewUrl(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [data]);

  const filename = `fittracker-${data.kind}-${new Date().toISOString().split('T')[0]}.png`;
  const shareText = data.kind === 'workout'
    ? `Just finished "${data.subheading}" on Fit Tracker PRO 💪`
    : `My progress today on Fit Tracker PRO 🔥`;

  const handleShare = async () => {
    if (!blob) return;
    setStatus('busy');
    const result = await shareCardImage(blob, filename, shareText);
    if (result === 'shared') setStatus('shared');
    else if (result === 'downloaded') setStatus('downloaded');
    else setStatus('idle');
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center p-4" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h3 className="text-white font-bold">Share Your Progress</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-5 pb-3 flex-1 overflow-y-auto">
          <div className="rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 aspect-[4/5] flex items-center justify-center">
            {previewUrl ? (
              <img ref={canvasPreviewRef} src={previewUrl} alt="Share card preview" className="w-full h-full object-cover" />
            ) : (
              <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 pt-1 flex-shrink-0 space-y-2">
          <button
            onClick={handleShare}
            disabled={!blob || status === 'busy'}
            className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl transition-colors text-sm"
          >
            {status === 'busy' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : status === 'shared' ? (
              <Check className="w-4 h-4" />
            ) : status === 'downloaded' ? (
              <Download className="w-4 h-4" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            {status === 'shared' ? 'Shared!' : status === 'downloaded' ? 'Saved to device' : 'Share'}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl py-3 text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
