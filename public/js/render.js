// JSON edition -> newspaper DOM
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const photoEls = new WeakMap(); // photo object -> its <figure>
let photoSeq = 0;
const pending = {};

// Parse untrusted SVG and strip anything executable. Returns an <svg> element or null.
export function sanitizeSvg(svg) {
  const doc = new DOMParser().parseFromString(String(svg || ''), 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName !== 'svg' || doc.querySelector('parsererror')) return null;
  root.querySelectorAll('script, foreignObject, iframe, image, use[href^="http"], a').forEach(n => n.remove());
  root.querySelectorAll('*').forEach(n => {
    for (const a of [...n.attributes]) {
      const v = a.value.trim().toLowerCase();
      if (a.name.startsWith('on') || ((a.name === 'href' || a.name === 'xlink:href') && !v.startsWith('#')) || v.includes('javascript:')) n.removeAttribute(a.name);
    }
  });
  if (!root.getAttribute('viewBox')) root.setAttribute('viewBox', '0 0 400 300');
  root.removeAttribute('width'); root.removeAttribute('height');
  return document.importNode(root, true);
}

function photo(p, cls = '') {
  if (!p) return '';
  const id = 'ph' + (++photoSeq);
  pending[id] = p;
  return `<figure class="photo ${cls}" id="${id}" style="--rot:${(Math.random() * 5 - 2.5).toFixed(1)}deg">
    <div class="photo-inner">
      <div class="photo-front"><div class="svg-wrap shimmer"></div><figcaption>${esc(p.caption)}</figcaption></div>
      <div class="photo-back"><b>BEHIND THE SCENES</b><p>${esc(p.secret || 'The photographer was paid in samosas.')}</p></div>
    </div></figure>`;
}

// Insert the drawing once photo.svg has arrived (or immediately if already there).
export function fillPhoto(p) {
  const fig = photoEls.get(p);
  if (!fig) return;
  const wrap = fig.querySelector('.svg-wrap');
  const svg = p.svg && sanitizeSvg(p.svg);
  wrap.classList.remove('shimmer');
  if (svg) wrap.replaceChildren(svg);
  else wrap.innerHTML = '<div class="no-photo">PHOTO LOST<br>IN TRANSIT</div>';
  wrap.classList.add('arrived');
  return fig;
}

const meter = (label, n) => `<div class="meter"><span>${label}</span><div class="meter-bar"><i style="--w:${Math.max(0, Math.min(100, +n || 0))}%"></i></div><b class="count" data-to="${+n || 0}">${+n || 0}</b></div>`;

export function renderGazette(ed, root) {
  const s = ed.sports || {}, w = ed.weather || {};
  const ticker = (ed.stock_ticker || []).map(t => {
    const down = /^\s*[-−▼]/.test(t.change);
    return `<span class="tick">${esc(t.name)} <b>${esc(t.price)}</b> <em class="${down ? 'down' : 'up'}">${down ? '▼' : '▲'} ${esc(String(t.change).replace(/^[\s+\-−▲▼]+/, ''))}</em></span>`;
  }).join('');

  root.innerHTML = `
  <header class="panel masthead">
    <div class="ears"><span>${esc(ed.universe_name)}</span><span>LATE CITY EDITION</span><span>PRICE: ONE SAMOSA</span></div>
    <h1 class="title">${esc(ed.masthead)}</h1>
    <div class="dateline"><span>${esc(ed.date)}</span><span>"All the news that never happened"</span></div>
  </header>

  <section class="panel banner">
    <div class="stamp breaking">BREAKING</div>
    <h2 class="headline">${esc(ed.banner_headline)}</h2>
  </section>

  <section class="panel hero">
    ${photo(ed.hero_photo, 'hero-photo')}
    <div class="stamp shopped">PHOTOSHOPPED?<br>WE DON'T KNOW</div>
  </section>

  <section class="panel stories">
    ${(ed.stories || []).map(st => `<article class="story">
      <h3 class="headline">${esc(st.headline)}</h3>
      <div class="byline">${esc(st.byline)}</div>
      ${photo(st.photo)}
      <p class="story-text">${esc(st.text)}</p>
    </article>`).join('')}
  </section>

  <section class="panel duo">
    <div class="box weather">
      <h4>WEATHER</h4>
      <div class="weather-icon">${esc(w.icon)}</div>
      <div class="temp">${esc(w.temp)}</div>
      <p>${esc(w.forecast)}</p>
    </div>
    <div class="box sports">
      <h4>SPORTS CORNER</h4>
      <h3 class="headline">${esc(s.headline)}</h3>
      <div class="scoreboard">
        <div><span>${esc(s.team_a)}</span><b class="count" data-to="${+s.score_a || 0}">${+s.score_a || 0}</b></div>
        <i>VS</i>
        <div><span>${esc(s.team_b)}</span><b class="count" data-to="${+s.score_b || 0}">${+s.score_b || 0}</b></div>
      </div>
    </div>
  </section>

  <section class="panel ticker"><div class="ticker-track">${ticker}${ticker}</div></section>

  <section class="panel classifieds">
    <h4>CLASSIFIEDS</h4>
    <div class="ads">${(ed.classifieds || []).map((c, i) => `<div class="ad" style="--rot:${[-1.5, 1, -0.8][i % 3]}deg">${esc(c)}</div>`).join('')}</div>
  </section>

  <section class="panel letter">
    <h4>LETTER TO THE EDITOR</h4>
    <p>${esc(ed.letter_to_editor)}</p>
  </section>

  <section class="panel cartoon">
    <h4>EDITORIAL CARTOON</h4>
    ${photo(ed.cartoon, 'cartoon-photo')}
  </section>

  <footer class="panel foot">
    <div class="meters">${meter('CHAOS', ed.chaos_score)}${meter('BELIEVABILITY', ed.believability_score)}</div>
    <div class="actions">
      <button id="btn-ff" class="ink-btn red">⏩ Fast-forward 10 years</button>
      <button id="btn-new" class="ink-btn">🌀 New universe <small>(shake or press N)</small></button>
      <button id="btn-share" class="ink-btn">Share</button>
      <button id="btn-print" class="ink-btn">Print</button>
    </div>
    <p class="fine">Printed in a universe near you. Any resemblance to reality is a clerical error.</p>
  </footer>`;

  for (const id in pending) {
    const fig = root.querySelector('#' + id);
    if (fig) { photoEls.set(pending[id], fig); if (pending[id].svg !== undefined) fillPhoto(pending[id]); }
    delete pending[id];
  }
}
