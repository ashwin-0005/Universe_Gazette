const $ = s => document.querySelector(s);

export async function generate(premise, extra = {}) {
  const r = await fetch('/api/generate', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ premise, ...extra }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Unknown error');
  return data;
}

// Fills photo.svg for every photo in the edition; onEach(photo) fires as each arrives.
export function loadPhotos(ed, onEach = () => {}) {
  const photos = [ed.hero_photo, ...ed.stories.map(s => s.photo), ed.cartoon].filter(Boolean);
  return Promise.all(photos.map(async p => {
    try {
      const r = await fetch('/api/svg', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene: p.scene || p.caption }),
      });
      p.svg = r.ok ? (await r.json()).svg : '';
    } catch { p.svg = ''; }
    onEach(p);
  }));
}

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const premise = $('#premise').value.trim() || $('#premise').placeholder;
  $('#out').textContent = 'Printing the ink...';
  try {
    const ed = await generate(premise);
    const show = () => $('#out').textContent = JSON.stringify(ed, null, 2);
    show();
    loadPhotos(ed, show);
  } catch (err) {
    $('#out').textContent = 'Error: ' + err.message;
  }
});
