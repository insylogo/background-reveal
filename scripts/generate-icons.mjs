/**
 * Generates Background Reveal extension icons (original artwork, MIT license).
 * Run: npm run icons
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/icons');

const COLORS = {
  bg: [30, 64, 175],
  windowFrame: [226, 232, 240],
  windowInner: [51, 65, 85],
  titleBar: [148, 163, 184],
  titleDot: [100, 116, 139],
  lensRing: [248, 250, 252],
  lensRingOuter: [30, 64, 175],
  handle: [241, 245, 249],
  handleShadow: [71, 85, 105],
  sky: [125, 211, 252],
  hill: [52, 211, 153],
  lensGlare: [255, 255, 255],
};

function lerpRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRoundRect(x, y, rx, ry, rw, rh, radius) {
  if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) return false;
  const r = Math.min(radius, rw / 2, rh / 2);
  if (x < rx + r && y < ry + r) {
    return (x - (rx + r)) ** 2 + (y - (ry + r)) ** 2 <= r * r;
  }
  if (x >= rx + rw - r && y < ry + r) {
    return (x - (rx + rw - r)) ** 2 + (y - (ry + r)) ** 2 <= r * r;
  }
  if (x < rx + r && y >= ry + rh - r) {
    return (x - (rx + r)) ** 2 + (y - (ry + rh - r)) ** 2 <= r * r;
  }
  if (x >= rx + rw - r && y >= ry + rh - r) {
    return (x - (rx + rw - r)) ** 2 + (y - (ry + rh - r)) ** 2 <= r * r;
  }
  return true;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function inRect(x, y, rx, ry, rw, rh) {
  return x >= rx && y >= ry && x < rx + rw && y < ry + rh;
}

const LENS = { cx: 64, cy: 68, r: 34 };
const HANDLE = { x1: 88, y1: 92, x2: 112, y2: 116, w: 10 };

function inLens(x, y) {
  return dist(x, y, LENS.cx, LENS.cy) <= LENS.r - 2;
}

function onLensRing(x, y) {
  const d = dist(x, y, LENS.cx, LENS.cy);
  return d >= LENS.r - 2 && d <= LENS.r + 3;
}

function inHandle(x, y) {
  const dx = HANDLE.x2 - HANDLE.x1;
  const dy = HANDLE.y2 - HANDLE.y1;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const px = x - HANDLE.x1;
  const py = y - HANDLE.y1;
  const along = px * ux + py * uy;
  const perp = Math.abs(px * -uy + py * ux);
  return along >= -2 && along <= len + 4 && perp <= HANDLE.w / 2;
}

function sampleIcon(x, y) {
  const c = COLORS;
  let color = c.bg;

  // Window outer frame
  const win = { x: 18, y: 22, w: 92, h: 84, r: 8 };
  if (inRoundRect(x, y, win.x, win.y, win.w, win.h, win.r)) {
    color = c.windowFrame;
  }

  // Title bar
  if (inRoundRect(x, y, win.x + 2, win.y + 2, win.w - 4, 18, 6)) {
    color = c.titleBar;
  }
  if (inRect(x, y, 28, 30, 5, 5)) color = c.titleDot;
  if (inRect(x, y, 36, 30, 5, 5)) color = c.titleDot;
  if (inRect(x, y, 44, 30, 5, 5)) color = c.titleDot;

  // Window content (hidden gray page)
  if (
    inRoundRect(x, y, win.x + 4, win.y + 22, win.w - 8, win.h - 26, 5) &&
    !inLens(x, y) &&
    !onLensRing(x, y) &&
    !inHandle(x, y)
  ) {
    color = c.windowInner;
  }

  // Image inside magnifier lens
  if (inLens(x, y)) {
    color = y < LENS.cy - 4 ? c.sky : c.hill;
    // subtle glare
    if (dist(x, y, LENS.cx - 10, LENS.cy - 12) < 8) {
      color = lerpRgb(color, c.lensGlare, 0.45);
    }
  }

  // Lens ring
  if (onLensRing(x, y)) {
    const d = dist(x, y, LENS.cx, LENS.cy);
    color = d > LENS.r + 1 ? c.lensRingOuter : c.lensRing;
  }

  // Handle
  if (inHandle(x, y) && !inLens(x, y)) {
    color = c.handle;
    const along =
      ((x - HANDLE.x1) * (HANDLE.x2 - HANDLE.x1) +
        (y - HANDLE.y1) * (HANDLE.y2 - HANDLE.y1)) /
      dist(HANDLE.x1, HANDLE.y1, HANDLE.x2, HANDLE.y2);
    if (along < 8) color = c.handleShadow;
  }

  return [...color, 255];
}

function rgbaToPng(size, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const i = 1 + x * 4;
      const si = (y * size + x) * 4;
      row[i] = pixels[si];
      row[i + 1] = pixels[si + 1];
      row[i + 2] = pixels[si + 2];
      row[i + 3] = pixels[si + 3];
    }
    rows.push(row);
  }

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderIcon(size) {
  const pixels = new Uint8Array(size * size * 4);
  const scale = size / 128;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = (x + 0.5) / scale;
      const sy = (y + 0.5) / scale;
      const [r, g, b, a] = sampleIcon(sx, sy);
      const i = (y * size + x) * 4;
      pixels[i] = r;
      pixels[i + 1] = g;
      pixels[i + 2] = b;
      pixels[i + 3] = a;
    }
  }

  return rgbaToPng(size, pixels);
}

const SVG = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Background Reveal icon — original artwork, MIT license (see public/icons/LICENSE) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <rect width="128" height="128" fill="#1e40af"/>
  <rect x="18" y="22" width="92" height="84" rx="8" fill="#e2e8f0"/>
  <rect x="20" y="24" width="88" height="18" rx="6" fill="#94a3b8"/>
  <rect x="28" y="30" width="5" height="5" rx="1" fill="#64748b"/>
  <rect x="36" y="30" width="5" height="5" rx="1" fill="#64748b"/>
  <rect x="44" y="30" width="5" height="5" rx="1" fill="#64748b"/>
  <rect x="22" y="44" width="84" height="58" rx="5" fill="#334155"/>
  <circle cx="64" cy="68" r="34" fill="none" stroke="#1e40af" stroke-width="5"/>
  <circle cx="64" cy="68" r="32" fill="#7dd3fc"/>
  <rect x="32" y="68" width="64" height="32" fill="#34d399"/>
  <circle cx="64" cy="68" r="32" fill="none" stroke="#f8fafc" stroke-width="4"/>
  <ellipse cx="52" cy="58" rx="8" ry="6" fill="#ffffff" opacity="0.45"/>
  <rect x="88" y="92" width="10" height="28" rx="5" transform="rotate(45 93 106)" fill="#f1f5f9"/>
  <rect x="88" y="92" width="10" height="28" rx="5" transform="rotate(45 93 106)" fill="none" stroke="#475569" stroke-width="1"/>
</svg>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.svg'), SVG);
fs.writeFileSync(
  path.join(outDir, 'LICENSE'),
  `Background Reveal extension icons

Original artwork created for this project.
License: MIT (same as the project root LICENSE)

You may use, modify, and redistribute these icons under the MIT license.
`,
);

for (const size of [16, 32, 48, 96, 128]) {
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), renderIcon(size));
}

console.log('Icons written to', outDir);
