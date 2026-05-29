#!/usr/bin/env node
/* Flapster AAA asset generator — produces original CC0 SVG art (parallax layers,
   atmosphere overlays, pipe & bird sprites). Reproducible; no network needed.
   Run: node tools/gen_assets.mjs   (writes into ../assets) */
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const A = join(ROOT, 'assets');
const W = 400, H = 740;
const out = (p, s) => { mkdirSync(dirname(join(A, p)), { recursive: true }); writeFileSync(join(A, p), s.trim() + '\n'); console.log('  +', p); };
const R = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(987654321); // deterministic
const rr = (a, b) => a + (b - a) * R();
const svg = (inner, w = W, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n${inner}\n</svg>`;

/* Seamless silhouette: y(x) periodic so left edge == right edge. Returns a closed
   path filled down to the bottom of the canvas. harmonics = [[periods,amp],...] */
function ridge(base, harmonics, phase = 0, step = 8) {
  let d = `M0 ${H} L0 ${base.toFixed(1)}`;
  for (let x = 0; x <= W; x += step) {
    let y = base;
    for (const [n, amp, ph] of harmonics) y += Math.sin((x / W) * Math.PI * 2 * n + (ph ?? phase)) * amp;
    d += ` L${x} ${y.toFixed(1)}`;
  }
  return d + ` L${W} ${H} Z`;
}
const lg = (id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const blur = (id, dev) => `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${dev}"/></filter>`;

/* ───────── STARFIELD (space) ───────── */
function stars(n, maxY, sizeMax = 1.6) {
  let s = '';
  for (let i = 0; i < n; i++) { const x = rr(0, W), y = rr(0, maxY), r = rr(.3, sizeMax), o = rr(.3, 1); const h = R() > .8 ? 'hsl(35,90%,80%)' : R() > .6 ? 'hsl(210,80%,85%)' : '#fff'; s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="${h}" opacity="${o.toFixed(2)}"/>`; }
  return s;
}

/* ═══════════ THEME DEFINITIONS ═══════════ */
const THEMES = {
  hills: {
    sky: svg(`<defs>${lg('s', [['0', '#aee3ff'], ['.45', '#bfe9ff'], ['.75', '#e8f6ff'], ['1', '#fff3df']])}</defs><rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="310" cy="120" r="44" fill="#fffbe9" opacity=".9"/><circle cx="310" cy="120" r="70" fill="#fff6d0" opacity=".25"/>`),
    far: svg(`<defs>${lg('f', [['0', '#9fb6e0'], ['1', '#b9c9e8']])}</defs><path d="${ridge(330, [[2, 36], [5, 12, 1.3]])}" fill="url(#f)" opacity=".55"/>`),
    mid: svg(`<defs>${lg('m', [['0', '#5ea36a'], ['1', '#3c7a4c']])}</defs><path d="${ridge(430, [[3, 44], [7, 16, .7]])}" fill="url(#m)" opacity=".9"/>`),
    near: svg(`<defs>${lg('n', [['0', '#3e7a3f'], ['1', '#234a26']])}</defs><path d="${ridge(560, [[2, 40], [4, 22, 2.1], [9, 9, .4]])}" fill="url(#n)"/>`)
  },
  space: {
    sky: svg(`<defs>${lg('s', [['0', '#05030f'], ['.5', '#0d0a26'], ['1', '#1a0f33']])}<radialGradient id="neb" cx=".7" cy=".35" r=".6"><stop offset="0" stop-color="#5b2a8c" stop-opacity=".55"/><stop offset="1" stop-color="#5b2a8c" stop-opacity="0"/></radialGradient><radialGradient id="neb2" cx=".25" cy=".7" r=".5"><stop offset="0" stop-color="#1f6f9c" stop-opacity=".4"/><stop offset="1" stop-color="#1f6f9c" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/><rect width="${W}" height="${H}" fill="url(#neb)"/><rect width="${W}" height="${H}" fill="url(#neb2)"/>${stars(150, H, 1.8)}`),
    far: svg(`<defs><radialGradient id="p1" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#caa0ff"/><stop offset=".7" stop-color="#7a4fb0"/><stop offset="1" stop-color="#3a2360"/></radialGradient></defs><circle cx="300" cy="170" r="40" fill="url(#p1)" opacity=".85"/><ellipse cx="300" cy="170" rx="62" ry="13" fill="none" stroke="#d9c2ff" stroke-width="2.5" opacity=".5"/>${stars(40, H, 1.2)}`),
    mid: svg(`<defs>${lg('m', [['0', '#241640'], ['1', '#0e0820']])}</defs><path d="${ridge(470, [[3, 30], [6, 12, 1.1]])}" fill="url(#m)"/>`),
    near: svg(`<defs>${lg('n', [['0', '#160d2b'], ['1', '#05030f']])}</defs><path d="${ridge(580, [[2, 50], [5, 20, 2.4], [11, 8]])}" fill="url(#n)"/><g fill="#2a1b4d">${Array.from({ length: 5 }, () => { const x = rr(20, W - 40), w = rr(14, 26), h = rr(60, 150); return `<polygon points="${x},${H} ${x + w / 2},${H - h} ${x + w},${H}"/>`; }).join('')}</g>`)
  },
  ocean: {
    sky: svg(`<defs>${lg('s', [['0', '#0a3a66'], ['.5', '#0d4f82'], ['1', '#0a6b8f']])}<linearGradient id="ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfeaff" stop-opacity=".5"/><stop offset="1" stop-color="#bfeaff" stop-opacity="0"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#s)"/><g fill="url(#ray)">${Array.from({ length: 6 }, (_, i) => { const x = 40 + i * 62; return `<polygon points="${x},0 ${x + 30},0 ${x + 80},${H} ${x + 10},${H}" opacity="${(.18 + R() * .2).toFixed(2)}"/>`; }).join('')}</g>`),
    far: svg(`<defs>${lg('f', [['0', '#0c5a7a'], ['1', '#0a4360']])}</defs><path d="${ridge(420, [[2, 34], [5, 12, .9]])}" fill="url(#f)" opacity=".6"/>`),
    mid: svg(`<defs>${lg('m', [['0', '#0a6e6a'], ['1', '#075048']])}</defs><path d="${ridge(500, [[3, 40], [7, 14, 1.6]])}" fill="url(#m)" opacity=".85"/><g fill="#0e8a7e" opacity=".7">${Array.from({ length: 4 }, () => { const x = rr(30, W - 30); return `<path d="M${x} ${H} q-14 -70 4 -120 q18 50 -4 120 Z"/>`; }).join('')}</g>`),
    near: svg(`<defs>${lg('n', [['0', '#06463f'], ['1', '#022824']])}</defs><path d="${ridge(580, [[2, 44], [4, 20, 2.0], [9, 8]])}" fill="url(#n)"/><g fill="#0c5a4e">${Array.from({ length: 7 }, () => { const x = rr(0, W); return `<path d="M${x} ${H} q-8 -90 6 -150 q14 60 -6 150 Z"/>`; }).join('')}</g>`)
  },
  ruins: {
    sky: svg(`<defs>${lg('s', [['0', '#3a4a52'], ['.45', '#7a6a55'], ['.8', '#c79a64'], ['1', '#e7c98c']])}</defs><rect width="${W}" height="${H}" fill="url(#s)"/><circle cx="120" cy="150" r="46" fill="#ffe6b0" opacity=".7"/><circle cx="120" cy="150" r="80" fill="#ffd98c" opacity=".2"/>`),
    far: svg(`<defs>${lg('f', [['0', '#8a7c6a'], ['1', '#6d5f50']])}</defs><path d="${ridge(360, [[2, 40], [5, 14, 1.1]])}" fill="url(#f)" opacity=".5"/>`),
    mid: svg(`<defs>${lg('m', [['0', '#7a6450'], ['1', '#534033']])}</defs><g fill="url(#m)">${Array.from({ length: 6 }, () => { const x = rr(20, W - 50), w = rr(26, 50), h = rr(120, 240), br = R() > .5 ? rr(8, 26) : 0; return `<polygon points="${x},${H} ${x},${(H - h).toFixed(0)} ${(x + w * .3).toFixed(0)},${(H - h + br).toFixed(0)} ${(x + w * .55).toFixed(0)},${(H - h).toFixed(0)} ${x + w},${(H - h + br * .5).toFixed(0)} ${x + w},${H}"/>`; }).join('')}</g>`),
    near: svg(`<defs>${lg('n', [['0', '#5a4636'], ['1', '#2e2117']])}</defs><path d="${ridge(600, [[3, 30], [6, 14, 1.7]])}" fill="url(#n)"/><g fill="#3e2e20">${Array.from({ length: 5 }, () => { const x = rr(0, W - 30), w = rr(22, 40), h = rr(80, 200); return `<rect x="${x.toFixed(0)}" y="${(H - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" rx="3"/>`; }).join('')}</g>`)
  }
};
for (const [name, layers] of Object.entries(THEMES))
  for (const [layer, content] of Object.entries(layers)) out(`bg/${name}/${layer}.svg`, content);

/* ═══════════ ATMOSPHERE OVERLAYS ═══════════ */
out('overlay/clouds.svg', svg(`<defs>${blur('b', 9)}</defs><g fill="#ffffff" filter="url(#b)">${Array.from({ length: 7 }, () => { const x = rr(0, W), y = rr(20, 260), s = rr(.7, 1.5), o = rr(.25, .6); return `<g opacity="${o.toFixed(2)}" transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${s.toFixed(2)})"><ellipse cx="0" cy="0" rx="46" ry="20"/><ellipse cx="34" cy="6" rx="34" ry="16"/><ellipse cx="-32" cy="8" rx="30" ry="14"/></g>`; }).join('')}</g>`, W, 300));
out('overlay/fog.svg', svg(`<defs>${lg('fg', [['0', '#ffffff'], ['1', '#ffffff']])}${blur('fb', 16)}</defs><g filter="url(#fb)" fill="#dfe8f0">${Array.from({ length: 5 }, () => { const y = rr(0, 120); return `<ellipse cx="${rr(0, W).toFixed(0)}" cy="${y.toFixed(0)}" rx="160" ry="40" opacity="${rr(.1, .3).toFixed(2)}"/>`; }).join('')}</g>`, W, 160));
out('overlay/lightshaft.svg', svg(`<defs><linearGradient id="ls" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff7d6" stop-opacity=".55"/><stop offset="1" stop-color="#fff7d6" stop-opacity="0"/></linearGradient></defs><g fill="url(#ls)">${Array.from({ length: 4 }, (_, i) => { const x = 60 + i * 90; return `<polygon points="${x},0 ${x + 40},0 ${x + 120},${H} ${x - 10},${H}" opacity="${(.4 + R() * .3).toFixed(2)}"/>`; }).join('')}</g>`));
out('overlay/vignette.svg', svg(`<defs><radialGradient id="v" cx=".5" cy=".5" r=".72"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#v)"/>`));
out('overlay/lensdirt.svg', svg(`<defs>${blur('lb', 2)}</defs><g filter="url(#lb)" fill="#ffffff">${Array.from({ length: 30 }, () => `<circle cx="${rr(0, W).toFixed(0)}" cy="${rr(0, H).toFixed(0)}" r="${rr(.5, 3).toFixed(1)}" opacity="${rr(.02, .09).toFixed(3)}"/>`).join('')}</g>`));

/* ═══════════ SPRITES ═══════════ */
const PIPE = (top, bot, edge) => svg(`<defs>${lg('pb', [['0', edge], ['.18', top], ['.5', bot], ['.82', top], ['1', edge]], 0, 0, 1, 0)}</defs><rect x="0" y="40" width="64" height="600" fill="url(#pb)"/><rect x="-3" y="0" width="70" height="40" rx="5" fill="url(#pb)"/><rect x="-3" y="0" width="70" height="6" fill="#ffffff" opacity=".18"/><rect x="6" y="48" width="5" height="580" fill="#ffffff" opacity=".14"/><rect x="50" y="48" width="6" height="580" fill="#000000" opacity=".16"/>`, 64, 640);
out('sprites/pipe_hills.svg', PIPE('#5fd06a', '#2f8c3a', '#1f6028'));
out('sprites/pipe_space.svg', PIPE('#8a6fe0', '#4a2f9c', '#2a1860'));
out('sprites/pipe_ocean.svg', PIPE('#2fb6c0', '#0a6e80', '#054450'));
out('sprites/pipe_ruins.svg', PIPE('#b89a6a', '#7a5d3a', '#4a3622'));

/* Bird sprite sheet: 4 frames (wing up→down). 64x64 per frame, 256x64 sheet */
function birdFrame(wingY) {
  return `<g>
    <ellipse cx="32" cy="34" rx="22" ry="19" fill="#ffd23f"/>
    <ellipse cx="30" cy="30" rx="18" ry="15" fill="#ffe27a"/>
    <path d="M14 ${34 + wingY} q-10 ${-8 - wingY} 2 ${-2 - wingY} q8 6 6 12 Z" fill="#f0a818"/>
    <circle cx="40" cy="27" r="6.5" fill="#fff"/><circle cx="42" cy="27" r="3.2" fill="#1a1a1a"/><circle cx="43.2" cy="25.8" r="1.1" fill="#fff"/>
    <path d="M52 30 l11 4 l-11 5 Z" fill="#ff8c1a"/>
    <ellipse cx="32" cy="50" rx="14" ry="4" fill="#e09010" opacity=".5"/>
  </g>`;
}
const frames = [-8, -2, 6, -2];
out('sprites/bird.svg', svg(frames.map((wy, i) => `<g transform="translate(${i * 64},0)">${birdFrame(wy)}</g>`).join(''), 256, 64));

console.log('Done. Assets in', A);
