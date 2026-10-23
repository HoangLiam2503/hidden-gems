import { GEMS, HUNT } from './gems.js';
import { getPosition, isNear, proximityLabel, watchPosition, distanceM } from './geo.js';
import { loadModel, loadImage, embedImage, scorePhoto, refEmbeddings, refUrl } from './vision.js';
import { loadProgress, saveProgress, freshProgress, savePhoto, clearPhotos } from './store.js';
import { albumEntries, buildCollage, shareOrDownload, formatDuration } from './album.js';
import { shutter } from './shutter.js';
import { magnetize } from './magnetic.js';

const $ = (id) => document.getElementById(id);
const MAX_PHOTO_PX = 1280;
const FIX_MAX_AGE_MS = 15000;
const NO_GPS_STRICTNESS = 0.05; // photo-only checks need a closer match
const KEEP_AFTER_FAILS = 3;
const GPS_SLOW_MS = 15000;

let progress = loadProgress();
let lastFix = null;      // {lat, lng, accuracy, at} or {denied: true}
let gpsSlow = false;     // no fix yet after GPS_SLOW_MS on this clue
let stopWatch = () => {};
let modelState = 'loading';
let pending = null;      // the photo being checked: {blob, url}
let collageBlob = null;

const judge = (() => {
  const q = new URLSearchParams(location.search).get('judge');
  try {
    if (q === '1') localStorage.setItem('hidden-gems:judge', '1');
    if (q === '0') localStorage.removeItem('hidden-gems:judge');
    return localStorage.getItem('hidden-gems:judge') === '1';
  } catch {
    return q === '1';
  }
})();
// Judges play from the showcase room, so only the first gem needs a real trip.
const locationRequired = (index) => !(judge && index > 0);

/* ---------- screens ---------- */

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  window.scrollTo(0, 0);
  if (name !== 'clue' && name !== 'check') { stopWatch(); stopWatch = () => {}; }
}

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

const feet = (m) => {
  const ft = Math.round((m * 3.281) / 10) * 10;
  return ft >= 1000 ? `${(m / 1609).toFixed(1)} miles` : `${ft} ft`;
};

/* ---------- intro ---------- */

const inProgress = () => Boolean(progress.startedAt && !progress.finishedAt);

function renderIntro() {
  const resuming = inProgress();
  $('btn-resume').hidden = !resuming;
  $('btn-resume').textContent = `Continue your hunt · stop ${progress.index + 1} of ${GEMS.length}`;
  $('btn-start').textContent = resuming ? 'Start over' : 'Start the hunt';
  $('btn-start').className = resuming ? 'btn btn-ghost' : 'btn btn-primary';
  const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  $('stop-count').textContent = words[GEMS.length] || String(GEMS.length);
  show('intro');
  shutter($('intro-title'), HUNT.title);
}

// Destructive buttons need a second tap within 3 s, so a stray tap can't wipe
// a hunt in progress.
const armed = new WeakMap();
function armConfirm(btn, label, confirmLabel, onConfirm) {
  const disarm = () => {
    clearTimeout(armed.get(btn));
    armed.delete(btn);
    btn.textContent = label;
    btn.classList.remove('armed');
  };
  if (armed.has(btn)) {
    disarm();
    onConfirm();
    return;
  }
  btn.textContent = confirmLabel;
  btn.classList.add('armed');
  armed.set(btn, setTimeout(disarm, 3000));
}

// Loads quietly in the background; if it fails, the photo step says so.
function warmUpModel() {
  loadModel().then(() => { modelState = 'ready'; }, (err) => {
    console.error(err);
    modelState = 'failed';
  });
}

async function startHunt() {
  progress = { ...freshProgress(), startedAt: Date.now() };
  saveProgress(progress);
  collageBlob = null;
  await clearPhotos();
  showClue();
}

/* ---------- clue ---------- */

function renderFacets(container, doneCount, currentIndex) {
  container.innerHTML = '';
  GEMS.forEach((_, i) => {
    const el = document.createElement('i');
    if (i < doneCount) el.className = 'done';
    else if (i === currentIndex) el.className = 'current';
    container.appendChild(el);
  });
}

function renderHints() {
  const gem = GEMS[progress.index];
  const box = $('hints');
  box.innerHTML = '';
  gem.hints.slice(0, progress.hintsShown).forEach((h) => {
    const p = document.createElement('p');
    p.textContent = h;
    box.appendChild(p);
  });
  const photoHint = progress.attempts >= 2 && gem.refs.length > 0;
  if (photoHint) {
    const fig = document.createElement('figure');
    fig.innerHTML = '<img alt=""><figcaption>A blurry peek at the spot.</figcaption>';
    fig.querySelector('img').src = refUrl(gem, gem.refs[0]);
    box.appendChild(fig);
  }
  const more = progress.hintsShown < gem.hints.length;
  $('btn-hint').hidden = !more;
  $('btn-hint').textContent = progress.hintsShown ? 'Another hint?' : 'Need a hint?';
}

function renderHeat() {
  const heat = $('heat');
  const label = $('heat-label');
  const gem = GEMS[progress.index];
  if (!locationRequired(progress.index)) {
    heat.dataset.level = '4';
    label.textContent = 'Judge mode: location not required for this gem';
  } else if (lastFix?.denied) {
    heat.dataset.level = '';
    label.textContent = 'Location is off — we will check your photo only.';
  } else if (!lastFix) {
    heat.dataset.level = '';
    label.textContent = gpsSlow
      ? 'Still looking for GPS. Step into the open, or take the photo anyway — we\'ll check it.'
      : 'Finding your location…';
  } else {
    const p = proximityLabel(distanceM(lastFix, gem));
    heat.dataset.level = String(p.level);
    label.textContent = p.text;
  }
}

function showClue() {
  const gem = GEMS[progress.index];
  renderFacets($('facets'), progress.index, progress.index);
  $('clue-counter').textContent = `Stop ${progress.index + 1} of ${GEMS.length}`;
  $('clue-text').textContent = gem.clue;
  renderHints();
  show('clue');
  gpsSlow = false;
  renderHeat();
  stopWatch();
  const stopGps = watchPosition((fix) => {
    lastFix = { ...fix, at: Date.now() };
    renderHeat();
  }, () => {
    lastFix = { denied: true };
    renderHeat();
  });
  const slowTimer = setTimeout(() => { gpsSlow = true; renderHeat(); }, GPS_SLOW_MS);
  stopWatch = () => { stopGps(); clearTimeout(slowTimer); };
  // Fingerprint the reference photos now so the check is instant later; the
  // check compares against every gem, current one first.
  if (modelState !== 'failed') {
    [gem, ...GEMS.filter((g) => g !== gem)].reduce(
      (p, g) => p.then(() => refEmbeddings(g)), Promise.resolve(),
    ).catch((e) => console.error(e));
  }
}

/* ---------- photo check ---------- */

async function normalizePhoto(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, MAX_PHOTO_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
    return { blob, img: c };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function setCheck(id, state, text) {
  const li = $(id);
  li.className = state;
  li.querySelector('small').textContent = text || '';
}

async function checkLocation(gem, index) {
  if (!locationRequired(index)) return { status: 'skip', text: 'Judge mode — skipped' };
  let fix = lastFix && !lastFix.denied && Date.now() - lastFix.at < FIX_MAX_AGE_MS ? lastFix : null;
  if (!fix) {
    const p = await getPosition();
    if (p && !p.denied) fix = lastFix = { ...p, at: Date.now() };
    else if (p?.denied) lastFix = { denied: true };
  }
  if (!fix) return { status: 'unavailable', text: 'Location unavailable — checking the photo only' };
  const { near, distance } = isNear(fix, gem);
  return near
    ? { status: 'pass', distance, text: 'GPS puts you within range of this stop' }
    : { status: 'fail', distance, text: `About ${feet(distance)} away` };
}

async function checkPhoto(gem, img, strict) {
  if (modelState === 'failed') return { status: 'unavailable', text: 'Photo checker unavailable' };
  try {
    const emb = await embedImage(img);
    const score = await scorePhoto(emb, gem);
    if (score === null) return { status: 'skip', text: 'No reference photos for this gem yet' };
    // Neighbouring gems can look alike (most of campus is red brick), so the
    // photo must also match this gem better than any other.
    let rival = -1;
    for (const other of GEMS) {
      if (other.id === gem.id) continue;
      const s = await scorePhoto(emb, other);
      if (s !== null) rival = Math.max(rival, s);
    }
    const need = gem.threshold + (strict ? NO_GPS_STRICTNESS : 0);
    const pass = score >= need && score >= rival;
    const detail = judge ? ` (score ${score.toFixed(2)} / need ${need.toFixed(2)}, best other ${rival.toFixed(2)})` : '';
    const otherStop = score >= need && score < rival;
    const why = otherStop ? 'This looks more like a different stop' : 'This does not look like the spot yet';
    return { status: pass ? 'pass' : 'fail', score, otherStop, text: (pass ? 'Looks like the spot' : why) + detail };
  } catch (e) {
    console.error(e);
    return { status: 'unavailable', text: 'Photo checker hit a snag' };
  }
}

async function onPhotoChosen(file) {
  if (!file) return;
  const index = progress.index;
  const gem = GEMS[index];
  show('check');
  $('result').hidden = true;
  $('scan').classList.remove('off');
  setCheck('check-loc', '', 'Checking…');
  setCheck('check-img', '', 'Waiting…');
  if (pending) URL.revokeObjectURL(pending.url);
  pending = null;

  let photo;
  try {
    photo = await normalizePhoto(file);
  } catch (e) {
    console.error(e);
    toast('We could not read that photo. Please try again.');
    showClue();
    return;
  }
  pending = { blob: photo.blob, url: URL.createObjectURL(photo.blob), index };
  $('check-photo').src = pending.url;

  const loc = await checkLocation(gem, index);
  setCheck('check-loc', loc.status, loc.text);
  setCheck('check-img', '', 'Comparing with the hidden spot…');
  const pic = await checkPhoto(gem, photo.img, loc.status === 'unavailable');
  setCheck('check-img', pic.status, pic.text);
  $('scan').classList.add('off');

  const passed = loc.status !== 'fail' && pic.status !== 'fail';
  if (passed) {
    setTimeout(() => acceptPhoto(true, { score: pic.score, distance: loc.distance }), 700);
    return;
  }

  progress.attempts += 1;
  saveProgress(progress);
  let title, body;
  if (loc.status === 'fail') {
    title = 'Not quite here';
    body = `GPS puts you about ${feet(loc.distance)} from this stop (GPS can be off by a few dozen feet). Re-read the clue and follow the heat meter — it glows hotter as you get close.`;
  } else if (pic.otherStop) {
    title = 'That looks like a different stop';
    body = 'Re-read the clue: it says exactly what to capture. Get that in the middle of the frame and try again.';
  } else {
    title = 'Close, but not that shot';
    body = 'Frame the thing the clue describes so it fills most of the photo, in good light, and try again.';
  }
  if (progress.attempts >= 2 && gem.refs.length) body += ' A photo hint is now waiting on the clue screen.';
  $('result-title').textContent = title;
  $('result-body').textContent = body;
  $('btn-keep').hidden = !(judge || progress.attempts >= KEEP_AFTER_FAILS);
  $('result').hidden = false;
}

async function acceptPhoto(verified, info = {}) {
  if (!pending || pending.index !== progress.index) return;
  const gem = GEMS[progress.index];
  await savePhoto(gem.id, pending.blob);
  progress.results.push({ gemId: gem.id, at: Date.now(), verified, ...info });
  progress.index += 1;
  progress.attempts = 0;
  progress.hintsShown = 0;
  if (progress.index >= GEMS.length) progress.finishedAt = Date.now();
  saveProgress(progress);
  showFound(gem);
}

/* ---------- found ---------- */

function showFound(gem) {
  const last = progress.index >= GEMS.length;
  $('found-counter').textContent = `Stop ${progress.index} of ${GEMS.length} · found`;
  shutter($('found-name'), gem.name);
  $('found-photo').src = pending.url;
  $('found-fact').textContent = gem.fact;
  $('btn-next').textContent = last ? 'See your album' : 'Next clue';
  show('found');
}

/* ---------- album ---------- */

async function showAlbum() {
  show('album');
  const entries = await albumEntries(GEMS, progress);
  const grid = $('album-grid');
  grid.innerHTML = '';
  for (const { gem, result, blob } of entries) {
    const fig = document.createElement('figure');
    fig.innerHTML = '<img alt=""><figcaption></figcaption>';
    fig.querySelector('img').src = URL.createObjectURL(blob);
    const cap = fig.querySelector('figcaption');
    cap.textContent = gem.name;
    const small = document.createElement('small');
    small.textContent = new Date(result.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    cap.appendChild(small);
    grid.appendChild(fig);
  }
  const dur = progress.finishedAt && progress.startedAt ? ` in ${formatDuration(progress.finishedAt - progress.startedAt)}` : '';
  $('album-summary').textContent = `You found all ${GEMS.length} hidden gems${dur}. Most people walk past every one of them.`;

  const share = $('btn-share');
  share.disabled = true;
  share.textContent = 'Preparing your album…';
  // Build the collage up front: iOS only allows the share sheet right after a tap.
  try {
    collageBlob = entries.length ? await buildCollage(entries, progress) : null;
  } catch (e) {
    console.error(e);
    collageBlob = null;
  }
  share.disabled = !collageBlob;
  share.textContent = collageBlob ? 'Save & share my album' : 'Album image unavailable';
  confetti();
}

function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('confetti');
  const ctx = c.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  c.width = innerWidth * dpr;
  c.height = innerHeight * dpr;
  const colors = ['#e87722', '#ffb347', '#003865', '#0b4a80', '#ffffff'];
  const bits = Array.from({ length: 120 }, () => ({
    x: Math.random() * c.width, y: -Math.random() * c.height * 0.5,
    vy: (2 + Math.random() * 3) * dpr, vx: (Math.random() - 0.5) * 2 * dpr,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
    s: (6 + Math.random() * 8) * dpr, color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + 3500;
  (function frame(t) {
    ctx.clearRect(0, 0, c.width, c.height);
    if (t > end) return;
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.r += b.vr;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.r);
      ctx.fillStyle = b.color;
      ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      ctx.restore();
    }
    requestAnimationFrame(frame);
  })(performance.now());
}

function onReset() {
  armConfirm($('btn-reset'), 'Play again', 'Tap again to erase this album', () => {
    progress = freshProgress();
    saveProgress(progress);
    clearPhotos();
    renderIntro();
  });
}

/* ---------- wiring ---------- */

function beginHunt() {
  // Ask for location now (during a tap) so the prompt isn't a surprise later.
  getPosition({ timeout: 8000 }).then((p) => { if (p) lastFix = p.denied ? p : { ...p, at: Date.now() }; });
  startHunt();
}
$('btn-start').addEventListener('click', () => {
  if (inProgress()) armConfirm($('btn-start'), 'Start over', 'Tap again to erase your progress', beginHunt);
  else beginHunt();
});
$('btn-resume').addEventListener('click', () => (progress.finishedAt ? showAlbum() : showClue()));
$('btn-hint').addEventListener('click', () => {
  progress.hintsShown += 1;
  saveProgress(progress);
  renderHints();
});
$('photo-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  e.target.value = ''; // allow choosing the same file again
  onPhotoChosen(file);
});
$('btn-back').addEventListener('click', showClue);
$('btn-keep').addEventListener('click', () => acceptPhoto(false));
$('btn-next').addEventListener('click', () => (progress.index >= GEMS.length ? showAlbum() : showClue()));
$('btn-share').addEventListener('click', async () => {
  if (!collageBlob) return;
  const how = await shareOrDownload(collageBlob);
  if (how === 'downloaded') toast('Album saved to your downloads.');
});
$('btn-reset').addEventListener('click', onReset);

if (judge) $('judge-badge').hidden = false;
document.title = `${HUNT.title} · Bucknell`;
// Tapping the title replays the shutter, like the original's re-shutter button.
$('intro-title').addEventListener('click', () => shutter($('intro-title'), HUNT.title));
magnetize([$('btn-resume'), $('btn-start')]);
warmUpModel();
if (progress.finishedAt) showAlbum();
else renderIntro();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW registration failed', e));
}
