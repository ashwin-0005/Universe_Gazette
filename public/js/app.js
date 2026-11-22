import { renderGazette, fillPhoto } from './render.js';
import { startWarp, stopWarp, playEntrance, flipOut, photoArrived, initTilt, requestSensors, delay } from './motion.js';
import { play, initSound } from './sound.js';
import { startPopups, stopPopups } from './popups.js';
import { initChips, initGlobalGestures, bindGazetteGestures, PRESETS } from './gestures.js';

const $ = s => document.querySelector(s);
// editions = this universe's timeline (edition 1, +10 years, +20 years...)
export const state = { premise: '', editions: [], index: 0, busy: false };
const current = () => state.editions[state.index];
const photosOf = ed => [ed.hero_photo, ...(ed.stories || []).map(s => s.photo), ed.cartoon].filter(Boolean);

const FALLBACK_COUNT = 3;      // public/data/fallback-1..N.json
const GENERATE_TIMEOUT = 50000; // give up on the live presses after this
const post = (url, body, ms = 45000) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(ms),
});

export async function generate(premise, extra = {}) {
  const r = await post('/api/generate', { premise, ...extra }, GENERATE_TIMEOUT);
  const data = await r.json();
  if (!r.ok) throw Object.assign(new Error(data.error || 'Unknown error'), { status: r.status });
  return data;
}

// Fills photo.svg for every photo still missing one; onEach(photo) fires as each arrives.
export function loadPhotos(ed, onEach = () => {}) {
  return Promise.all(photosOf(ed).filter(p => p.svg === undefined).map(async p => {
    try {
      const r = await post('/api/svg', { scene: p.scene || p.caption }, 30000);
      p.svg = r.ok ? (await r.json()).svg : '';
    } catch { p.svg = ''; }
    onEach(p);
  }));
}

export function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), ms);
}

export function showEdition(ed, { flip = false } = {}) {
  $('#portal').hidden = true;
  $('#stage').hidden = false;
  renderGazette(ed, $('#gazette'));
  window.scrollTo(0, 0);
  playEntrance($('#gazette'), { flip });
  bindGazetteGestures($('#gazette'));
  play('rustle');
  startPopups(ed);
  const arrived = p => { if (current() === ed) photoArrived(fillPhoto(p)); };
  photosOf(ed).forEach(p => p.svg !== undefined && arrived(p));
  loadPhotos(ed, arrived);
}

export function showPortal() {
  stopPopups();
  $('#stage').hidden = true;
  $('#portal').hidden = false;
  $('#status').textContent = '';
  $('#premise').focus();
}

async function loadFallback() {
  const n = 1 + Math.floor(Math.random() * FALLBACK_COUNT);
  const r = await fetch(`data/fallback-${n}.json`);
  if (!r.ok) throw new Error('no fallback');
  return { ...(await r.json()), is_fallback: true };
}

// Live edition; a quick failure gets one automatic retry, then a saved edition so the demo never dies.
async function fetchEdition(premise, extra, allowFallback) {
  const t0 = Date.now();
  try {
    return await generate(premise, extra);
  } catch (err) {
    console.warn('generate failed:', err.message);
    if (err.status === 429) { // out of editions: no retry, straight to the archive
      if (!allowFallback) throw err;
      toast('You have printed all 5 of your editions. Here is one from the archive.', 6000);
      return loadFallback();
    }
    if (Date.now() - t0 < 20000) {
      toast('The presses jammed! Re-inking...', 4000);
      try { return await generate(premise, extra); } catch (e) { console.warn('retry failed:', e.message); }
    }
    if (!allowFallback) throw err;
    toast('Live presses are down. Reprinting a classic edition...', 5000);
    return loadFallback();
  }
}

// Runs the warp while fetching; the warp always lasts at least 3 seconds.
async function travel(premise, extra, allowFallback = true) {
  play('clack');
  startWarp();
  try {
    const [ed] = await Promise.all([fetchEdition(premise, extra, allowFallback), delay(3000)]);
    return ed;
  } finally {
    await stopWarp();
  }
}

export async function visit(premise) {
  if (state.busy) return;
  state.busy = true;
  stopPopups();
  $('#status').textContent = '';
  try {
    const ed = await travel(premise);
    Object.assign(state, { premise: ed.is_fallback ? ed.premise : premise, editions: [ed], index: 0 });
    showEdition(ed);
    if (ed.is_fallback) setTimeout(() => toast('From the archive: ' + ed.premise, 5000), 3500);
  } catch (err) {
    if (!current()) showPortal();
    $('#status').textContent = 'The presses jammed: ' + err.message;
    toast('The presses jammed. Try again.');
  } finally {
    state.busy = false;
  }
}

// Next edition, 10 years later, consistent with the world so far
export async function fastForward() {
  if (state.busy || !current()) return;
  if (state.index < state.editions.length - 1) return switchEdition(1);
  state.busy = true;
  stopPopups();
  try {
    await flipOut($('#gazette'));
    // drawings are large and not needed for continuity
    const previous = JSON.parse(JSON.stringify(current(), (k, v) => (k === 'svg' ? undefined : v)));
    const ed = await travel(state.premise, { previous_edition: previous }, false);
    state.editions.push(ed);
    state.index = state.editions.length - 1;
    showEdition(ed, { flip: true });
    toast(`${state.index * 10} years later... (swipe right to go back)`);
  } catch (err) {
    showEdition(current());
    toast(err.status === 429 ? 'You have printed all 5 of your editions.' : 'The future is unavailable right now. Try again.');
  } finally {
    state.busy = false;
  }
}

// dir = +1 newer, -1 older
export async function switchEdition(dir) {
  const next = state.index + dir;
  if (state.busy || $('#stage').hidden || next < 0 || next >= state.editions.length) return;
  state.busy = true;
  stopPopups();
  await flipOut($('#gazette'), dir);
  state.index = next;
  showEdition(current(), { flip: true });
  toast(`Edition ${next + 1} of ${state.editions.length}`);
  state.busy = false;
}

export function newUniverse() {
  if (state.busy) return;
  const others = PRESETS.filter(p => p !== state.premise);
  const pick = others[Math.floor(Math.random() * others.length)];
  $('#premise').value = pick;
  visit(pick);
}

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  requestSensors();
  visit($('#premise').value.trim() || $('#premise').placeholder);
});

// Footer buttons and photo flips (re-rendered with every edition, so delegate)
$('#gazette').addEventListener('click', e => {
  const id = e.target.closest('button')?.id;
  if (id === 'btn-print') window.print();
  if (id === 'btn-new') showPortal();
  if (id === 'btn-ff') fastForward();
  if (id === 'btn-share') {
    const text = `${current().masthead}: ${current().banner_headline}`;
    if (navigator.share) navigator.share({ title: 'The Parallel Universe Gazette', text }).catch(() => {});
    else navigator.clipboard?.writeText(text).then(() => toast('Headline copied'));
  }
  const fig = e.target.closest('.photo');
  if (fig) { fig.classList.toggle('flipped'); play('rustle'); }
});

initTilt($('#gazette'));
initSound();
initChips($('#chips'), p => { $('#premise').value = p; requestSensors(); visit(p); });
initGlobalGestures({ onSwipe: switchEdition, onNewUniverse: newUniverse });

// ?demo=1 opens a saved edition straight away (offline preview)
const demo = new URLSearchParams(location.search).get('demo');
if (demo) fetch(`data/fallback-${demo}.json`).then(r => r.json()).then(ed => {
  Object.assign(state, { premise: ed.premise || '', editions: [ed], index: 0 });
  showEdition(ed);
}).catch(() => {});
