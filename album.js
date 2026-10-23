// Final album: an on-screen grid plus a shareable collage image.

import { HUNT } from './gems.js';
import { getPhoto } from './store.js';

const NAVY = '#003865';
const ORANGE = '#E87722';
const CREAM = '#FFF8EF';

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

// Pairs each found gem with its photo, in hunt order.
export async function albumEntries(gems, progress) {
  const out = [];
  for (const r of progress.results) {
    const gem = gems.find((g) => g.id === r.gemId);
    const blob = await getPhoto(r.gemId);
    if (gem && blob) out.push({ gem, result: r, blob });
  }
  return out;
}

export function formatDuration(ms) {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function coverCrop(ctx, img, x, y, w, h) {
  const s = Math.min(img.naturalWidth / w, img.naturalHeight / h);
  const sw = w * s, sh = h * s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

const FONT = 'Inter, system-ui, -apple-system, sans-serif';
const PEACH = '#f4b78f';

// The hero's slitted-glass bars, as a strip across the collage.
function glassStrip(ctx, x, y, w, h) {
  const n = 6, bw = w / n;
  for (let i = 0; i < n; i++) {
    const bh = h * (0.35 + 0.65 * (i + 1) / n);
    const g = ctx.createLinearGradient(0, y + h, 0, y + h - bh);
    g.addColorStop(0, CREAM); g.addColorStop(0.18, PEACH); g.addColorStop(0.42, ORANGE);
    g.addColorStop(0.78, 'rgba(11, 74, 128, .92)'); g.addColorStop(1, 'rgba(0, 56, 101, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + i * bw, y + h - bh, bw - 2, bh);
  }
}

export async function buildCollage(entries, progress) {
  const W = 1080, PAD = 56, GAP = 32, COLS = 2;
  const tile = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const caption = 64;
  const rows = Math.ceil(entries.length / COLS);
  const header = 340, footer = 110;
  const H = header + rows * (tile + caption + GAP) - GAP + footer;

  // Canvas only uses a web font once it has loaded.
  try { await Promise.all([document.fonts.load(`800 76px ${FONT}`), document.fonts.load(`600 30px ${FONT}`)]); } catch { /* fallback font */ }
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = PEACH;
  ctx.font = `700 26px ${FONT}`;
  ctx.fillText(HUNT.subtitle.toUpperCase(), PAD, 92);
  ctx.fillStyle = CREAM;
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText(HUNT.title, PAD, 168);
  const dur = progress.finishedAt && progress.startedAt ? ' · ' + formatDuration(progress.finishedAt - progress.startedAt) : '';
  ctx.font = `500 28px ${FONT}`;
  ctx.globalAlpha = 0.8;
  ctx.fillText(`${entries.length} gems found${dur}`, PAD, 212);
  ctx.globalAlpha = 1;
  glassStrip(ctx, 0, 236, W, 76);

  for (let i = 0; i < entries.length; i++) {
    const { gem, blob } = entries[i];
    const x = PAD + (i % COLS) * (tile + GAP);
    const y = header + Math.floor(i / COLS) * (tile + caption + GAP);
    const img = await blobToImage(blob);
    coverCrop(ctx, img, x, y, tile, tile);
    URL.revokeObjectURL(img.src);

    ctx.fillStyle = NAVY;
    ctx.fillRect(x, y, 56, 48);
    ctx.fillStyle = PEACH;
    ctx.font = `700 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1).padStart(2, '0'), x + 28, y + 32);
    ctx.textAlign = 'left';

    ctx.fillStyle = CREAM;
    ctx.font = `600 30px ${FONT}`;
    ctx.fillText(gem.name, x + 4, y + tile + 44, tile - 8);
  }

  ctx.fillStyle = PEACH;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText('◆  Bucknell University · ' + new Date(progress.finishedAt || Date.now()).toLocaleDateString(), PAD, H - 48);

  return new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.9));
}

// Share sheet when the phone supports sharing files; otherwise download.
export async function shareOrDownload(blob) {
  const file = new File([blob], 'hidden-gems-album.jpg', { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: HUNT.title, text: `I found every ${HUNT.title} gem at Bucknell!` });
      return 'shared';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'downloaded';
}
