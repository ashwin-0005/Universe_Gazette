// Pop-up system: one at a time, spaced out, always dismissible, never modal
import { play } from './sound.js';

const FIRST_DELAY = 8000, GAP = 12000, AUTO_CLOSE = 10000;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const layer = () => document.querySelector('#popup-layer');
let queue = [], timer, autoTimer, current;

const NEWSBOY = `<svg viewBox="0 0 120 150" aria-hidden="true"><ellipse cx="60" cy="140" rx="34" ry="6" fill="#0003"/><rect x="38" y="82" width="44" height="50" rx="8" fill="#3b5ba9"/><rect x="44" y="126" width="12" height="16" fill="#2a2a2a"/><rect x="64" y="126" width="12" height="16" fill="#2a2a2a"/><circle cx="60" cy="58" r="26" fill="#f2c79b"/><path d="M32 50q28-34 56 0l10 6H30z" fill="#7a4a2a"/><circle cx="51" cy="60" r="3"/><circle cx="69" cy="60" r="3"/><path d="M48 70q12 12 24 0" fill="#fff" stroke="#000" stroke-width="2"/><g transform="rotate(-18 96 86)"><rect x="80" y="70" width="34" height="42" fill="#efe6d0" stroke="#1b1712" stroke-width="2"/><path d="M85 78h24M85 86h24M85 93h16M85 100h24" stroke="#1b1712" stroke-width="2"/></g></svg>`;

const TEMPLATES = {
  breaking: p => `<div class="pop pop-breaking"><span class="pop-tag">BREAKING</span><div><b>${esc(p.title)}</b> ${esc(p.text)}</div><button class="pop-x" aria-label="Close">×</button></div>`,
  ad: p => `<div class="pop pop-ad"><button class="pop-x dodgy" aria-label="Close">×</button><span class="pop-tag">ADVERTISEMENT</span><b>${esc(p.title)}</b><p>${esc(p.text)}</p><button class="pop-ok">${esc(p.button_label || 'Buy now')}</button></div>`,
  poll: p => `<div class="pop pop-poll"><button class="pop-x" aria-label="Close">×</button><span class="pop-tag">READER POLL</span><b>${esc(p.title || 'Do you trust this newspaper?')}</b><p>${esc(p.text)}</p><div class="poll-btns"><button class="pop-ok">${esc(p.button_label || 'Yes')}</button><button class="pop-no">No</button></div></div>`,
  cameo: p => `<div class="pop pop-cameo">${NEWSBOY}<div class="bubble"><b>${esc(p.title)}</b><p>${esc(p.text)}</p><button class="pop-ok">${esc(p.button_label || 'Shoo!')}</button></div><button class="pop-x" aria-label="Close">×</button></div>`,
};

function close() {
  if (!current) return;
  clearTimeout(autoTimer);
  const el = current;
  current = null;
  el.classList.add('leaving');
  setTimeout(() => el.remove(), 350);
  if (queue.length) timer = setTimeout(show, GAP);
}

// Moves a button somewhere else inside the viewport, away from the pointer
function runAway(btn) {
  const r = btn.getBoundingClientRect(), cur = btn._off || { x: 0, y: 0 };
  let x, y, tries = 0;
  do {
    x = cur.x + (Math.random() * 260 - 130); y = cur.y + (Math.random() * 180 - 90);
    tries++;
  } while (tries < 12 && (r.left - cur.x + x < 8 || r.right - cur.x + x > innerWidth - 8 || r.top - cur.y + y < 8 || r.bottom - cur.y + y > innerHeight - 8));
  btn._off = { x, y };
  btn.style.transform = `translate(${x}px, ${y}px) rotate(${Math.random() * 30 - 15}deg)`;
  play('boing');
}

function show() {
  const p = queue.shift();
  if (!p || current || document.querySelector('#stage').hidden) return;
  layer().insertAdjacentHTML('beforeend', (TEMPLATES[p.type] || TEMPLATES.ad)(p));
  const el = current = layer().lastElementChild;
  play(p.type === 'breaking' ? 'siren' : 'pop');

  el.querySelectorAll('.pop-x:not(.dodgy), .pop-ok').forEach(b => b.addEventListener('click', close));

  // Fake ad: the tiny close button dodges three times, then gives up
  const dodgy = el.querySelector('.dodgy');
  if (dodgy) {
    let dodges = 3;
    const dodge = e => { if (dodges-- > 0) { e.preventDefault(); runAway(dodgy); } };
    dodgy.addEventListener('pointerenter', dodge);
    dodgy.addEventListener('pointerdown', dodge);
    dodgy.addEventListener('click', () => { if (dodges < 0) close(); });
  }

  // Poll: "No" always runs away
  const no = el.querySelector('.pop-no');
  if (no) {
    const flee = e => { e.preventDefault(); runAway(no); };
    no.addEventListener('pointerenter', flee);
    no.addEventListener('pointerdown', flee);
    no.addEventListener('click', e => { e.preventDefault(); runAway(no); });
  }

  autoTimer = setTimeout(close, AUTO_CLOSE);
}

export function startPopups(ed) {
  stopPopups();
  queue = [...(ed.popups || [])];
  timer = setTimeout(show, FIRST_DELAY);
}

export function stopPopups() {
  clearTimeout(timer); clearTimeout(autoTimer);
  queue = []; current = null;
  layer().innerHTML = '';
}

addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
