import { renderGazette, fillPhoto } from './render.js';
import { startWarp, stopWarp, playEntrance, photoArrived, initTilt, requestSensors, delay } from './motion.js';

const $ = s => document.querySelector(s);
export const state = { premise: '', edition: null, busy: false };

const post = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export async function generate(premise, extra = {}) {
  const r = await post('/api/generate', { premise, ...extra });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Unknown error');
  return data;
}

// Fills photo.svg for every photo in the edition; onEach(photo) fires as each arrives.
export function loadPhotos(ed, onEach = () => {}) {
  const photos = [ed.hero_photo, ...(ed.stories || []).map(s => s.photo), ed.cartoon].filter(p => p && p.svg === undefined);
  return Promise.all(photos.map(async p => {
    try {
      const r = await post('/api/svg', { scene: p.scene || p.caption });
      p.svg = r.ok ? (await r.json()).svg : '';
    } catch { p.svg = ''; }
    onEach(p);
  }));
}

export function showEdition(ed) {
  state.edition = ed;
  $('#portal').hidden = true;
  $('#stage').hidden = false;
  renderGazette(ed, $('#gazette'));
  window.scrollTo(0, 0);
  playEntrance($('#gazette'));
  loadPhotos(ed, p => photoArrived(fillPhoto(p)));
  [ed.hero_photo, ...(ed.stories || []).map(s => s.photo), ed.cartoon].forEach(p => p?.svg && photoArrived(fillPhoto(p)));
}

export function showPortal() {
  $('#stage').hidden = true;
  $('#portal').hidden = false;
  $('#status').textContent = '';
  $('#premise').focus();
}

export async function visit(premise, extra = {}) {
  if (state.busy) return;
  state.busy = true;
  state.premise = premise;
  $('#status').textContent = '';
  startWarp();
  try {
    // the warp always lasts at least 3 seconds
    const [ed] = await Promise.all([generate(premise, extra), delay(3000)]);
    await stopWarp();
    showEdition(ed);
  } catch (err) {
    await stopWarp();
    $('#status').textContent = 'The presses jammed: ' + err.message;
  } finally {
    state.busy = false;
  }
}

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  requestSensors();
  visit($('#premise').value.trim() || $('#premise').placeholder);
});

// Footer buttons (re-rendered with every edition, so delegate)
$('#gazette').addEventListener('click', e => {
  const id = e.target.closest('button')?.id;
  if (id === 'btn-print') window.print();
  if (id === 'btn-new') showPortal();
  if (id === 'btn-share') {
    const text = `${state.edition.masthead}: ${state.edition.banner_headline}`;
    if (navigator.share) navigator.share({ title: 'The Parallel Universe Gazette', text }).catch(() => {});
    else navigator.clipboard?.writeText(text);
  }
  const fig = e.target.closest('.photo');
  if (fig) fig.classList.toggle('flipped');
});

initTilt($('#gazette'));

// ?demo=1 opens a saved edition straight away (offline preview)
const demo = new URLSearchParams(location.search).get('demo');
if (demo) fetch(`data/fallback-${demo}.json`).then(r => r.json()).then(showEdition).catch(() => {});
