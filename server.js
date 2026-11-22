import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-fable-5-2';
const FALLBACK_MODEL = 'claude-sonnet-5-5';
const SVG_MODEL = 'claude-haiku-5-5'; // fast model for the many small drawings
const PORT = process.env.PORT || 3000;

const client = new Anthropic();
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

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
  }, { timeout: 40000, maxRetries: 0 });
  return msg.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

app.post('/api/generate', async (req, res) => {
  if (!req.body?.premise) return res.status(400).json({ error: 'premise required' });
  const prompt = buildPrompt(req.body);
  const t0 = Date.now();
  let lastErr;
  for (const model of [MODEL, FALLBACK_MODEL, FALLBACK_MODEL]) {
    try {
      const data = parseJson(await callClaude(model, prompt));
      console.log(`generated with ${model} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return res.json(data);
    } catch (e) {
      lastErr = e;
      console.error(`${model} failed:`, e.message);
    }
  }
  res.status(502).json({ error: 'The presses jammed: ' + lastErr?.message });
});

app.post('/api/svg', async (req, res) => {
  const scene = String(req.body?.scene || '').slice(0, 500);
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

app.listen(PORT, '0.0.0.0', () => console.log(`Gazette on http://localhost:${PORT}`));
