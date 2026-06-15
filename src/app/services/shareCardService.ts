// ============================================================
// Fit Tracker PRO — Share Card Service
// NEW FEATURE: Generates a branded PNG summary card (workout
// results or daily progress) for sharing to social/messaging
// apps via the Web Share API, with a download fallback.
// Pure Canvas 2D — no extra dependencies.
// ============================================================

export interface ShareStat {
  label: string;
  value: string;
  emoji: string;
}

export interface ShareCardData {
  kind: 'workout' | 'daily';
  heading: string;       // e.g. "Workout Complete!" or "Today's Progress"
  subheading: string;    // e.g. plan name, or date
  userName: string;
  stats: ShareStat[];    // up to 4, shown in a 2x2 grid
  streak?: number;       // optional streak badge
  date: string;          // formatted date string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ─── Main card renderer ──────────────────────────────────────────────────────
export async function renderShareCard(data: ShareCardData): Promise<Blob> {
  const W = 1080;
  const H = 1350;

  // Ensure the display font is loaded before drawing text — falls back
  // gracefully (system-ui) if the font fails to load within 1.5s.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 38px "Space Grotesk"'),
        document.fonts.load('800 76px "Space Grotesk"'),
      ]),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]);
  } catch {
    // Font loading isn't critical — proceed with fallback fonts
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // ── Background gradient ──────────────────────────────────────────────────
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1814');
  bg.addColorStop(1, '#0e0d0b');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Decorative glow circles
  const glow1 = ctx.createRadialGradient(W * 0.85, H * 0.08, 0, W * 0.85, H * 0.08, 420);
  glow1.addColorStop(0, 'rgba(93, 168, 49, 0.25)');
  glow1.addColorStop(1, 'rgba(93, 168, 49, 0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, W, H);

  const glow2 = ctx.createRadialGradient(W * 0.1, H * 0.95, 0, W * 0.1, H * 0.95, 380);
  glow2.addColorStop(0, 'rgba(232, 99, 58, 0.15)');
  glow2.addColorStop(1, 'rgba(232, 99, 58, 0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  // ── App branding ──────────────────────────────────────────────────────────
  let y = 100;
  ctx.fillStyle = '#5da831';
  roundRect(ctx, 80, y - 36, 56, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#1a1814';
  ctx.font = '700 32px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', 96, y - 6);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 38px "Space Grotesk", system-ui, -apple-system, sans-serif';
  ctx.fillText('FIT TRACKER', 156, y - 16);
  ctx.fillStyle = '#5da831';
  ctx.fillText('PRO', 156 + ctx.measureText('FIT TRACKER ').width, y - 16);

  // ── Heading ───────────────────────────────────────────────────────────────
  y = 280;
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 76px "Space Grotesk", system-ui, -apple-system, sans-serif';
  const headingLines = wrapText(ctx, data.heading, W - 160);
  headingLines.forEach((line, i) => {
    ctx.fillText(line, 80, y + i * 86);
  });
  y += headingLines.length * 86 + 16;

  // Subheading
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 38px system-ui, -apple-system, sans-serif';
  ctx.fillText(data.subheading, 80, y);
  y += 56;

  // Name + date
  ctx.fillStyle = '#6b7280';
  ctx.font = '400 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(`${data.userName} · ${data.date}`, 80, y);

  // ── Streak badge ──────────────────────────────────────────────────────────
  if (data.streak && data.streak > 0) {
    const badgeY = y + 70;
    const badgeText = `🔥 ${data.streak} Day Streak`;
    ctx.font = '700 34px system-ui, -apple-system, sans-serif';
    const textW = ctx.measureText(badgeText).width;
    const badgeW = textW + 64;
    const badgeH = 76;

    const grad = ctx.createLinearGradient(80, badgeY, 80 + badgeW, badgeY);
    grad.addColorStop(0, 'rgba(232, 99, 58, 0.25)');
    grad.addColorStop(1, 'rgba(217, 166, 54, 0.15)');
    ctx.fillStyle = grad;
    roundRect(ctx, 80, badgeY, badgeW, badgeH, 24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 99, 58, 0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, 80, badgeY, badgeW, badgeH, 24);
    ctx.stroke();

    ctx.fillStyle = '#f0c24e';
    ctx.fillText(badgeText, 80 + 32, badgeY + badgeH / 2);
    y = badgeY + badgeH + 50;
  } else {
    y += 60;
  }

  // ── Stats grid (2x2) ──────────────────────────────────────────────────────
  const gridTop = y;
  const gap = 24;
  const cardW = (W - 160 - gap) / 2;
  const cardH = 200;

  data.stats.slice(0, 4).forEach((stat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = 80 + col * (cardW + gap);
    const cy = gridTop + row * (cardH + gap);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    roundRect(ctx, cx, cy, cardW, cardH, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, cx, cy, cardW, cardH, 28);
    ctx.stroke();

    // emoji
    ctx.font = '54px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.emoji, cx + 36, cy + 60);

    // value
    ctx.font = '800 56px "Space Grotesk", system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(stat.value, cx + 36, cy + 132);

    // label
    ctx.font = '500 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.fillText(stat.label, cx + 36, cy + 174);
  });

  // ── Footer tagline ────────────────────────────────────────────────────────
  ctx.textAlign = 'center';
  ctx.font = '500 30px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#4b5563';
  ctx.fillText('Track your fitness journey with Fit Tracker PRO', W / 2, H - 70);
  ctx.textAlign = 'left';

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob!), 'image/png', 0.95);
  });
}

// ─── Share / Download ────────────────────────────────────────────────────────
export async function shareCardImage(blob: Blob, filename: string, shareText: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], filename, { type: 'image/png' });

  // Try native Web Share API (mobile — Instagram/WhatsApp/etc.)
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Fit Tracker PRO',
        text: shareText,
      });
      return 'shared';
    } catch (e) {
      // AbortError = user cancelled the share sheet — not a failure
      if (e instanceof Error && e.name === 'AbortError') return 'cancelled';
      // fall through to download on other errors
    }
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
