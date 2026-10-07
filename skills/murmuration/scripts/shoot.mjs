// Screenshots of a page at given scroll stops, in headless Chrome over the DevTools protocol.
// Usage: node shoot.mjs <url> <outDir> <width> <height> <light|dark> <stop,stop,...>
// A stop is a pixel offset ("1200") or a selector with an optional offset ("#route+200").
// Finds Chrome, Chromium, Edge or Brave on macOS, Linux and Windows; set CHROME_PATH to use another.
// EXTRA adds Chrome flags (for example "--disable-3d-apis", or "--no-sandbox" in a container).
// DEBUG=1, with ?debug-scene in the URL, prints the scene's pair, target, frames and sections at each stop.
// WAIT=5000 waits longer at each stop (ms; default 2200), for scenes that settle slowly in software rendering.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

const [url, outDir, w = '1440', h = '900', scheme = 'light', stops = '0'] = process.argv.slice(2);
if (!url || !outDir) {
  console.error('usage: node shoot.mjs <url> <outDir> [width] [height] [light|dark] [stop,stop,...]');
  process.exit(2);
}

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const env = process.env;
  const known = {
    darwin: ['Google Chrome', 'Chromium', 'Microsoft Edge', 'Brave Browser'].map((app) => `/Applications/${app}.app/Contents/MacOS/${app}`),
    win32: [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA].filter(Boolean).flatMap((dir) => [
      join(dir, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(dir, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ]),
  }[process.platform] || [];
  const names = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser'];
  const onPath = (env.PATH || '').split(delimiter).filter(Boolean).flatMap((dir) => names.map((n) => join(dir, n)));
  return [...known, ...onPath].find((p) => existsSync(p));
}

const chromePath = findChrome();
if (!chromePath) {
  console.error('No Chrome, Chromium, Edge or Brave found. Install one, or set CHROME_PATH to its executable.');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
const port = 9400 + Math.floor(Math.random() * 400);
const profile = join(tmpdir(), `murmuration-shoot-${port}`);
const chrome = spawn(chromePath, [
  '--headless=new', `--remote-debugging-port=${port}`, `--window-size=${w},${h}`,
  `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
  '--hide-scrollbars', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...(process.env.EXTRA ? process.env.EXTRA.split(' ') : []), 'about:blank',
], { stdio: 'ignore' });
chrome.on('exit', () => rmSync(profile, { recursive: true, force: true }));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let targets = [];
for (let i = 0; i < 75 && !targets.length; i++) {
  try { targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === 'page'); } catch { /* not up yet */ }
  if (!targets.length) await sleep(200);
}
if (!targets.length) {
  console.error(`Chrome did not open a page within 15 s (${chromePath}). In a container, try EXTRA="--no-sandbox".`);
  chrome.kill();
  process.exit(1);
}
const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const problems = [];
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) problems.push(m.params.type + ': ' + m.params.args.map((a) => a.value ?? a.description).join(' '));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
// Close Chrome, let it remove its temporary profile, then exit.
const finish = (code = 0) => { ws.close(); chrome.once('exit', () => process.exit(code)); chrome.kill(); setTimeout(() => process.exit(code), 3000).unref(); };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 700 });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: scheme }] });
await send('Page.navigate', { url });
if (process.env.FRAMES) {
  // Timed frames from navigation, at the top of the page.
  const t0 = Date.now();
  for (const ms of process.env.FRAMES.split(',').map(Number)) {
    await sleep(Math.max(0, ms - (Date.now() - t0)));
    const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 });
    writeFileSync(`${outDir}/frame-${scheme}-${w}-${ms}.jpg`, Buffer.from(shot.result.data, 'base64'));
  }
  console.log('frames saved');
  finish(0);
  await new Promise(() => {}); // finish() exits the process
}
await sleep(4000);
console.log('scene running:', await evaluate("document.documentElement.classList.contains('has-scene')"));

for (const stop of stops.split(',')) {
  let y = Number(stop);
  if (Number.isNaN(y)) {
    const [selector, offset = '0'] = stop.split('+');
    y = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? Math.round(el.getBoundingClientRect().top + scrollY) : 0; })()`) + Number(offset);
  }
  await evaluate(`document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, ${y}); 1`);
  await sleep(Number(process.env.WAIT) || 2200);
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 78 });
  const name = `${outDir}/${scheme}-${w}-${stop.replace(/[^a-z0-9+-]/gi, '')}.jpg`;
  writeFileSync(name, Buffer.from(shot.result.data, 'base64'));
  console.log('saved', name, 'at', y);
  if (process.env.DEBUG) console.log('  scene:', await evaluate('JSON.stringify(window.__scene || null)'));
}
console.log(problems.length ? 'problems:\n' + [...new Set(problems)].join('\n') : 'no console errors');
finish(0);
