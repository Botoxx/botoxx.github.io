// Homepage: hero scene, waste estimator with request draft, career timeline, shell, underground band.
import { copyText } from './lib/copy.js';
import { initUnderground } from './lib/underground.js';
import { solvePow } from './lib/pow.js';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const root = document.documentElement;
  const data = JSON.parse($('#site-data').textContent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = data.email, SPEND_MIN = 20000, SPEND_MAX = 200000;

  /* ---------- hero scene: an afternoon block where one window is broken ---------- */
  // World units: ground at y = 0, up is negative. Everything static is painted once per size or theme.
  const findings = [
    { win: [1, 2], cost: 127, what: 'NAT gateway, eu-west-1a', why: '0.2 GB a day goes through it' },
    { win: [3, 2], cost: 47, what: '3 unattached EBS volumes', why: 'gp2, 500 GB, untouched 45+ days' },
    { win: [0, 1], cost: 309, what: 'm5.2xlarge in staging', why: 'CPU under 5% for 7 days' }
  ];
  const scene = (() => {
    const cv = $('#scene'), ctx = cv.getContext('2d'), box = $('#scene-box'), tag = $('#finding'), title = $('.title');
    const bg = document.createElement('canvas'), b = bg.getContext('2d');
    let w = 0, h = 0, dpr = 1, s = 1, W = 0, gy = 0, L = null, drops = [], splashes = [], shards = [], frozen = [], blocks = [];
    let zone = null, fi = 0, raf = 0, visible = true, tearAt = 0, tearY = 0, hopAt = 0, paused = false, last = 0;
    // the cat: hover state, the pointer's x in world units, and when its walk started
    let catHover = false, pointerX = 0, catRun = null, catTear = 0;
    const col = {};
    const KEYS = ['pencil', 'sky-top', 'sky-low', 'sun', 'cloud', 'cloud-sh', 'far', 'far-2', 'wall', 'wall-sh', 'wall-dk', 'trim', 'glass', 'glass-hi', 'street', 'curb', 'weed', 'metal', 'lit', 'rain', 'glitch-hi', 'rust', 'term-bg'];
    const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const readColors = () => { const cs = getComputedStyle(root); KEYS.forEach(k => { col[k] = cs.getPropertyValue(`--${k}`).trim(); }); };
    const world = c => c.setTransform(dpr * s, 0, 0, dpr * s, 0, dpr * gy);
    const px = c => c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const layout = () => {
      const phone = w < 760;
      gy = Math.round(h * (phone ? 0.9 : 0.86));
      s = phone ? Math.min(h / 640, w / 740) : h / 700;
      W = w / s;
      const B = phone ? W - 470 : W - 600, FW = 340, FH = 460, floors = 5, cols = 4, fh = FH / floors, cw = FW / cols;
      const r = mulberry(11);
      const lit = new Set(Array.from({ length: 4 }, () => `${Math.floor(r() * 4)},${Math.floor(r() * cols)}`));
      L = { phone, B, FW, FH, SW: 80, floors, cols, fh, cw, lit,
        win: (f, c) => ({ x: B + c * cw + 17, y: -FH + f * fh + 22, w: cw - 34, h: fh - 42 }),
        door: { x: B + cw + 18, w: cw - 36, cx: B + cw * 1.5 }, balcony: { x: B + 64, y: -FH + 4 * fh - 41 },
        pole: B + FW + 80 + 70, tank: phone ? B + 228 : B + 52, hut: phone ? B + 24 : B + 196, ant: phone ? B + 300 : B + 296, shop: { x: B - 262, w: 240, h: 200 }, vend: { x: B - 236, y: -118, w: 62, h: 118 },
        street: (h - gy) / s };
    };

    // hand-inked lines: slight wobble, and edges that overshoot their corners
    let R = Math.random;
    const jl = (c, pts, close) => { c.beginPath(); pts.forEach(([x, y], i) => { const jx = x + (R() - .5) * 1.1, jy = y + (R() - .5) * 1.1; i ? c.lineTo(jx, jy) : c.moveTo(jx, jy); }); if (close) c.closePath(); c.stroke(); };
    const edge = (c, x1, y1, x2, y2, o = 2.5) => { const d = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / d * o, uy = (y2 - y1) / d * o; jl(c, [[x1 - ux, y1 - uy], [x2 + ux, y2 + uy]]); };
    const box4 = (c, x, y, bw, bh, o) => { edge(c, x, y, x + bw, y, o); edge(c, x + bw, y, x + bw, y + bh, o); edge(c, x + bw, y + bh, x, y + bh, o); edge(c, x, y + bh, x, y, o); };
    const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };

    const cloud = (c, cx, cy, k, seed) => {
      const r = mulberry(seed), puffs = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8 - .5; return { x: cx + t * 260 * k + (r() - .5) * 30 * k, y: cy - (1 - Math.abs(t) * 1.7) * 46 * k - r() * 22 * k, r: (34 + r() * 30) * k * (1 - Math.abs(t) * .7) };
      });
      const shape = () => { c.beginPath(); puffs.forEach(p => { c.moveTo(p.x + p.r, p.y); c.arc(p.x, p.y, p.r, 0, Math.PI * 2); }); c.rect(cx - 150 * k, cy - 10 * k, 300 * k, 14 * k); };
      c.save(); shape(); c.fillStyle = col['cloud-sh']; c.fill(); c.clip();
      c.fillStyle = col.cloud; c.beginPath(); puffs.forEach(p => { c.moveTo(p.x - 8 * k + p.r * .9, p.y - 12 * k); c.arc(p.x - 8 * k, p.y - 12 * k, p.r * .9, 0, Math.PI * 2); }); c.fill();
      c.restore();
    };

    const paintStatic = () => {
      bg.width = cv.width; bg.height = cv.height; R = mulberry(7);
      const c = b, { B, FW, FH, SW, fh, cw } = L, top = -gy / s;
      px(c);
      const g = c.createLinearGradient(0, 0, 0, gy); g.addColorStop(0, col['sky-top']); g.addColorStop(1, col['sky-low']);
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const sun = c.createRadialGradient(w * .3, gy - 300 * s, 0, w * .3, gy - 300 * s, 480 * s);
      sun.addColorStop(0, col.sun); sun.addColorStop(1, 'transparent'); c.globalAlpha = .6; c.fillStyle = sun; c.fillRect(0, 0, w, h); c.globalAlpha = 1;
      world(c);
      cloud(c, W * .2, top + 120, 1.1, 3); cloud(c, W * .58, top + 70, .8, 9); cloud(c, W * .9, top + 170, .65, 21);
      // two depths of city
      const r = mulberry(13);
      c.fillStyle = col.far;
      for (let x = -20; x < W; ) { const bw = 40 + r() * 90, bh = 130 + r() * 190; c.fillRect(x, -bh, bw, bh);
        if (r() < .3) { c.fillRect(x + bw * .3, -bh - 22, 14, 22); } if (r() < .25) { c.fillRect(x + bw * .7, -bh - 40, 2, 40); } x += bw + 3; }
      for (let x = -20; x < W; ) { const bw = 50 + r() * 80, bh = 60 + r() * 120; c.fillStyle = col['far-2']; c.fillRect(x, -bh, bw, bh);
        c.fillStyle = col.far; for (let wy = -bh + 10; wy < -12; wy += 14) for (let wx = x + 7; wx < x + bw - 8; wx += 12) if (r() < .55) c.fillRect(wx, wy, 5, 6);
        x += bw + 4; }
      // street and kerb
      c.fillStyle = col.street; c.fillRect(-10, 0, W + 20, L.street + 10);
      c.fillStyle = col.curb; c.fillRect(-10, 0, W + 20, 12);
      c.strokeStyle = col.pencil; c.lineWidth = 1.4; edge(c, -10, 0, W + 10, 0, 0); edge(c, -10, 12, W + 10, 12, 0);
      c.globalAlpha = .5; c.strokeStyle = col.trim; c.lineWidth = 3; c.setLineDash([40, 30]); c.beginPath(); c.moveTo(-10, L.street * .62); c.lineTo(W, L.street * .62); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;

      // shop house with shutter and awning
      const S = L.shop;
      c.fillStyle = col.wall; c.fillRect(S.x, -S.h, S.w, S.h);
      c.fillStyle = col['wall-dk']; c.globalAlpha = .25; c.fillRect(S.x, -S.h, S.w, 12); c.globalAlpha = 1;
      c.fillStyle = col.curb; c.fillRect(S.x + 90, -104, 132, 104);
      c.strokeStyle = col.pencil; c.lineWidth = .7; c.globalAlpha = .45; for (let y = -100; y < 0; y += 5) { c.beginPath(); c.moveTo(S.x + 90, y); c.lineTo(S.x + 222, y); c.stroke(); } c.globalAlpha = 1;
      for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? col.trim : col.rust; poly(c, [[S.x + 80 + i * 15, -128], [S.x + 95 + i * 15, -128], [S.x + 99 + i * 15.6, -108], [S.x + 82 + i * 15.6, -108]]); c.fill(); }
      c.fillStyle = col.trim; c.fillRect(S.x + 96, -170, 112, 28);
      c.fillStyle = col.rust; c.fillRect(S.x + 108, -161, 50, 4); c.fillRect(S.x + 108, -153, 78, 4);
      c.fillStyle = col.glass; c.fillRect(S.x + 22, -186, 50, 44);
      c.fillStyle = col.curb; c.fillRect(S.x + 26, -80, 36, 26);
      c.strokeStyle = col.pencil; c.lineWidth = 1.6;
      box4(c, S.x, -S.h, S.w, S.h, 3); box4(c, S.x + 90, -104, 132, 104, 0); box4(c, S.x + 96, -170, 112, 28, 2); box4(c, S.x + 22, -186, 50, 44, 2); box4(c, S.x + 26, -80, 36, 26, 1);
      jl(c, [[S.x + 80, -128], [S.x + 230, -128], [S.x + 238, -108], [S.x + 82, -108]], true);
      c.beginPath(); c.arc(S.x + 44, -67, 8, 0, Math.PI * 2); c.lineWidth = 1; c.stroke();
      edge(c, S.x + 47, -186, S.x + 47, -142, 0);
      c.lineWidth = 1.2; edge(c, S.x + 200, -200, S.x + 200, -250, 0); edge(c, S.x + 186, -236, S.x + 214, -236, 0); edge(c, S.x + 190, -226, S.x + 210, -226, 0);

      // main block: shadow side, then the lit front
      c.fillStyle = col['wall-sh']; poly(c, [[B + FW, -FH], [B + FW + SW, -FH + 16], [B + FW + SW, -4], [B + FW, 0]]); c.fill();
      for (let f = 0; f < L.floors; f++) {
        const y0 = -FH + f * fh, y1 = y0 + fh, at = (x, y) => y + (x - B - FW) / SW * (y < -FH / 2 ? 16 : 16) * (1 + y / FH);
        c.fillStyle = col['wall-dk']; poly(c, [[B + FW + 24, at(B + FW + 24, y0 + 24)], [B + FW + 56, at(B + FW + 56, y0 + 24)], [B + FW + 56, at(B + FW + 56, y1 - 22)], [B + FW + 24, at(B + FW + 24, y1 - 22)]]); c.fill();
        c.strokeStyle = col.pencil; c.lineWidth = 1; if (f) edge(c, B + FW, y0, B + FW + SW, at(B + FW + SW, y0), 0);
      }
      c.fillStyle = col.wall; c.fillRect(B, -FH, FW, FH);
      // weathering streaks and slab bands
      for (let f = 0; f < L.floors; f++) for (let k = 0; k < L.cols; k++) {
        const wr = L.win(f, k), st = c.createLinearGradient(0, wr.y + wr.h, 0, wr.y + wr.h + 40);
        st.addColorStop(0, col['wall-dk']); st.addColorStop(1, 'transparent'); c.globalAlpha = .22; c.fillStyle = st; c.fillRect(wr.x + 4, wr.y + wr.h, wr.w - 8, 40); c.globalAlpha = 1;
      }
      for (let f = 1; f < L.floors; f++) { const y = -FH + f * fh; c.fillStyle = col['wall-dk']; c.globalAlpha = .3; c.fillRect(B, y + 6, FW, 10); c.globalAlpha = 1; c.fillStyle = col.trim; c.fillRect(B, y, FW, 6); }
      // windows
      for (let f = 0; f < L.floors; f++) for (let k = 0; k < L.cols; k++) {
        if (f === 4 && k === 1) continue;
        const wr = L.win(f, k), lit = L.lit.has(`${f},${k}`);
        c.fillStyle = col.trim; c.fillRect(wr.x - 4, wr.y - 4, wr.w + 8, wr.h + 8);
        if (lit) { c.fillStyle = col.lit; c.fillRect(wr.x, wr.y, wr.w, wr.h); c.fillStyle = col['wall-dk']; c.globalAlpha = .25; c.fillRect(wr.x, wr.y, wr.w * .42, wr.h); c.globalAlpha = 1; }
        else { const gg = c.createLinearGradient(wr.x, wr.y, wr.x + wr.w, wr.y + wr.h); gg.addColorStop(0, col['glass-hi']); gg.addColorStop(.55, col.glass); gg.addColorStop(1, col.glass); c.fillStyle = gg; c.fillRect(wr.x, wr.y, wr.w, wr.h);
          c.fillStyle = col['glass-hi']; c.globalAlpha = .5; poly(c, [[wr.x + wr.w * .55, wr.y], [wr.x + wr.w * .72, wr.y], [wr.x + wr.w * .3, wr.y + wr.h], [wr.x + wr.w * .13, wr.y + wr.h]]); c.fill(); c.globalAlpha = 1; }
        c.fillStyle = col.trim; c.fillRect(wr.x - 7, wr.y + wr.h + 3, wr.w + 14, 5);
        c.strokeStyle = col.pencil; c.lineWidth = 1.3; box4(c, wr.x - 4, wr.y - 4, wr.w + 8, wr.h + 8, 1.5); c.lineWidth = .9; box4(c, wr.x, wr.y, wr.w, wr.h, 0); edge(c, wr.x + wr.w / 2, wr.y, wr.x + wr.w / 2, wr.y + wr.h, 0);
        edge(c, wr.x - 7, wr.y + wr.h + 8, wr.x + wr.w + 7, wr.y + wr.h + 8, 0);
      }
      // entrance with canopy and lamp
      { const dx = B + cw + 18, dw = cw - 36, dy = -74;
        c.fillStyle = col['wall-dk']; c.fillRect(dx, dy, dw, 74); c.fillStyle = col.glass; c.fillRect(dx + 4, dy + 6, dw / 2 - 6, 64); c.fillRect(dx + dw / 2 + 2, dy + 6, dw / 2 - 6, 64);
        c.fillStyle = col.trim; c.fillRect(dx - 14, dy - 12, dw + 28, 7); c.fillStyle = col['wall-dk']; c.globalAlpha = .35; c.fillRect(dx - 14, dy - 5, dw + 28, 12); c.globalAlpha = 1;
        c.fillStyle = col.lit; c.beginPath(); c.arc(dx + dw + 10, dy + 14, 4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = col.pencil; c.lineWidth = 1.3; box4(c, dx, dy, dw, 74, 1); box4(c, dx - 14, dy - 12, dw + 28, 7, 2); }
      // balconies with railings, laundry, an air conditioner and a plant
      for (const f of [1, 2, 3]) {
        const x0 = B + 8, x1 = B + 2 * cw - 8, sy = -FH + (f + 1) * fh - 8;
        c.fillStyle = col['wall-dk']; c.globalAlpha = .18; c.fillRect(x0, sy - 34, x1 - x0, 34); c.globalAlpha = 1;
        if (f === 2) { c.strokeStyle = col.pencil; c.lineWidth = .8; edge(c, x0 + 6, sy - 58, x1 - 6, sy - 56, 0);
          [col.trim, col['glass-hi'], col.rust, col.cloud, col.trim].forEach((cc, i) => { const lx = x0 + 18 + i * 28; c.fillStyle = cc; poly(c, [[lx, sy - 57], [lx + 16, sy - 57], [lx + 17, sy - 30], [lx - 1, sy - 31]]); c.fill(); c.lineWidth = .8; c.stroke(); }); }
        if (f === 3) { c.fillStyle = col.curb; c.fillRect(x1 - 46, sy - 30, 38, 26); c.strokeStyle = col.pencil; c.lineWidth = 1; box4(c, x1 - 46, sy - 30, 38, 26, 0); c.beginPath(); c.arc(x1 - 27, sy - 17, 8, 0, Math.PI * 2); c.stroke(); }
        if (f === 1) { c.fillStyle = col.rust; c.fillRect(x0 + 12, sy - 18, 16, 14); c.fillStyle = col.weed; [[-4, -26, 9], [6, -32, 10], [14, -24, 8], [2, -40, 7]].forEach(([dx, dy, rr]) => { c.beginPath(); c.ellipse(x0 + 20 + dx, sy + dy, rr, rr * .6, dx / 20, 0, Math.PI * 2); c.fill(); }); }
        c.strokeStyle = col.pencil; c.lineWidth = .9; for (let x = x0 + 4; x < x1 - 2; x += 7) edge(c, x, sy - 32, x, sy, 0);
        c.lineWidth = 2.4; edge(c, x0, sy - 33, x1, sy - 33, 2);
        c.fillStyle = col.trim; c.fillRect(x0 - 4, sy, x1 - x0 + 8, 8); c.fillStyle = col['wall-dk']; c.globalAlpha = .35; c.fillRect(x0 - 4, sy + 8, x1 - x0 + 8, 10); c.globalAlpha = 1;
        c.lineWidth = 1.3; box4(c, x0 - 4, sy, x1 - x0 + 8, 8, 2);
      }
      // downpipe
      c.fillStyle = col.metal; c.fillRect(B + FW - 14, -FH, 6, FH); c.strokeStyle = col.pencil; c.lineWidth = 1; box4(c, B + FW - 14, -FH, 6, FH, 0);
      for (let y = -FH + 30; y < 0; y += 46) edge(c, B + FW - 17, y, B + FW - 5, y, 0);
      // roof: parapet, water tank on legs, stair hut, antenna
      const { tank: T, hut: H, ant: A } = L;
      c.fillStyle = col.trim; c.fillRect(B - 5, -FH - 10, FW + 10, 10);
      c.fillStyle = col['wall-sh']; c.fillRect(H, -FH - 50, 60, 40); c.fillStyle = col['wall-dk']; c.fillRect(H + 14, -FH - 40, 18, 30);
      c.strokeStyle = col.pencil; c.lineWidth = 1.8; edge(c, B + FW, -FH - 10, B + FW + SW, -FH + 8, 1);
      box4(c, B - 5, -FH - 10, FW + 10, 10, 3); c.lineWidth = 1.4; box4(c, H, -FH - 50, 60, 40, 2);
      c.lineWidth = 1.6; [T + 10, T + 76].forEach(x => edge(c, x, -FH - 10, x, -FH - 44, 0)); c.lineWidth = 1; edge(c, T + 10, -FH - 12, T + 76, -FH - 42, 0); edge(c, T + 76, -FH - 12, T + 10, -FH - 42, 0);
      c.fillStyle = col.curb; c.fillRect(T, -FH - 96, 86, 52); c.beginPath(); c.ellipse(T + 43, -FH - 96, 43, 8, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = col['wall-dk']; c.globalAlpha = .3; c.fillRect(T + 58, -FH - 96, 28, 52); c.globalAlpha = 1;
      c.lineWidth = 1.5; box4(c, T, -FH - 96, 86, 52, 2); c.beginPath(); c.ellipse(T + 43, -FH - 96, 43, 8, 0, 0, Math.PI * 2); c.stroke();
      c.lineWidth = .8; [-80, -66].forEach(dy => edge(c, T, -FH + dy, T + 86, -FH + dy, 0));
      c.lineWidth = 1.4; edge(c, A, -FH - 10, A, -FH - 120, 0); c.lineWidth = 1.1;
      [[-112, 36], [-98, 28], [-84, 20]].forEach(([dy, ww]) => edge(c, A - ww / 2, -FH + dy, A + ww / 2, -FH + dy, 0));
      c.lineWidth = 1.8; box4(c, B, -FH, FW, FH, 4); edge(c, B + FW + SW, -FH + 16, B + FW + SW, -4, 2); edge(c, B + FW, 0, B + FW + SW, -4, 2);
      // cast shadow on the street
      c.fillStyle = col.pencil; c.globalAlpha = .13; poly(c, [[B + FW + SW, -4], [B + FW + SW + 150, 30], [B + FW + 40, 30], [B + FW, 0]]); c.fill(); c.globalAlpha = 1;
      // telegraph pole on the right; its wires run into the block, never across the page
      { const P = L.pole;
        c.fillStyle = col.metal; c.fillRect(P - 5, -560, 10, 572);
        c.fillStyle = col.curb; c.fillRect(P + 8, -452, 28, 46); c.beginPath(); c.ellipse(P + 22, -452, 14, 4, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = col.pencil; c.lineWidth = 1.6; box4(c, P - 5, -560, 10, 572, 0); box4(c, P + 8, -452, 28, 46, 1);
        c.lineWidth = 3; edge(c, P - 40, -530, P + 40, -530, 0); edge(c, P - 30, -500, P + 30, -500, 0);
        c.lineWidth = 2; edge(c, P, -380, P - 46, -392, 0); c.fillStyle = col.metal; c.fillRect(P - 58, -396, 18, 8); c.fillStyle = col.lit; c.fillRect(P - 56, -388, 14, 3);
        c.lineWidth = 1.1;
        [[P - 38, -530, B + FW + SW, -FH + 40, 40], [P - 20, -530, B + FW + SW, -FH + 70, 55], [P - 28, -500, B + FW + SW, -FH + 120, 30], [P + 38, -530, W + 30, -500, 50], [P + 22, -500, W + 30, -462, 44]]
          .forEach(([x0, y0, x1, y1, sag]) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1); c.stroke(); });
        c.lineWidth = 2; c.beginPath(); c.moveTo(P + 22, -406); c.quadraticCurveTo(P + 40, -300, P + 6, -260); c.stroke(); }
      // vending machine
      { const V = L.vend;
        const glow = c.createRadialGradient(V.x + V.w / 2, 4, 0, V.x + V.w / 2, 4, 120); glow.addColorStop(0, col.lit); glow.addColorStop(1, 'transparent');
        c.globalAlpha = .35; c.fillStyle = glow; c.fillRect(V.x - 90, -40, V.w + 180, 90); c.globalAlpha = 1;
        c.fillStyle = col.trim; c.fillRect(V.x, V.y, V.w, V.h); c.fillStyle = col.rust; c.fillRect(V.x, V.y, V.w, 12);
        c.fillStyle = col.lit; c.fillRect(V.x + 6, V.y + 18, V.w - 12, 50);
        const pc = [col.glass, col.rust, col.weed, col['glass-hi'], col.metal];
        for (let rr = 0; rr < 3; rr++) for (let k = 0; k < 5; k++) { c.fillStyle = pc[(rr + k) % 5]; c.fillRect(V.x + 10 + k * 9.4, V.y + 22 + rr * 16, 6, 11); }
        c.fillStyle = col.metal; c.fillRect(V.x + 8, V.y + 92, V.w - 16, 14); c.fillRect(V.x + V.w - 16, V.y + 74, 6, 10);
        c.strokeStyle = col.pencil; c.lineWidth = 1.6; box4(c, V.x, V.y, V.w, V.h, 2); c.lineWidth = 1; box4(c, V.x + 6, V.y + 18, V.w - 12, 50, 0); box4(c, V.x + 8, V.y + 92, V.w - 16, 14, 0);
      }
      // weeds along the walls
      c.strokeStyle = col.weed; c.lineWidth = 1.4;
      const tuft = x => { for (let i = 0; i < 6; i++) { const a = (R() - .5) * 1.2, len = 8 + R() * 14; c.beginPath(); c.moveTo(x + i * 2, 0); c.quadraticCurveTo(x + i * 2 + a * 6, -len * .6, x + i * 2 + a * 12, -len); c.stroke(); } };
      for (let x = B - 270; x < B + FW + SW; x += 26 + R() * 40) tuft(x);
      // puddles
      L.puddles = [[B + 150, 30, 90, 7], [B - 100, 44, 60, 5], [B + FW + 140, 52, 70, 6]];
      L.puddles.forEach(([x, y, rx, ry]) => { c.fillStyle = col['sky-low']; c.globalAlpha = .55; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
        c.strokeStyle = col.pencil; c.lineWidth = .8; c.globalAlpha = .5; c.stroke(); c.globalAlpha = 1; });
    };

    // A black cat on the vending machine. It notices the pointer; a click sends it past twice (déjà vu).
    // jump time, and walking pace: `walk` ms per `dist` world units
    const CAT = { jump: 450, walk: 2100, dist: 330 };
    const catSit = (c, cx, cy, t, hover, look, a = 1) => {
      c.save(); c.globalAlpha = a; c.fillStyle = col.pencil;
      c.beginPath(); c.ellipse(cx, cy - 9, 11, 9, 0, 0, Math.PI * 2); c.ellipse(cx - 8, cy - 15, 7, 9, -.3, 0, Math.PI * 2); c.arc(cx - 11, cy - 26, 6.5, 0, Math.PI * 2); c.fill();
      const ear = hover ? 42 : 38;
      poly(c, [[cx - 17, cy - 29], [cx - 16, cy - ear], [cx - 12, cy - 31]]); c.fill(); poly(c, [[cx - 9, cy - 31], [cx - 6, cy - ear], [cx - 5, cy - 29]]); c.fill();
      const sw = Math.sin(t * (hover ? .011 : .0021)) * (hover ? 8 : 5);
      c.strokeStyle = col.pencil; c.lineWidth = 3; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx + 9, cy - 4); c.quadraticCurveTo(cx + 24 + sw, cy - 2, cx + 22 + sw * 1.4, cy + 20); c.stroke();
      if (hover || reduced || (t % 4200) > 150) {
        const ew = hover ? 2.8 : 2.2, eh = hover ? 2.6 : 1.6;
        c.fillStyle = col['glitch-hi']; c.fillRect(cx - 15.4 + look, cy - 28.6, ew, eh); c.fillRect(cx - 10.8 + look, cy - 28.6, ew, eh);
      }
      c.restore();
    };
    const catWalk = (c, x, y, t, a = 1, tuck = false) => {
      const ph = t * .014, leg = o => tuck ? 0 : Math.sin(ph + o) * 5;
      c.save(); c.globalAlpha = a; c.fillStyle = col.pencil; c.strokeStyle = col.pencil; c.lineCap = 'round';
      c.lineWidth = 2.6; c.beginPath();
      [[8, 0], [5, Math.PI], [-8, Math.PI], [-11, 0]].forEach(([lx, o]) => { c.moveTo(x + lx, y - 9); c.lineTo(x + lx + leg(o), tuck ? y - 4 : y); });
      c.stroke();
      c.beginPath(); c.ellipse(x, y - 13, 14, 6.5, 0, 0, Math.PI * 2); c.arc(x + 15, y - 18, 6, 0, Math.PI * 2); c.fill();
      poly(c, [[x + 11, y - 21], [x + 12, y - 30], [x + 16, y - 23]]); c.fill(); poly(c, [[x + 17, y - 23], [x + 20, y - 30], [x + 21, y - 20]]); c.fill();
      c.lineWidth = 3; c.beginPath(); c.moveTo(x - 13, y - 15); c.quadraticCurveTo(x - 25, y - 20 + Math.sin(ph * .5) * 3, x - 22, y - 34); c.stroke();
      c.fillStyle = col['glitch-hi']; c.fillRect(x + 16.5, y - 20, 2, 1.6);
      c.restore();
    };
    // Draws the cat for this frame. A click sends it along the kerb twice (déjà vu); the second time it
    // walks into the building, turns up on a balcony railing, and later returns to the vending machine.
    const drawCat = (now, t) => {
      const V = L.vend, cx = V.x + 36, cy = V.y, x0 = V.x + 90, dist = L.door.cx - x0, wd = CAT.walk * dist / CAT.dist;
      const P = { walk: CAT.jump, enter: CAT.jump + 2 * wd };
      P.inside = P.enter + 600; P.balcony = P.inside + 1400; P.back = P.balcony + 6000; P.end = P.back + 400;
      const run = catRun === null ? -1 : now - catRun;
      if (run < 0 || run >= P.end) {
        catRun = null;
        const look = catHover ? Math.max(-1, Math.min(1, (pointerX - (cx - 12)) / 40)) * .9 : 0;
        return catSit(ctx, cx, cy, t, catHover, look);
      }
      if (run < P.walk) { const p = run / P.walk; return catWalk(ctx, cx + (x0 - cx) * p, cy + (8 - cy) * p - Math.sin(p * Math.PI) * 40, 0, 1, true); }
      if (run < P.enter) {
        const walked = run - P.walk, wt = walked % wd;
        // the second pass is identical to the first; the moment it restarts, the picture tears
        if (walked >= wd && !catTear) catTear = now;
        return catWalk(ctx, x0 + wt / wd * dist, 8, wt * CAT.walk / wd);
      }
      // the door stands open while the cat goes in, then closes behind it
      if (run < P.enter + 900) { ctx.fillStyle = col.pencil; ctx.globalAlpha = .85; ctx.fillRect(L.door.x + 4, -68, L.door.w / 2 - 6, 64); ctx.globalAlpha = 1; }
      if (run < P.inside) { const p = (run - P.enter) / (P.inside - P.enter); return catWalk(ctx, L.door.cx, 8 - p * 10, CAT.walk, 1 - p); }
      if (run < P.balcony) return;
      if (run < P.back) return catSit(ctx, L.balcony.x, L.balcony.y, t, false, 0, Math.min(1, (run - P.balcony) / 400, (P.back - run) / 400));
      catSit(ctx, cx, cy, t, false, 0, Math.min(1, (run - P.back) / 400));
    };
    const startCat = () => { if (!L || catRun !== null || reduced) return false; catRun = performance.now(); catTear = 0; catHover = false; cv.style.cursor = ''; return true; };

    const setZone = i => {
      fi = (i + findings.length) % findings.length;
      const f = findings[fi], r = L.win(f.win[0], f.win[1]);
      zone = { x: r.x - 30, y: r.y - 26, w: r.w + 60, h: r.h + 52, win: r, f };
      const rr = mulberry(fi * 7 + 3), cxw = r.x + r.w / 2, cyw = r.y + r.h / 2;
      // the wall comes apart in blocks; the edge is ragged
      blocks = [];
      for (let y = zone.y; y < zone.y + zone.h; y += 8) for (let x = zone.x; x < zone.x + zone.w; x += 8) {
        const dx = (x + 4 - cxw) / (zone.w / 2), dy = (y + 4 - cyw) / (zone.h / 2);
        if (dx ** 4 + dy ** 4 < .62 + (rr() - .5) * .42) blocks.push([x, y]);
      }
      frozen = Array.from({ length: 16 }, () => ({ x: zone.x + rr() * zone.w, y: zone.y + 8 + rr() * (zone.h - 8), len: 5 + rr() * 6 }));
      shards = Array.from({ length: 8 }, (_, k) => ({ a: k / 8 * Math.PI * 2 + rr(), r: 34 + rr() * 26, sz: 5 + rr() * 7, rot: rr() * 6, spin: (rr() - .5) * .0016, ph: rr() * 6 }));
      $('#f-n').textContent = `${fi + 1}/${findings.length}`;
      $('#f-cost').textContent = `${eur.format(f.cost)} / month`;
      $('#f-what').textContent = f.what; $('#f-why').textContent = f.why;
      if (!L.phone) {
        const bx = box.getBoundingClientRect(), tr = title.getBoundingClientRect();
        const left = tr.left - bx.left, top = Math.min(h - tag.offsetHeight - 24, tr.bottom - bx.top + 26);
        tag.style.left = `${left}px`; tag.style.top = `${top}px`;
        zone.lead = { x: left + tag.offsetWidth, y: top + 24 };
      } else zone.lead = null;
      hopAt = performance.now() + 7000; tearAt = performance.now() + 400;
    };

    const spawn = (d, any) => { d.x = Math.random() * (w + 80) - 60; d.y = any ? Math.random() * h : -20 - Math.random() * 60; d.len = 10 + Math.random() * 12; d.v = 8 + Math.random() * 5; d.end = gy + Math.random() * (h - gy); return d; };
    const frame = now => {
      const dt = Math.min(48, now - (last || now)); last = now;
      px(ctx); ctx.drawImage(bg, 0, 0, w, h);
      const zx = zone.x * s, zy = gy + zone.y * s, zw = zone.w * s, zh = zone.h * s;
      const inZone = (x, y) => x > zx && x < zx + zw && y > zy && y < zy + zh;
      // rain and splashes
      ctx.strokeStyle = col.rain; ctx.globalAlpha = .38; ctx.lineWidth = 1; ctx.beginPath();
      for (const d of drops) {
        if (!reduced) { d.y += d.v * dt / 16; d.x += d.v * .18 * dt / 16; if (d.y > d.end) { splashes.push({ x: d.x, y: d.end, t: now }); spawn(d, false); } }
        if (!inZone(d.x, d.y)) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * .18, d.y - d.len); }
      }
      ctx.stroke();
      splashes = splashes.filter(p => now - p.t < 260);
      ctx.globalAlpha = .45; ctx.beginPath();
      splashes.forEach(p => { const k = (now - p.t) / 260 * 5 + 1; ctx.moveTo(p.x - k, p.y - k * .6); ctx.lineTo(p.x - k * 1.6, p.y - k * 1.4); ctx.moveTo(p.x + k, p.y - k * .6); ctx.lineTo(p.x + k * 1.6, p.y - k * 1.4); });
      ctx.stroke(); ctx.globalAlpha = 1;

      world(ctx);
      const g = col['glitch-hi'], wn = zone.win, t = reduced ? 0 : now;
      // inside the broken wall: the mesh the building is made of
      ctx.save(); ctx.beginPath(); blocks.forEach(([x, y]) => ctx.rect(x, y, 8.4, 8.4)); ctx.fillStyle = col['term-bg']; ctx.fill(); ctx.clip();
      ctx.strokeStyle = g; ctx.lineWidth = .7; ctx.globalAlpha = .85; ctx.beginPath();
      const gx0 = zone.x - 12, gx1 = zone.x + zone.w + 12, gy0 = zone.y - 12, gy1 = zone.y + zone.h + 12;
      for (let x = gx0; x <= gx1; x += 16) { ctx.moveTo(x, gy0); ctx.lineTo(x, gy1); }
      for (let y = gy0; y <= gy1; y += 16) { ctx.moveTo(gx0, y); ctx.lineTo(gx1, y); }
      for (let x = gx0; x < gx1; x += 16) for (let y = gy0; y < gy1; y += 16) { ctx.moveTo(x, y + 16); ctx.lineTo(x + 16, y); }
      ctx.stroke(); ctx.globalAlpha = 1; ctx.lineWidth = 1.4; ctx.strokeRect(wn.x, wn.y, wn.w, wn.h);
      ctx.beginPath(); ctx.moveTo(wn.x, wn.y); ctx.lineTo(wn.x + wn.w, wn.y + wn.h); ctx.moveTo(wn.x + wn.w, wn.y); ctx.lineTo(wn.x, wn.y + wn.h); ctx.globalAlpha = .6; ctx.stroke(); ctx.globalAlpha = 1;
      ctx.restore();
      // rain that stopped in mid-air
      ctx.strokeStyle = g; ctx.fillStyle = g; ctx.lineWidth = 1.2; ctx.beginPath();
      frozen.forEach(f => { ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.len * .18, f.y - f.len); }); ctx.stroke();
      frozen.forEach(f => { ctx.beginPath(); ctx.arc(f.x, f.y + 1.5, 1.3, 0, Math.PI * 2); ctx.fill(); });
      // glass that hangs in the air and drifts back toward the frame
      const cxw = wn.x + wn.w / 2, cyw = wn.y + wn.h / 2;
      shards.forEach(sd => {
        const rad = sd.r * (.8 + .2 * Math.sin(t * .0007 + sd.ph)), a = sd.a + t * .00012, x = cxw + Math.cos(a) * rad * 1.3, y = cyw + Math.sin(a) * rad * .8 + Math.sin(t * .0016 + sd.ph) * 2;
        const rot = sd.rot + t * sd.spin, z = sd.sz;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        poly(ctx, [[-z, -z * .4], [z * .9, -z * .7], [z * .2, z]]); ctx.fillStyle = col['glass-hi']; ctx.globalAlpha = .9; ctx.fill(); ctx.globalAlpha = 1;
        ctx.strokeStyle = col.pencil; ctx.lineWidth = .8; ctx.stroke();
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-z, -z * .4); ctx.lineTo(z * .9, -z * .7); ctx.stroke();
        ctx.restore();
      });
      // the auditor's corner marks
      const k = 10; ctx.strokeStyle = g; ctx.lineWidth = 2.2; ctx.beginPath();
      [[zone.x, zone.y, 1, 1], [zone.x + zone.w, zone.y, -1, 1], [zone.x, zone.y + zone.h, 1, -1], [zone.x + zone.w, zone.y + zone.h, -1, -1]]
        .forEach(([x, y, sx, sy]) => { ctx.moveTo(x + sx * k, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * k); });
      ctx.stroke();
      // the glitch shows in the puddle below it
      const pd = L.puddles.reduce((a, p) => Math.abs(p[0] - cxw) < Math.abs(a[0] - cxw) ? p : a);
      ctx.save(); ctx.beginPath(); ctx.ellipse(pd[0], pd[1], pd[2], pd[3], 0, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = g; ctx.globalAlpha = .7; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const yy = pd[1] - pd[3] + 2 + i * 3.2, off = Math.sin(t * .004 + i) * 4; ctx.moveTo(cxw - 18 + off, yy); ctx.lineTo(cxw + 14 + off, yy); }
      ctx.stroke(); ctx.restore();
      drawCat(now, t);

      px(ctx);
      if (zone.lead) { ctx.strokeStyle = g; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(zx, zy + zh / 2); ctx.lineTo(zx - 24, zy + zh / 2); ctx.lineTo(zone.lead.x, zone.lead.y); ctx.stroke(); ctx.setLineDash([]); }
      // tear: a slice of the broken area shifts sideways for a moment
      if (!reduced && now > tearAt && now < tearAt + 160) {
        if (!tearY) tearY = zy + Math.random() * (zh - 8);
        const sh = 4 + Math.random() * 6, off = (Math.random() < .5 ? -1 : 1) * (4 + Math.random() * 9);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(cv, zx * dpr, tearY * dpr, zw * dpr, sh * dpr, (zx + off) * dpr, tearY * dpr, zw * dpr, sh * dpr);
      } else if (now > tearAt + 160) { tearY = 0; tearAt = now + 1400 + Math.random() * 2600; }
      // déjà vu: the street where the cat walks slips sideways in slices
      if (catTear && now - catTear < 220) {
        const x0 = (L.vend.x + 40) * s, y0 = gy - 44 * s, cw = (L.door.cx - L.vend.x) * s, ch = 60 * s;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 3; i++) { const sy = y0 + Math.random() * ch, sh = 3 + Math.random() * 7, off = (Math.random() - .5) * 26; ctx.drawImage(cv, x0 * dpr, sy * dpr, cw * dpr, sh * dpr, (x0 + off) * dpr, sy * dpr, cw * dpr, sh * dpr); }
      }
      if (!reduced && !paused && now > hopAt) setZone(fi + 1);
    };
    const loop = now => { frame(now); raf = requestAnimationFrame(loop); };
    const start = () => { if (!raf && visible && !document.hidden && !reduced && L) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    const build = (cw, ch) => {
      stop(); w = cw; h = ch; dpr = Math.min(2, devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      readColors(); layout(); paintStatic();
      drops = Array.from({ length: Math.min(340, Math.floor(w * h / 2300)) }, () => spawn({}, true));
      setZone(fi); frame(performance.now()); start();
    };
    new ResizeObserver(([e]) => { const { width, height } = e.contentRect; if (Math.abs(width - w) > 1 || Math.abs(height - h) > 1) build(width, height); }).observe(cv);
    const retheme = () => { if (L) { readColors(); paintStatic(); frame(performance.now()); } };
    new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(box);
    tag.addEventListener('pointerenter', () => { paused = true; });
    tag.addEventListener('pointerleave', () => { paused = false; hopAt = performance.now() + 4000; });
    const next = () => { if (!L) return; setZone(fi + 1); if (reduced) frame(performance.now()); };
    $('#f-next').addEventListener('click', next);
    // pointer over the cat: world coordinates from the canvas box
    const overCat = e => {
      const r = cv.getBoundingClientRect(), wx = (e.clientX - r.left) / s, wy = (e.clientY - r.top - gy) / s, cx = L.vend.x + 36, cy = L.vend.y;
      pointerX = wx;
      return wx > cx - 24 && wx < cx + 34 && wy > cy - 46 && wy < cy + 22;
    };
    cv.addEventListener('pointermove', e => {
      if (!L || catRun !== null) return;
      const on = overCat(e);
      if (on !== catHover) { catHover = on; cv.style.cursor = on ? 'pointer' : ''; }
      if (reduced) frame(performance.now());
    });
    cv.addEventListener('pointerleave', () => { catHover = false; cv.style.cursor = ''; if (reduced && L) frame(performance.now()); });
    cv.addEventListener('click', e => { if (L && overCat(e)) startCat(); });
    return { next, current: () => findings[fi], cat: startCat };
  })();

  initUnderground({ reduced });

  /* ---------- estimator + request draft ---------- */
  const spend = $('#spend'), draftBody = $('#draft-body'), draft = $('#draft'), cta = $('#cta');
  let draftEdited = false, est = null;
  const BAND_MAX = SPEND_MAX / 12 * 0.30;
  // The figures live in one sentence so an edited draft can still be kept in step with the estimate.
  const FIGURES = /Our AWS spend is about [^\n]*/;
  // Fee is a share of the identified yearly waste; the estimate brackets it with the 15–30% range.
  const fee = perMonth => Math.max(data.pricing.minFee, perMonth * 12 * data.pricing.share);
  const feeRange = ({ lo, hi }) => fee(lo) === fee(hi)
    ? `${eur.format(fee(lo))} (minimum fee)`
    : `${eur.format(fee(lo))}–${eur.format(fee(hi))}`;
  // Months of savings the fee costs: 1.2 above the minimum, longer where the minimum applies.
  const payback = ({ lo, hi }) => {
    const fast = fee(hi) / hi, slow = fee(lo) / lo, r = n => Math.round(n * 10) / 10;
    return r(fast) === r(slow) ? `${r(fast)}` : `${r(fast)}–${r(slow)}`;
  };
  const figures = e =>
    `Our AWS spend is about ${eur.format(e.v)} a year (${eur.format(e.m)} a month). Your estimator puts typical waste at ${eur.format(e.lo)}–${eur.format(e.hi)} a month, which would make the audit fee roughly ${feeRange(e)}.`;
  const draftText = e => `Hi Botond,\n\n${figures(e)}\n\nCould you send a few times for a 15-minute intro call?\n\nThanks,\n`;
  const syncDraft = () => {
    if (!draftEdited) draftBody.value = draftText(est);
    else if (FIGURES.test(draftBody.value)) draftBody.value = draftBody.value.replace(FIGURES, figures(est));
    $('#draft-mail').href = `mailto:${EMAIL}?subject=${encodeURIComponent('FinOps audit enquiry')}&body=${encodeURIComponent(draftBody.value)}`;
  };
  // `exact` keeps a figure typed in the shell even when the slider has to cap it.
  const setAudit = (raw, exact = false) => {
    const v = Math.max(SPEND_MIN, Math.min(SPEND_MAX, Math.round(raw / 5000) * 5000));
    spend.value = v;
    const m = v / 12, lo = m * 0.15, hi = m * 0.30;
    est = exact ? { v: raw, m: raw / 12, lo: raw / 12 * 0.15, hi: raw / 12 * 0.30 } : { v, m, lo, hi };
    const band = $('#leak-bar .band');
    band.style.left = `${(lo / BAND_MAX) * 100}%`;
    band.style.width = `${((hi - lo) / BAND_MAX) * 100}%`;
    $('#spend-out').textContent = eur.format(v);
    $('#spend-month').textContent = `${eur.format(m)} / month`;
    $('#leak-out').textContent = `${eur.format(lo)}–${eur.format(hi)}`;
    $('#leak-year').textContent = `${eur.format(lo * 12)}–${eur.format(hi * 12)} a year`;
    $('#price-out').textContent = feeRange(est);
    $('#payback').textContent = `${data.pricing.sharePercent}% of the identified yearly waste, minimum ${eur.format(data.pricing.minFee)}. Pays for itself in ${payback(est)} months of savings.`;
    spend.setAttribute('aria-valuetext', `${eur.format(v)} a year`);
    $('#leak-bar').setAttribute('aria-label', `Of ${eur.format(m)} a month, an estimated ${eur.format(lo)} to ${eur.format(hi)} is waste`);
    syncDraft();
    return v;
  };
  const setCta = open => {
    cta.classList.toggle('open', open); cta.setAttribute('aria-expanded', String(open));
    cta.firstChild.textContent = open ? 'Hide the draft ' : 'Request the audit ';
  };
  const openDraft = () => {
    draft.hidden = false; setCta(true);
    // On touch screens focusing the textarea would raise the keyboard over Copy and Open.
    (matchMedia('(pointer: coarse)').matches ? draft : draftBody).focus({ preventScroll: true });
    draft.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  };
  spend.addEventListener('input', () => setAudit(+spend.value));
  cta.addEventListener('click', () => { if (draft.hidden) openDraft(); else { draft.hidden = true; setCta(false); } });
  draftBody.addEventListener('input', () => { draftEdited = true; syncDraft(); });
  $('#draft-copy').addEventListener('click', e =>
    copyText(`To: ${EMAIL}\nSubject: FinOps audit enquiry\n\n${draftBody.value}`, draftBody, e.currentTarget, 'Copy message'));
  setAudit(+spend.value);

  /* ---------- send the draft through the contact relay (only when an endpoint is configured) ---------- */
  const sendBtn = $('#draft-send');
  if (sendBtn && data.contactEndpoint) {
    const status = $('#draft-status'), emailIn = $('#draft-email'), nameIn = $('#draft-name'), trap = $('#draft-website');
    const loadedAt = performance.now(), label = sendBtn.querySelector('span');
    // The same email, name and text keep the same key, so a retry after a timeout cannot deliver twice.
    let key = null, keyFor = '', pow = null;
    const say = (msg, kind = '') => { status.textContent = msg; status.dataset.kind = kind; };
    sendBtn.addEventListener('click', async () => {
      const email = emailIn.value.trim(), name = nameIn.value.trim(), message = draftBody.value.trim();
      if (!email || !emailIn.checkValidity()) { say('Add your email address so I can reply.', 'error'); emailIn.focus(); return; }
      if (message.length < 20) { say('The message is too short to send. Write a sentence or two.', 'error'); draftBody.focus(); return; }
      const fingerprint = `${email}\n${name}\n${message}`;
      if (fingerprint !== keyFor) { key = crypto.randomUUID(); keyFor = fingerprint; pow = null; }
      sendBtn.disabled = true; say('');
      // A small hash puzzle tied to this send ID: about a second for a person, a real cost for a spam script.
      if (!pow || Date.now() - pow.ts > 10 * 60000) { label.textContent = 'Checking…'; pow = await solvePow(key, Number(data.contactPowBits) || 18); }
      label.textContent = 'Sending…';
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
      let done = false;
      try {
        const res = await fetch(data.contactEndpoint, {
          method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
          body: JSON.stringify({ email, name, message, key, pow, website: trap.value, elapsedMs: Math.round(performance.now() - loadedAt) }),
        });
        const body = await res.json().catch(() => ({}));
        if (res.ok) { done = true; label.textContent = 'Sent'; say(`Sent. I reply within one working day from ${EMAIL}.`, 'ok'); }
        else say(body.error || `Sending failed (error ${res.status}). Copy the message or open it in your mail app.`, 'error');
      } catch (err) {
        say(err.name === 'AbortError' ? 'No answer from the server. Try again, or copy the message.' : 'Could not reach the server. Copy the message or open it in your mail app.', 'error');
      } finally {
        clearTimeout(timer);
        if (!done) { sendBtn.disabled = false; label.textContent = 'Send message'; }
      }
    });
  }

  /* ---------- timeline ---------- */
  const roles = data.roles;
  const svg = $('#timeline'), NS = 'http://www.w3.org/2000/svg';
  const W = 900, L = 18, R = 18, TOP = 44, ROW = 44, BH = 14;
  const now = Date.now();
  const T0 = Date.UTC(2017, 6, 1), T1 = Math.max(Date.UTC(2026, 11, 31), now + 40 * 864e5);
  const frac = ms => (ms - T0) / (T1 - T0);
  const X = ms => L + frac(ms) * (W - L - R);
  const ym = ([y, m]) => Date.UTC(y, m - 1, 1);
  const endMs = r => r.end ? ym(r.end) : now;
  const isNow = r => !r.end;
  const el = (tag, attrs, parent = svg) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent.appendChild(n); return n; };
  const H = TOP + roles.length * ROW + 8;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  for (let y = 2018; Date.UTC(y, 0, 1) < T1; y++) {
    const x = X(Date.UTC(y, 0, 1));
    el('line', { x1: x, x2: x, y1: 24, y2: H - 6, class: 'tl-grid' });
    el('text', { x, y: 16, 'text-anchor': 'middle', class: 'tl-year' }).textContent = y;
  }
  const xt = X(now);
  el('line', { x1: xt, x2: xt, y1: 24, y2: H - 6, class: 'tl-today' });
  el('text', { x: xt - 4, y: H - 10, 'text-anchor': 'end', class: 'tl-today-l' }).textContent = 'today';

  const card = $('#role-card'), list = $('#tl-list');
  const show = id => {
    const r = roles.find(r => r.id === id);
    svg.querySelectorAll('.tl-item').forEach(g => { const on = g.dataset.id === id; g.classList.toggle('on', on); g.setAttribute('aria-pressed', on); });
    list.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.id === id));
    card.innerHTML = `
      <div><h3>${r.title}</h3><div class="role-meta">${r.org}<br>${r.dates}</div>
        ${isNow(r) ? '<span class="pill now">Present</span>' : ''}${r.concurrent ? '<span class="pill conc">Concurrent</span>' : ''}</div>
      <div class="role-body"><p>${r.body}</p><ul>${r.items.map(i => `<li>${i}</li>`).join('')}</ul>
        <div class="techs">${r.tech.map(t => `<span>${t}</span>`).join('')}</div></div>`;
  };
  roles.forEach((r, row) => {
    const x1 = X(ym(r.start)), x2 = X(endMs(r)), y = TOP + row * ROW;
    const g = el('g', { class: `tl-item${r.edu ? ' edu' : ''}`, tabindex: 0, role: 'button', 'data-id': r.id, 'aria-label': `${r.short}, ${r.dates}` });
    el('rect', { x: L, y: y - 22, width: W - L - R, height: ROW - 4, class: 'tl-hit' }, g);
    el('rect', { x: x1, y, width: Math.max(6, x2 - x1), height: BH, rx: 2, class: 'tl-bar' }, g);
    const right = x1 > W * 0.6;
    el('text', { x: right ? x2 : x1, y: y - 6, 'text-anchor': right ? 'end' : 'start', class: 'tl-label' }, g).textContent = r.short;
    if (isNow(r)) el('circle', { cx: x2, cy: y + BH / 2, r: 4, class: 'tl-pulse' }, g);
    g.addEventListener('click', () => show(r.id));
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(r.id); } });
  });
  // Phone layout: newest first, each with a mini bar on the same time scale.
  [...roles].reverse().forEach(r => {
    const li = document.createElement('li');
    const left = (frac(ym(r.start)) * 100).toFixed(2), width = Math.max(1.5, (frac(endMs(r)) - frac(ym(r.start))) * 100).toFixed(2);
    li.innerHTML = `<button type="button" data-id="${r.id}" class="${r.edu ? 'edu' : ''}" aria-pressed="false">
      <span class="t">${r.short}</span><span class="d">${r.dates}</span>
      <span class="track" aria-hidden="true"><span class="fill" style="left:${left}%;width:${width}%"></span></span></button>`;
    li.firstElementChild.addEventListener('click', () => { show(r.id); card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' }); });
    list.appendChild(li);
  });
  show('cloud');

  /* ---------- shell ---------- */
  const out = $('#shell-out'), form = $('#shell-form'), input = $('#shell-input');
  const hist = []; let hi = 0;
  const print = (html = ' ', cls = '') => { const d = document.createElement('div'); d.className = `ln ${cls}`; d.innerHTML = html; out.appendChild(d); };
  const lines = arr => arr.forEach(l => print(l));
  const posts = data.posts;
  const checks = [
    ['delete-bucket', 'list-buckets, polled until head-bucket agrees'],
    ['delete-objects', 'list-object-versions'],
    ['--query length()', '--output json | jq length'],
    ['detach-user-policy', 'list-attached-user-policies AND list-attached-group-policies'],
    ['put-bucket-policy', "a real request from a principal you didn't enumerate"]
  ];
  // "120k", "€1.2m", "85,000", "10k/mo", "10k per month", "120k a year" -> { annual, monthly }
  const parseSpend = text => {
    const s = text.toLowerCase().replace(/[€,\s]|eur/g, '');
    const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?(\/mo|\/month|permonth|amonth|monthly|pm|\/yr|\/year|peryear|ayear|yearly|pa)?$/);
    if (!m) return null;
    const n = parseFloat(m[1]) * ({ k: 1e3, m: 1e6 }[m[2]] || 1);
    const monthly = /mo|month|pm/.test(m[3] || '');
    return { annual: Math.round(monthly ? n * 12 : n), monthly };
  };
  const goTo = sel => $(sel).scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  const cmds = {
    help: () => lines([
      '<span class="c">whoami</span>          who you are talking to',
      '<span class="c">services</span>        what I build, with reference repos',
      '<span class="c">audit</span> <span class="d">&lt;spend&gt;</span>   estimate AWS waste: audit 120k, audit 10k/mo',
      '<span class="c">glitch</span>          show the next finding in the picture',
      '<span class="c">cat</span>             ask the cat on the vending machine',
      '<span class="c">book</span>            draft an audit request with your estimate',
      '<span class="c">verify</span>          second checks for S3 signals that lie',
      '<span class="c">stack</span>           tools I use daily',
      '<span class="c">certs</span>           courses and certifications',
      '<span class="c">blog</span>            latest writing',
      '<span class="c">contact</span>         how to reach me',
      '<span class="c">clear</span>           clear the screen'
    ]),
    whoami: () => lines([
      '<span class="a">Botond Geiszt</span> · Cloud Engineer · AI Integrator',
      'Budapest, Hungary · CET · remote or hybrid',
      'Electrical Engineering, BME (2017–2022)',
      'Hungarian (native) · English (fluent)',
      '<span class="d">Cloud-native infrastructure and AI agents in production.</span>'
    ]),
    services: () => data.services.forEach(v => print(`<span class="g">●</span> ${esc(v.name.padEnd(26))} <span class="d">→</span> <a href="https://github.com/Botoxx/${v.repo}">${v.repo}</a>`)),
    audit: args => {
      if (!args.length) return lines(['usage: <span class="c">audit</span> &lt;spend&gt;   e.g. audit 120k, audit 1.2m, audit 10k/mo', '<span class="d">a bare number means per year</span>']);
      const p = parseSpend(args.join(''));
      if (!p || p.annual <= 0) return print(`audit: can't read "${esc(args.join(' '))}" as an amount. Try audit 120k or audit 10k/mo.`, 'r');
      const { annual } = p, m = annual / 12, lo = m * 0.15, hi = m * 0.30;
      lines([
        `annual spend      <span class="c">${eur.format(annual)}</span>  (${eur.format(m)} / month)${p.monthly ? ' <span class="d">read as monthly</span>' : ''}`,
        `typical waste     <span class="a">${eur.format(lo)}–${eur.format(hi)} / month</span>  at 15–30%`,
        `over a year       <span class="a">${eur.format(lo * 12)}–${eur.format(hi * 12)}</span>`,
        `audit fee         <span class="c">${feeRange({ lo, hi })}</span>  ${data.pricing.sharePercent}% of identified yearly waste, min ${eur.format(data.pricing.minFee)}, ${data.pricing.vat}`
      ]);
      const set = setAudit(annual, true);
      if (set !== annual) print(`note: the audit is built for €20k–200k a year, so the estimator stops at ${eur.format(set)}. Your own figure above still holds.`, 'd');
      else print('<span class="d">estimator updated →</span> <a href="#estimate">see it below</a>  <span class="d">· run</span> <span class="c">book</span> <span class="d">to request the audit</span>');
    },
    glitch: () => {
      scene.next(); const f = scene.current();
      lines([`found  <span class="g">${eur.format(f.cost)} / month</span>  ${esc(f.what)}`, `<span class="d">${esc(f.why)}</span>`]);
    },
    cat: () => {
      if (!scene.cat()) return print(reduced ? 'cat: sits still (reduced motion is on).' : 'cat: busy. It is already walking.', 'd');
      lines(['cat: a black cat walks past.', 'cat: a black cat walks past.', '<span class="d">The same cat, twice. That is a glitch: something just changed.</span>', '<span class="d">It went into the building. Watch the balconies.</span>']);
    },
    book: () => {
      lines([
        `draft ready for ${eur.format(est.v)} a year · waste <span class="a">${eur.format(est.lo)}–${eur.format(est.hi)} / month</span>`,
        `to        <span class="a">${EMAIL}</span>`,
        'subject   FinOps audit enquiry',
        '<span class="d">opening the editable draft in the estimator; nothing is sent from this page</span>'
      ]);
      goTo('#estimate'); setTimeout(openDraft, reduced ? 0 : 450);
    },
    verify: () => {
      print('<span class="d">looked like proof         second check</span>');
      checks.forEach(([a, b]) => print(`<span class="r">${esc(a.padEnd(22))}</span><span class="d">→</span> <span class="g">${esc(b)}</span>`));
      print(' ');
      print('One signal is not proof. The second check must see the state some other way.', 'd');
    },
    stack: () => lines([
      '<span class="c">cloud</span>   AWS · Terraform · Kubernetes · OpenShift · Docker',
      '<span class="c">ci/cd</span>   Jenkins · Spinnaker · GitHub Actions · Helm',
      '<span class="c">obs</span>     Prometheus · Grafana · ELK',
      '<span class="c">code</span>    Python · Bash · Groovy',
      '<span class="c">ai</span>      Claude · Bedrock · OpenSearch · LangChain · RAG',
      '<span class="d">full CV →</span> <a href="/cv/">/cv/</a>'
    ]),
    certs: () => lines([
      'KBS-302 Kubernetes and Container-based Application Security',
      'KBS-343 Kubernetes Troubleshooting',
      'OpenShift Administrator · AZ-104 Microsoft Azure Administrator',
      'AI-434 GenAI Application Development with LLMs',
      'Ethical Hacking · ISTQB Foundation Level Software Tester'
    ]),
    blog: () => posts.forEach(p => print(`<span class="d">${p.date}</span>  <a href="${p.url}">${esc(p.title)}</a>`)),
    contact: () => lines([
      `email     <span class="a">${EMAIL}</span>`,
      'github    <a href="https://github.com/botoxx">github.com/botoxx</a>',
      'linkedin  <a href="https://www.linkedin.com/in/botond-geiszt-82b91b167/">linkedin.com/in/botond-geiszt</a>',
      '<span class="d">or run</span> <span class="c">book</span> <span class="d">for a ready-made audit request</span>'
    ]),
    ls: () => print('services/  audit/  experience/  writing/  stack/  <span class="d">README.md</span>'),
    pwd: () => print('/home/botond/cloudgeist.cloud'),
    date: () => print(new Date().toUTCString()),
    history: () => hist.forEach((h, i) => print(`<span class="d">${String(i + 1).padStart(3)}</span>  ${esc(h)}`)),
    sudo: () => print('sudo: permission denied. Least privilege applies here too.', 'r'),
    rm: () => print('rm: refusing. Data nobody can regenerate gets a second check first. Run <span class="c">verify</span>.', 'r'),
    exit: () => print('There is no exit. Only <span class="c">book</span>.', 'd'),
    clear: () => { out.innerHTML = ''; }
  };
  cmds.man = cmds.help; cmds.hire = cmds.book;
  const run = raw => {
    const line = raw.trim().slice(0, 200);
    print(`<span class="p">botond@cloudgeist</span><span class="d">:~$</span> ${esc(line)}`);
    if (!line) return;
    hist.push(line); hi = hist.length;
    const [name, ...args] = line.split(/\s+/);
    const key = name.toLowerCase();
    try {
      if (Object.hasOwn(cmds, key)) cmds[key](args);
      else print(`zsh: command not found: ${esc(name)}. Try <span class="a">help</span>.`);
    } catch (err) {
      print(`${esc(key)}: something broke (${esc(String(err && err.message || err))}). The shell is still running.`, 'r');
    } finally {
      if (key !== 'clear') print(' ');
      out.scrollTop = out.scrollHeight;
    }
  };
  form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; run(v); });
  input.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { e.preventDefault(); input.value = hist[--hi]; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
    else if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
  });
  out.scrollTop = out.scrollHeight;
  $('#shell').addEventListener('click', e => { if (!e.target.closest('a') && !getSelection().toString()) input.focus({ preventScroll: true }); });
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => run(b.dataset.cmd)));
})();
