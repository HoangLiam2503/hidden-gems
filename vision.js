// On-device photo matching. MobileNet v2 turns an image into a 1280-number
// "fingerprint"; photos of the same spot have similar fingerprints. A player's
// photo passes when it is close enough to any reference photo of the gem.
//
// Requires vendor/tf.min.js loaded as a classic script (global `tf`).

const SIZE = 224;
// Resolve paths from this file so pages in subfolders (tools/) work too.
const ROOT = new URL('./', import.meta.url);
let modelPromise = null;
const refCache = new Map(); // gem id -> Promise<Float32Array[]>

export function loadModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.ready();
      const model = await tf.loadGraphModel(new URL('model/model.json', ROOT).href);
      // First run compiles shaders; do it now so the first real check is fast.
      tf.tidy(() => model.predict(tf.zeros([1, SIZE, SIZE, 3])));
      return model;
    })();
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image: ' + src));
    img.src = src;
  });
}

// Two views per image: a center square (what the player aimed at) and the
// whole frame squeezed to a square (keeps the surroundings).
function views(img) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const s = Math.min(w, h);
  const make = (sx, sy, sw, sh) => {
    const c = document.createElement('canvas');
    c.width = c.height = SIZE;
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
    return c;
  };
  return [make((w - s) / 2, (h - s) / 2, s, s), make(0, 0, w, h)];
}

async function embedCanvas(model, canvas) {
  const out = tf.tidy(() => {
    const x = tf.browser.fromPixels(canvas).toFloat().div(255).expandDims(0);
    const v = model.predict(x).squeeze();
    return v.div(v.norm());
  });
  const data = await out.data();
  out.dispose();
  return data;
}

export async function embedImage(img) {
  const model = await loadModel();
  const result = [];
  for (const c of views(img)) result.push(await embedCanvas(model, c));
  return result;
}

function cosine(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function refUrl(gem, file) {
  return new URL(`gems/${gem.id}/${file}`, ROOT).href;
}

export function refEmbeddings(gem) {
  if (!refCache.has(gem.id)) {
    const p = (async () => {
      const all = [];
      for (const file of gem.refs) {
        const img = await loadImage(refUrl(gem, file));
        all.push(...(await embedImage(img)));
      }
      return all;
    })();
    p.catch(() => refCache.delete(gem.id));
    refCache.set(gem.id, p);
  }
  return refCache.get(gem.id);
}

// Best similarity (0-1) between a photo and a gem's references, or null when
// the gem has no reference photos yet.
export async function scorePhoto(photoEmbeddings, gem) {
  const refs = await refEmbeddings(gem);
  if (!refs.length) return null;
  let best = -1;
  for (const p of photoEmbeddings) for (const r of refs) best = Math.max(best, cosine(p, r));
  return best;
}
