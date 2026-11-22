import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-fable-5-2';
const FALLBACK_MODEL = 'claude-sonnet-5-5';
const SVG_MODEL = 'claude-haiku-5-5'; // fast model for the many small drawings
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) console.warn('ANTHROPIC_API_KEY is not set in .env: only the saved editions will work.');
const client = new Anthropic();
const app = express();
app.disable('x-powered-by');

// Security headers: only our own scripts plus the pinned GSAP CDN may run
app.use((req, res, next) => {
  res.set({
    'Content-Security-Policy': "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
  });
  next();
});
app.use(express.json({ limit: '50kb' }));
app.use(express.static('public', { dotfiles: 'ignore' }));

// Each visitor (by IP) gets a small budget, so nobody on the network can burn the API credits
// windowMs = 0 means the count never resets (until the server restarts).
// The host machine itself (localhost) is exempt, so the presenter is never locked out.
const isHost = ip => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
function rateLimit(max, windowMs, message) {
  const hits = new Map();
  if (windowMs) setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    if (isHost(req.ip)) return next();
    const n = (hits.get(req.ip) || 0) + 1;
    hits.set(req.ip, n);
    if (n > max) return res.status(429).json({ error: message });
    next();
  };
}
const EDITIONS_PER_VISITOR = 5;
const clean = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');

const SYSTEM = `You are the editor of a newspaper from a parallel universe. Given a "what if" premise, write that universe's front page.
Return ONLY valid JSON (no markdown fences, no preamble) matching exactly:
{"universe_name":"","masthead":"","date":"","banner_headline":"max 12 words",
"hero_photo":{"scene":"one-sentence visual description","caption":"","secret":"behind-the-scenes joke"},
"stories":[{"headline":"","byline":"","text":"40-70 words","photo":{"scene":"","caption":"","secret":""}}],
"weather":{"icon":"emoji","temp":"","forecast":""},
"sports":{"headline":"","score_a":0,"score_b":0,"team_a":"","team_b":""},
"stock_ticker":[{"name":"","price":"","change":""}],
"classifieds":[""],"letter_to_editor":"",
"cartoon":{"scene":"","caption":""},
"popups":[{"type":"breaking|ad|poll|cameo","title":"","text":"","button_label":""}],
"chaos_score":0,"believability_score":0}
Counts: exactly 3 stories, 4 stock items, 3 classifieds, 4 popups (one of each type). Scores 0-100.
Rules: funny, witty, specific, a little absurd. Invent small mundane details (a local bakery strike, a product that only exists here). One story must be quietly touching or sad. Keep jokes consistent across the page. Indian/Bhopal flavor welcome when relevant. Keep it tight: no field longer than needed.`;

const SVG_SYSTEM = `You draw newspaper photo illustrations as SVG. Output ONLY the raw <svg> element, nothing else.
Flat cartoon style, bold shapes, viewBox="0 0 400 300", under 1500 characters, no external resources, no scripts, no <text> longer than 3 words.`;

function buildPrompt({ premise, style, previous_edition }) {
  let p = `Premise: ${premise}`;
  if (style) p += `\nWriting style: ${style}`;
  if (previous_edition) p += `\nThis is the edition 10 years after the previous one below. Stay consistent with the world already invented, and show how it evolved.\nPrevious edition: ${JSON.stringify(previous_edition).slice(0, 6000)}`;
  return p;
}

function parseJson(text) {
  const t = text.replace(/```(?:json)?/g, '').trim();
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
}

async function callClaude(model, prompt, system = SYSTEM, max_tokens = 8000) {
  const msg = await client.messages.create({
    model, max_tokens, system, output_config: { effort: 'low' },
    messages: [{ role: 'user', content: prompt }],
  }, { timeout: system === SYSTEM ? 40000 : 20000, maxRetries: 0 });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

app.post('/api/generate', rateLimit(EDITIONS_PER_VISITOR, 0, 'You have printed all 5 of your editions.'), async (req, res) => {
  const premise = clean(req.body?.premise, 300);
  if (!premise) return res.status(400).json({ error: 'premise required' });
  const prev = req.body.previous_edition;
  const prompt = buildPrompt({ premise, style: clean(req.body.style, 60), previous_edition: prev && typeof prev === 'object' ? prev : undefined });
  const t0 = Date.now();
  let lastErr;
  // one try on the main model, then the faster fallback (the browser gives up at 50s)
  for (const model of [MODEL, FALLBACK_MODEL]) {
    try {
      const data = parseJson(await callClaude(model, prompt));
      console.log(`generated with ${model} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return res.json(data);
    } catch (e) {
      lastErr = e;
      console.error(`${model} failed:`, e.message);
    }
  }
  // details stay in the server log; the browser only gets a generic message
  res.status(502).json({ error: 'The presses jammed. Please try again.' });
});

app.post('/api/svg', rateLimit(50, 60000, 'The presses are overheating. Wait a minute.'), async (req, res) => {
  const scene = clean(req.body?.scene, 500);
  if (!scene) return res.status(400).json({ error: 'scene required' });
  for (const model of [SVG_MODEL, FALLBACK_MODEL]) {
    try {
      const t = await callClaude(model, `Scene: ${scene}`, SVG_SYSTEM, 4000);
      const svg = t.slice(t.indexOf('<svg'), t.lastIndexOf('</svg>') + 6);
      if (svg.startsWith('<svg')) return res.json({ svg });
    } catch (e) { console.error(`svg ${model} failed:`, e.message); }
  }
  res.status(502).json({ error: 'no svg' });
});

// Malformed or oversized request bodies: answer plainly, never with a stack trace
app.use((err, req, res, next) => res.status(err.status === 413 ? 413 : 400).json({ error: 'Bad request' }));

app.listen(PORT, '0.0.0.0', () => console.log(`Gazette on http://localhost:${PORT}`));
