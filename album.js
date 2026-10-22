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

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildCollage(entries, progress) {
  const W = 1080, PAD = 56, GAP = 32, COLS = 2;
  const tile = (W - PAD * 2 - GAP * (COLS - 1)) / COLS;
  const caption = 64;
  const rows = Math.ceil(entries.length / COLS);
  const header = 230, footer = 110;
  const H = header + rows * (tile + caption + GAP) - GAP + footer;

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = ORANGE;
  ctx.font = '700 30px system-ui, -apple-system, sans-serif';
  ctx.fillText(HUNT.subtitle.toUpperCase(), PAD, 92);
  ctx.fillStyle = CREAM;
  ctx.font = '800 76px Georgia, "Times New Roman", serif';
  ctx.fillText(HUNT.title, PAD, 168);
  const dur = progress.finishedAt && progress.startedAt ? ' · ' + formatDuration(progress.finishedAt - progress.startedAt) : '';
  ctx.font = '500 28px system-ui, -apple-system, sans-serif';
  ctx.globalAlpha = 0.8;
  ctx.fillText(`${entries.length} gems found${dur}`, PAD, 210);
  ctx.globalAlpha = 1;

  for (let i = 0; i < entries.length; i++) {
    const { gem, blob } = entries[i];
    const x = PAD + (i % COLS) * (tile + GAP);
    const y = header + Math.floor(i / COLS) * (tile + caption + GAP);
    const img = await blobToImage(blob);
    ctx.save();
    roundRect(ctx, x, y, tile, tile, 24);
    ctx.clip();
    coverCrop(ctx, img, x, y, tile, tile);
    ctx.restore();
    URL.revokeObjectURL(img.src);

    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.arc(x + 40, y + 40, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '800 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), x + 40, y + 49);
    ctx.textAlign = 'left';

    ctx.fillStyle = CREAM;
    ctx.font = '700 30px system-ui, -apple-system, sans-serif';
    ctx.fillText(gem.name, x + 4, y + tile + 44, tile - 8);
  }

  ctx.fillStyle = ORANGE;
  ctx.font = '600 26px system-ui, -apple-system, sans-serif';
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
