// Usage: node save-edition.mjs <n> "<premise>"  -> public/data/fallback-<n>.json (server must be running)
import { writeFileSync } from 'node:fs';
const [n, premise] = process.argv.slice(2);
const post = (u, b) => fetch('http://localhost:3000' + u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const ed = await post('/api/generate', { premise });
const photos = [ed.hero_photo, ...ed.stories.map(s => s.photo), ed.cartoon];
await Promise.all(photos.map(async p => { p.svg = (await post('/api/svg', { scene: p.scene })).svg || ''; }));
ed.premise = premise;
writeFileSync(`public/data/fallback-${n}.json`, JSON.stringify(ed));
console.log(ed.masthead, '|', photos.filter(p => p.svg).length, 'photos');
