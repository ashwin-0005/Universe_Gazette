// Dev check: node tools/shot.mjs <url> <out.png> [width] [height] [scrollY] [waitMs] [jsToRun]
// Drives headless Edge/Chrome over the DevTools protocol in real time, prints page errors, saves a screenshot.
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const [url, out, w = 1000, h = 900, scroll = 0, wait = 5000, js = ''] = process.argv.slice(2);
const exe = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const port = 9333 + Math.floor(Math.random() * 500);
const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'gz-'))}`, `--window-size=${w},${h}`, 'about:blank']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const waiting = new Map();
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id) waiting.get(d.id)?.(d.result);
  if (d.method === 'Runtime.exceptionThrown') console.log('PAGE ERROR:', d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') console.log('CONSOLE ERROR:', d.params.args.map(a => a.value || a.description).join(' '));
};
const send = (method, params = {}) => new Promise(r => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Runtime.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
await send('Page.navigate', { url });
await sleep(+wait);
if (+scroll) { await send('Runtime.evaluate', { expression: `window.scrollTo(0, ${+scroll})` }); await sleep(2500); }
if (js) { const r = await send('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true }); console.log('JS:', JSON.stringify(r.result?.value ?? r.exceptionDetails?.text)); await sleep(1500); }
const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 60 });
writeFileSync(out, Buffer.from(data, 'base64'));
ws.close(); proc.kill(); console.log('saved', out);
process.exit(0);
