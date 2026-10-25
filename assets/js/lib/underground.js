// Underground band above the footer: a cutaway from the street, through the soil and a manhole shaft,
// down to a brick sewer where a ship hides from searching machines. Scrolling moves the machines along
// the tunnel; the ship turns its lights off while they pass. World units: 700 tall, y grows downward.
export const initUnderground = ({ reduced }) => {
  const cv = document.getElementById('underground');
  if (!cv) return;
  const ctx = cv.getContext('2d'), root = document.documentElement, band = cv.parentElement;
  const bg = document.createElement('canvas'), b = bg.getContext('2d');
  let w = 0, h = 0, dpr = 1, s = 1, W = 0, L = null, raf = 0, visible = false, last = 0, qs = -1, lights = 1, drips = [];
  const col = {};
  const KEYS = ['street', 'curb', 'trim', 'pencil', 'soil', 'soil-2', 'stone', 'concrete', 'concrete-2', 'tunnel', 'tunnel-2', 'water',
    'hull', 'hull-2', 'hull-hi', 'lamp', 'sentinel', 'sentinel-hi', 'eye', 'term-dim', 'rust', 'metal', 'weed', 'glitch-hi'];
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const readColors = () => { const cs = getComputedStyle(root); KEYS.forEach(k => { col[k] = cs.getPropertyValue(`--${k}`).trim(); }); };
  const world = c => c.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);
  const poly = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); };
  let R = Math.random;
  const jl = (c, pts) => { c.beginPath(); pts.forEach(([x, y], i) => { const jx = x + (R() - .5) * 1.1, jy = y + (R() - .5) * 1.1; i ? c.lineTo(jx, jy) : c.moveTo(jx, jy); }); c.stroke(); };
  const shade = a => `rgba(0,0,0,${a})`;

  const layout = () => {
    s = h / 700; W = w / s;
    const k = Math.min(1, W / 1150), phone = W < 700;
    L = { k, street: 38, man: Math.max(70, W * .16), shaftW: 46, top: 228, floor: 584, water: 602, bot: 676, ribs: 128,
      drain: W * (phone ? .9 : .58),
      culverts: phone ? [{ x: W * .36, y: 372, r: 42 }] : [{ x: W * .33, y: 380, r: 52 }, { x: W * .88, y: 352, r: 44 }],
      ship: { cx: W * (phone ? .6 : .64), y: 536, len: Math.min(450, W * .52) } };
  };

  // Everything that does not move: street, soil, buried utilities, shaft, tunnel walls.
  const paintStatic = () => {
    bg.width = cv.width; bg.height = cv.height; R = mulberry(5);
    const c = b, { street, man, shaftW, top, floor, water, bot, drain } = L, sx = man - shaftW / 2, r = mulberry(17);
    world(c);

    // soil: topsoil, clay, then gravel and rock above the tunnel crown
    const soil = c.createLinearGradient(0, street, 0, top); soil.addColorStop(0, col.soil); soil.addColorStop(.55, col.soil); soil.addColorStop(1, col['soil-2']);
    c.fillStyle = soil; c.fillRect(0, 0, W, top);
    c.fillStyle = shade(.18); c.fillRect(0, street, W, 22);
    c.strokeStyle = col.stone; c.lineWidth = 1.2; c.globalAlpha = .7;
    [62, 104, 146].forEach((y, i) => { const pts = []; for (let x = -10; x <= W + 20; x += 40) pts.push([x, y + Math.sin(x * .011 + i * 2) * 6]); jl(c, pts); });
    c.globalAlpha = 1;
    // pencil hatching in patches, darker toward the bottom
    c.strokeStyle = col.pencil; c.lineWidth = .7;
    for (let i = 0; i < W / 22; i++) {
      const hx = r() * W, hy = street + 26 + r() * (top - street - 50), n = 4 + Math.floor(r() * 5);
      c.globalAlpha = .12 + (hy - street) / (top - street) * .2;
      for (let j = 0; j < n; j++) { c.beginPath(); c.moveTo(hx + j * 4, hy); c.lineTo(hx + j * 4 + 7, hy - 9); c.stroke(); }
    }
    c.globalAlpha = 1;
    for (let i = 0; i < W / 9; i++) { const x = r() * W, y = street + 12 + r() * (top - street - 30), rx = 2 + r() * 7; c.fillStyle = col.stone; c.beginPath(); c.ellipse(x, y, rx, rx * (.5 + r() * .4), r() * 3, 0, Math.PI * 2); c.fill(); }
    // broken rock just above the crown
    for (let x = -10; x < W; ) {
      const rw = 18 + r() * 34, rh = 8 + r() * 12, y0 = top - 16 - rh - r() * 8;
      c.fillStyle = r() < .5 ? col.stone : col['concrete-2'];
      poly(c, [[x, y0 + rh], [x + rw * .2, y0 + r() * 4], [x + rw * .7, y0], [x + rw, y0 + rh * .5], [x + rw * .9, y0 + rh]]); c.fill();
      c.strokeStyle = col.pencil; c.lineWidth = .8; c.globalAlpha = .6; c.stroke(); c.globalAlpha = 1;
      x += rw + 2 + r() * 10;
    }
    // buried utilities: a water main, a fibre duct bundle, a power duct, and a pipe along the trench
    const ring = (x, y, rad, fill, inner) => { c.fillStyle = fill; c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill(); c.strokeStyle = col.pencil; c.lineWidth = 1.4; c.stroke();
      if (inner) { c.fillStyle = inner; c.beginPath(); c.arc(x, y, rad * .72, 0, Math.PI * 2); c.fill(); c.lineWidth = .9; c.stroke(); } };
    // sand bedding under the main
    c.fillStyle = col.curb; c.globalAlpha = .35; c.beginPath(); c.ellipse(W * .46, 136, 44, 14, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    ring(W * .46, 116, 26, col.concrete, col['tunnel-2']);
    c.strokeStyle = col['hull-hi']; c.lineWidth = 2; c.globalAlpha = .5; c.beginPath(); c.arc(W * .46, 116, 22, Math.PI * 1.1, Math.PI * 1.5); c.stroke(); c.globalAlpha = 1;
    ring(W * .76, 84, 19, col['concrete-2']);
    [[0, -8, col.rust], [8, -2, col['hull-hi']], [5, 7, col.lamp], [-5, 7, col.trim], [-8, -2, col.metal], [0, 0, col['glitch-hi']]]
      .forEach(([dx, dy, cc]) => ring(W * .76 + dx, 84 + dy, 4, cc));
    ring(W * .3, 150, 12, col.metal);
    c.fillStyle = col['hull-2']; c.fillRect(-10, 174, W + 20, 13);
    c.fillStyle = col['hull-hi']; c.globalAlpha = .35; c.fillRect(-10, 176, W + 20, 3); c.globalAlpha = 1;
    c.strokeStyle = col.pencil; c.lineWidth = 1.2; jl(c, [[-10, 174], [W + 10, 174]]); jl(c, [[-10, 187], [W + 10, 187]]);
    for (let x = 60; x < W; x += 150) { c.fillStyle = col.metal; c.fillRect(x, 171, 10, 19); c.strokeRect(x, 171, 10, 19); }
    // roots from the street trees
    c.strokeStyle = col.stone; c.lineCap = 'round'; c.globalAlpha = .8;
    [W * .4, W * .68, W * .95].forEach((rx, i) => [[-1, 58, 2.6], [.6, 44, 2], [1.4, 30, 1.4]].forEach(([dir, len, lw], j) => {
      const wob = Math.sin(i * 3 + j * 2) * 12;
      c.lineWidth = lw; c.beginPath(); c.moveTo(rx + j * 6, street);
      c.bezierCurveTo(rx + j * 6 + wob, street + len * .35, rx + dir * len * .5 - wob, street + len * .6, rx + dir * len * .8, street + len); c.stroke();
    }));
    c.globalAlpha = 1; c.lineCap = 'butt';

    // street cross-section: kerb, asphalt, the open manhole with its cover on the road, a storm drain
    c.fillStyle = col.street; c.fillRect(-10, 0, W + 20, street);
    c.fillStyle = col.curb; c.fillRect(-10, 0, W + 20, 7);
    c.fillStyle = shade(.15); c.fillRect(-10, street - 8, W + 20, 8);
    c.globalAlpha = .5; c.strokeStyle = col.trim; c.lineWidth = 3; c.setLineDash([40, 30]); c.beginPath(); c.moveTo(-10, 22); c.lineTo(W, 22); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.fillStyle = col.tunnel; c.fillRect(sx, 0, shaftW, street + 2);
    c.fillStyle = col.metal; c.beginPath(); c.ellipse(man + 56, 3, 30, 4.5, -.04, 0, Math.PI * 2); c.fill(); c.fillStyle = col['hull-2']; c.fillRect(man + 28, 2, 56, 5);
    c.strokeStyle = col.pencil; c.lineWidth = 1.2; c.stroke(); c.beginPath(); c.ellipse(man + 56, 3, 30, 4.5, -.04, 0, Math.PI * 2); c.stroke();
    c.fillStyle = col.tunnel; for (let i = 0; i < 5; i++) c.fillRect(drain - 18 + i * 8, 1, 4, 6);
    c.strokeStyle = col.pencil; c.lineWidth = 1.6; jl(c, [[-10, street], [sx, street]]); jl(c, [[sx + shaftW, street], [W + 10, street]]);
    // storm drain pipe from the grate down through the soil
    c.fillStyle = col['concrete-2']; c.fillRect(drain - 9, 7, 18, top - 7);
    c.fillStyle = col['hull-hi']; c.globalAlpha = .25; c.fillRect(drain - 7, 7, 3, top - 7); c.globalAlpha = 1;
    c.strokeStyle = col.pencil; c.lineWidth = 1.2; jl(c, [[drain - 9, 7], [drain - 9, top]]); jl(c, [[drain + 9, 7], [drain + 9, top]]);
    for (let y = 40; y < top - 10; y += 46) { c.fillStyle = col.metal; c.fillRect(drain - 12, y, 24, 5); }

    // shaft: brick walls and a ladder
    c.fillStyle = col['concrete-2']; c.fillRect(sx - 12, street, shaftW + 24, top - street);
    c.fillStyle = col.tunnel; c.fillRect(sx, street, shaftW, top - street);
    c.strokeStyle = col.pencil; c.lineWidth = .7; c.globalAlpha = .55;
    for (let y = street + 10, i = 0; y < top; y += 11, i++) { [sx - 12, sx + shaftW].forEach(x0 => { c.beginPath(); c.moveTo(x0, y); c.lineTo(x0 + 12, y); c.stroke(); c.beginPath(); c.moveTo(x0 + (i % 2 ? 4 : 8), y); c.lineTo(x0 + (i % 2 ? 4 : 8), y + 11); c.stroke(); }); }
    c.globalAlpha = 1; c.lineWidth = 1.6; c.strokeStyle = col.metal;
    [sx + 11, sx + shaftW - 11].forEach(x => { c.beginPath(); c.moveTo(x, street + 6); c.lineTo(x, floor - 8); c.stroke(); });
    c.lineWidth = 1.4; for (let y = street + 18; y < floor - 8; y += 17) { c.beginPath(); c.moveTo(sx + 11, y); c.lineTo(sx + shaftW - 11, y); c.stroke(); }
    c.strokeStyle = col.pencil; c.lineWidth = 1.4; jl(c, [[sx - 12, street], [sx - 12, top - 14]]); jl(c, [[sx + shaftW + 12, street], [sx + shaftW + 12, top - 14]]); jl(c, [[sx, street], [sx, top]]); jl(c, [[sx + shaftW, street], [sx + shaftW, top]]);

    // tunnel: brick crown and invert, brick back wall
    c.fillStyle = col.concrete; c.fillRect(-10, top - 16, W + 20, 16); c.fillRect(-10, bot, W + 20, 24);
    c.strokeStyle = col['concrete-2']; c.lineWidth = 1;
    [[top - 16, top], [bot, bot + 24]].forEach(([y0, y1]) => { for (let y = y0 + 8; y < y1; y += 8) { c.beginPath(); c.moveTo(-10, y); c.lineTo(W + 10, y); c.stroke(); }
      for (let y = y0, i = 0; y < y1; y += 8, i++) for (let x = (i % 2) * 11; x < W; x += 22) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(y1, y + 8)); c.stroke(); } });
    const inside = c.createLinearGradient(0, top, 0, water); inside.addColorStop(0, col['tunnel-2']); inside.addColorStop(1, col.tunnel);
    c.fillStyle = inside; c.fillRect(-10, top, W + 20, bot - top);
    c.strokeStyle = col['concrete-2']; c.lineWidth = .8; c.globalAlpha = .45;
    for (let y = top + 12, i = 0; y < floor; y += 12, i++) { c.beginPath(); c.moveTo(-10, y); c.lineTo(W + 10, y); c.stroke(); for (let x = (i % 2) * 15; x < W; x += 30) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 12); c.stroke(); } }
    c.globalAlpha = 1;
    // stains running down from the crown, a tide line and moss near the water
    for (let i = 0; i < W / 30; i++) { const x = r() * W, len = 60 + r() * 180, st = c.createLinearGradient(0, top, 0, top + len); st.addColorStop(0, shade(.35)); st.addColorStop(1, shade(0)); c.fillStyle = st; c.fillRect(x, top, 4 + r() * 10, len); }
    c.strokeStyle = col['hull-hi']; c.globalAlpha = .18; c.lineWidth = 2; jl(c, [[-10, floor - 34], [W + 10, floor - 34]]); c.globalAlpha = 1;
    c.fillStyle = col.weed; c.globalAlpha = .55;
    for (let i = 0; i < W / 26; i++) { const x = r() * W, y = floor - 36 + r() * 24; c.beginPath(); c.ellipse(x, y, 5 + r() * 12, 2 + r() * 4, 0, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    // culverts in the back wall: a brick rim, rings receding into the dark
    L.culverts.forEach(({ x, y, r: cr }) => {
      const dark = c.createRadialGradient(x + 6, y - 4, 0, x, y, cr); dark.addColorStop(0, '#000'); dark.addColorStop(.7, col.tunnel); dark.addColorStop(1, col['tunnel-2']);
      c.fillStyle = dark; c.beginPath(); c.arc(x, y, cr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = col['concrete-2']; c.lineWidth = 1.2;
      [.78, .58, .4, .25].forEach((f, i) => { c.globalAlpha = .7 - i * .14; c.beginPath(); c.ellipse(x + (1 - f) * 10, y - (1 - f) * 6, cr * f, cr * f, 0, 0, Math.PI * 2); c.stroke(); });
      c.globalAlpha = 1; c.strokeStyle = col.concrete; c.lineWidth = 9; c.beginPath(); c.arc(x, y, cr + 4, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = col['concrete-2']; c.lineWidth = 1.2;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) { c.beginPath(); c.moveTo(x + Math.cos(a) * (cr - 1), y + Math.sin(a) * (cr - 1)); c.lineTo(x + Math.cos(a) * (cr + 9), y + Math.sin(a) * (cr + 9)); c.stroke(); }
      c.strokeStyle = col.pencil; c.lineWidth = 1.4; c.beginPath(); c.arc(x, y, cr + 9, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(x, y, cr - 1, 0, Math.PI * 2); c.stroke();
      c.fillStyle = shade(.35); c.fillRect(x - cr * .5, y + cr + 9, cr, floor - 8 - (y + cr + 9));
    });
    // arched ribs with a lit edge, rivets and painted section numbers
    c.font = '500 10px "IBM Plex Mono", ui-monospace, monospace'; c.textAlign = 'center';
    for (let x = 40, n = 14; x < W + 40; x += L.ribs, n++) {
      c.fillStyle = col['concrete-2']; c.beginPath(); c.moveTo(x - 6, top); c.quadraticCurveTo(x + 8, (top + floor) / 2, x - 6, floor); c.lineTo(x + 6, floor); c.quadraticCurveTo(x + 20, (top + floor) / 2, x + 6, top); c.fill();
      c.strokeStyle = col.concrete; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, top); c.quadraticCurveTo(x + 8, (top + floor) / 2, x - 6, floor); c.stroke();
      c.strokeStyle = shade(.6); c.beginPath(); c.moveTo(x + 6, top); c.quadraticCurveTo(x + 20, (top + floor) / 2, x + 6, floor); c.stroke();
      c.fillStyle = col.metal; for (let y = top + 70; y < floor - 20; y += 52) { c.beginPath(); c.arc(x + 2 + (y - top) / (floor - top) * 6, y, 1.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = col.rust; c.globalAlpha = .45; c.fillText(`S-${n}`, x + 9, top + 128); c.globalAlpha = 1;
    }
    c.textAlign = 'start';
    // ceiling pipes, brackets, and cable bundles sagging between the ribs
    [[top + 26, 8, col.metal], [top + 48, 5, col['hull-2']]].forEach(([y, rad, cc]) => {
      c.fillStyle = cc; c.fillRect(-10, y - rad, W + 20, rad * 2);
      c.fillStyle = col['hull-hi']; c.globalAlpha = .3; c.fillRect(-10, y - rad + 1, W + 20, 2); c.globalAlpha = 1;
      c.strokeStyle = col.pencil; c.lineWidth = 1; c.strokeRect(-10, y - rad, W + 20, rad * 2);
    });
    for (let x = 40; x < W; x += L.ribs) { c.fillStyle = col.concrete; c.fillRect(x - 3, top, 6, 58); c.strokeStyle = col.pencil; c.lineWidth = .8; c.strokeRect(x - 3, top, 6, 58); }
    c.strokeStyle = col.pencil; c.lineCap = 'round';
    [[62, 1.6, 16], [66, 1.2, 24], [70, 2.2, 12]].forEach(([dy, lw, sag]) => { c.lineWidth = lw;
      for (let x = 40; x < W; x += L.ribs) { c.beginPath(); c.moveTo(x, top + dy); c.quadraticCurveTo(x + L.ribs / 2, top + dy + sag, x + L.ribs, top + dy); c.stroke(); } });
    c.lineCap = 'butt';
    // drain outlet through the crown
    c.fillStyle = col['concrete-2']; c.fillRect(drain - 9, top - 16, 18, 34); c.fillStyle = col.tunnel; c.fillRect(drain - 6, top + 12, 12, 6);
    c.strokeStyle = col.pencil; c.lineWidth = 1.2; c.strokeRect(drain - 9, top - 16, 18, 34);
    // walkway with a railing above the channel
    c.fillStyle = col.concrete; c.fillRect(-10, floor - 8, W + 20, 10);
    c.strokeStyle = col.pencil; c.lineWidth = 1.2; jl(c, [[-10, floor - 8], [W + 10, floor - 8]]);
    c.strokeStyle = col.metal; c.lineWidth = 2; for (let x = 20; x < W; x += 46) { c.beginPath(); c.moveTo(x, floor - 8); c.lineTo(x, floor - 32); c.stroke(); }
    c.lineWidth = 2.4; c.beginPath(); c.moveTo(-10, floor - 32); c.lineTo(W + 10, floor - 32); c.stroke(); c.lineWidth = 1.2; c.beginPath(); c.moveTo(-10, floor - 20); c.lineTo(W + 10, floor - 20); c.stroke();
    // channel water, darker with depth
    const wg = c.createLinearGradient(0, water, 0, bot); wg.addColorStop(0, col['tunnel-2']); wg.addColorStop(.25, col.water); wg.addColorStop(1, '#000');
    c.fillStyle = wg; c.fillRect(-10, water, W + 20, bot - water);
    c.strokeStyle = col.pencil; c.lineWidth = 1.8; jl(c, [[-10, top], [sx, top]]); jl(c, [[sx + shaftW, top], [W + 10, top]]); jl(c, [[-10, bot], [W + 10, bot]]);
    // the tunnel is round: darker toward the crown and the invert, and it fades out at both ends
    const cyl = c.createLinearGradient(0, top, 0, bot);
    cyl.addColorStop(0, shade(.55)); cyl.addColorStop(.3, shade(0)); cyl.addColorStop(.75, shade(0)); cyl.addColorStop(1, shade(.45));
    c.fillStyle = cyl; c.fillRect(-10, top, W + 20, bot - top);
    const ends = c.createLinearGradient(0, 0, W, 0);
    ends.addColorStop(0, shade(.7)); ends.addColorStop(.14, shade(0)); ends.addColorStop(.86, shade(0)); ends.addColorStop(1, shade(.7));
    c.fillStyle = ends; c.fillRect(-10, top, W + 20, bot - top);
    L.lamps = [];
    for (let x = 40 + L.ribs * 1.5; x < W; x += L.ribs * 3) {
      L.lamps.push(x);
      c.fillStyle = col.metal; c.fillRect(x - 7, top + 82, 14, 16); c.strokeStyle = col.pencil; c.lineWidth = 1; c.strokeRect(x - 7, top + 82, 14, 16);
      c.strokeStyle = col['concrete-2']; for (let gx = x - 4; gx <= x + 4; gx += 4) { c.beginPath(); c.moveTo(gx, top + 82); c.lineTo(gx, top + 98); c.stroke(); }
    }
    // daylight falling down the shaft
    const lg = c.createLinearGradient(0, street, 0, water); lg.addColorStop(0, col.lamp); lg.addColorStop(1, 'transparent');
    c.globalAlpha = .12; c.fillStyle = lg; poly(c, [[sx, street], [sx + shaftW, street], [sx + shaftW + 80, water], [sx - 80, water]]); c.fill(); c.globalAlpha = 1;
  };

  // The ship's outline, shared by the hull and its reflection.
  const hullPath = (c, x0, y, l, hg) => {
    const x1 = x0 + l;
    c.beginPath();
    c.moveTo(x0 + l * .03, y);
    c.quadraticCurveTo(x0 - l * .01, y - hg * .3, x0 + l * .01, y - hg * .62);
    c.lineTo(x0 + l * .08, y - hg * .86);
    c.lineTo(x0 + l * .6, y - hg);
    c.quadraticCurveTo(x0 + l * .84, y - hg * .98, x1 - l * .04, y - hg * .58);
    c.quadraticCurveTo(x1 + l * .01, y - hg * .42, x1 - l * .03, y - hg * .2);
    c.quadraticCurveTo(x1 - l * .06, y, x1 - l * .12, y);
    c.closePath();
  };

  const drawShip = (c, t, lit) => {
    const { cx, y, len: l } = L.ship, hg = l * .2, x0 = cx - l / 2, x1 = cx + l / 2;
    // searchlight first, so the hull sits on top of it
    if (lit > .02) {
      const g = c.createLinearGradient(x1, 0, x1 + l * .9, 0); g.addColorStop(0, col.lamp); g.addColorStop(1, 'transparent');
      c.globalAlpha = .22 * lit; c.fillStyle = g; poly(c, [[x1 - l * .03, y - hg * .4], [x1 + l * .95, y - hg * 1.5], [x1 + l * .95, y + 70]]); c.fill(); c.globalAlpha = 1;
    }
    // hover pads and the shimmer under them
    [.22, .5, .76].forEach(f => {
      const px = x0 + l * f;
      c.globalAlpha = .45 * lit + .08; c.fillStyle = col['hull-hi']; c.beginPath(); c.ellipse(px, y + 12, l * .07, 4, 0, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.fillStyle = col['hull-2']; c.beginPath(); c.ellipse(px, y + 3, l * .06, 6, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = col.pencil; c.lineWidth = 1.2; c.stroke();
      c.strokeStyle = col['hull-hi']; c.globalAlpha = .35 * lit; c.lineWidth = 1;
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(px + i * 7, y + 14); c.quadraticCurveTo(px + i * 7 + Math.sin(t * .01 + i) * 3, y + 24, px + i * 7, y + 34); c.stroke(); }
      c.globalAlpha = 1;
    });
    // thrusters at the stern
    [.36, .62].forEach(f => {
      const ty = y - hg * f;
      c.fillStyle = col['hull-2']; poly(c, [[x0 + l * .02, ty - 7], [x0 - l * .035, ty - 10], [x0 - l * .035, ty + 10], [x0 + l * .02, ty + 7]]); c.fill(); c.strokeStyle = col.pencil; c.lineWidth = 1.2; c.stroke();
      if (lit > .02) { const tg = c.createRadialGradient(x0 - l * .04, ty, 0, x0 - l * .04, ty, 22); tg.addColorStop(0, col.lamp); tg.addColorStop(1, 'transparent'); c.globalAlpha = .4 * lit; c.fillStyle = tg; c.fillRect(x0 - l * .04 - 22, ty - 22, 44, 44); c.globalAlpha = 1; }
    });
    // hull in two tones, plating and rivets
    hullPath(c, x0, y, l, hg); c.fillStyle = col.hull; c.fill();
    c.save(); hullPath(c, x0, y, l, hg); c.clip();
    c.fillStyle = col['hull-2']; c.fillRect(x0 - 10, y - hg * .3, l + 20, hg * .3);
    c.fillStyle = col['hull-hi']; c.globalAlpha = .25; c.fillRect(x0, y - hg, l, hg * .1); c.globalAlpha = 1;
    const pr = mulberry(31);
    for (let i = 0; i < 9; i++) { const px = x0 + l * (.06 + pr() * .75), py = y - hg * (.32 + pr() * .5), pw = l * (.05 + pr() * .08), ph = hg * (.12 + pr() * .14);
      c.fillStyle = pr() < .5 ? col['hull-2'] : col['hull-hi']; c.globalAlpha = .28; c.fillRect(px, py, pw, ph); c.globalAlpha = 1;
      c.fillStyle = col.pencil; c.globalAlpha = .5; for (let rx = px + 3; rx < px + pw; rx += 7) { c.fillRect(rx, py + 2, 1.2, 1.2); c.fillRect(rx, py + ph - 3, 1.2, 1.2); } c.globalAlpha = 1; }
    c.strokeStyle = col['hull-hi']; c.globalAlpha = .35; c.lineWidth = 1;
    for (let x = x0 + l * .08; x < x1 - l * .1; x += l * .08) { c.beginPath(); c.moveTo(x, y - hg); c.lineTo(x, y - hg * .3); c.stroke(); }
    c.beginPath(); c.moveTo(x0, y - hg * .52); c.lineTo(x1, y - hg * .52); c.stroke();
    // grilles near the stern and a few scratches
    c.globalAlpha = .6; c.fillStyle = col.tunnel; for (let i = 0; i < 6; i++) c.fillRect(x0 + l * (.05 + i * .014), y - hg * .48, l * .006, hg * .14);
    c.strokeStyle = col['hull-hi']; c.globalAlpha = .2; [[.3, .7], [.55, .45], [.72, .62]].forEach(([fx, fy]) => { c.beginPath(); c.moveTo(x0 + l * fx, y - hg * fy); c.lineTo(x0 + l * fx + 14, y - hg * fy + 6); c.stroke(); });
    c.globalAlpha = 1; c.restore();
    hullPath(c, x0, y, l, hg); c.strokeStyle = col.pencil; c.lineWidth = 1.8; c.stroke();
    // bridge with a sloped front, sensor dome, masts and a dish
    const bx0 = x0 + l * .2, bx1 = x0 + l * .58, by = y - hg, bh = l * .075;
    poly(c, [[bx0, by + 1], [bx0 + l * .02, by - bh], [bx1 - l * .04, by - bh], [bx1, by + 1]]); c.fillStyle = col['hull-2']; c.fill(); c.strokeStyle = col.pencil; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = col.hull; c.beginPath(); c.arc(x0 + l * .14, by, l * .035, Math.PI, 0); c.fill(); c.stroke();
    c.lineWidth = 1.4;
    [[.27, 50], [.46, 36]].forEach(([f, ht]) => { const ax = x0 + l * f, ay = by - bh; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax, ay - ht); c.stroke(); c.beginPath(); c.moveTo(ax - 9, ay - ht + 9); c.lineTo(ax + 9, ay - ht + 9); c.stroke(); c.beginPath(); c.moveTo(ax - 5, ay - ht + 18); c.lineTo(ax + 5, ay - ht + 18); c.stroke(); });
    c.fillStyle = col['hull-hi']; c.beginPath(); c.ellipse(x0 + l * .52, by - bh - 8, 8, 4, -.5, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x0 + l * .52, by - bh - 4); c.lineTo(x0 + l * .52, by - bh); c.stroke();
    // nose lamp housing
    c.fillStyle = col['hull-2']; c.fillRect(x1 - l * .06, y - hg * .5, l * .03, hg * .14); c.strokeRect(x1 - l * .06, y - hg * .5, l * .03, hg * .14);
    c.fillStyle = lit > .02 ? col.lamp : col.tunnel; c.globalAlpha = .3 + .7 * lit; c.fillRect(x1 - l * .036, y - hg * .48, l * .008, hg * .1); c.globalAlpha = 1;
    // cables hanging under the hull, and a hatch
    c.strokeStyle = col.pencil; c.lineWidth = 1.6;
    [[.33, 18], [.38, 26], [.62, 14], [.67, 22]].forEach(([f, d]) => { const cx0 = x0 + l * f; c.beginPath(); c.moveTo(cx0, y); c.quadraticCurveTo(cx0 + 12, y + d, cx0 + 26, y); c.stroke(); });
    c.fillStyle = col['hull-2']; c.fillRect(x0 + l * .64, y - hg * .5, l * .05, hg * .22); c.lineWidth = 1; c.strokeRect(x0 + l * .64, y - hg * .5, l * .05, hg * .22);
    // bridge windows and portholes, lit or dark
    for (let i = 0; i < 6; i++) { const wx = bx0 + l * (.035 + i * .052); c.fillStyle = lit > .5 ? col.lamp : col.tunnel; c.globalAlpha = lit > .5 ? .5 + lit * .5 : 1; c.fillRect(wx, by - bh * .72, l * .034, bh * .36); }
    c.globalAlpha = 1;
    for (let i = 0; i < 9; i++) {
      const px = x0 + l * (.12 + i * .072), py = y - hg * .68, rr = Math.max(2.4, l * .012);
      if (lit > .02) { const gl = c.createRadialGradient(px, py, 0, px, py, rr * 5); gl.addColorStop(0, col.lamp); gl.addColorStop(1, 'transparent'); c.globalAlpha = .35 * lit; c.fillStyle = gl; c.fillRect(px - rr * 5, py - rr * 5, rr * 10, rr * 10); }
      c.fillStyle = lit > .02 ? col.lamp : col.tunnel; c.globalAlpha = .25 + .75 * lit; c.beginPath(); c.arc(px, py, rr, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = col.pencil; c.lineWidth = .9; c.stroke();
    }
  };

  // The ship mirrored in the channel, broken up by ripples.
  const drawReflection = (c, t, lit) => {
    const { cx, y, len: l } = L.ship, hg = l * .2, x0 = cx - l / 2;
    c.save(); c.beginPath(); c.rect(-10, L.water, W + 20, L.bot - L.water); c.clip();
    // mirror at the water line, squashed so the hull fits the channel
    c.translate(0, L.water); c.scale(1, -.6); c.translate(0, -y);
    c.globalAlpha = .22; hullPath(c, x0, y, l, hg); c.fillStyle = col.hull; c.fill();
    if (lit > .02) { c.fillStyle = col.lamp; c.globalAlpha = .3 * lit; for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(x0 + l * (.12 + i * .072), y - hg * .68, 3, 0, Math.PI * 2); c.fill(); } }
    c.restore();
    c.save(); c.strokeStyle = col.water; c.lineWidth = 2; c.globalAlpha = .7;
    for (let yy = L.water + 4; yy < L.bot; yy += 5) { const o = Math.sin(t * .003 + yy) * 10; c.beginPath(); c.moveTo(x0 - 20 + o, yy); c.lineTo(x0 + l + 20 + o, yy); c.stroke(); }
    c.restore();
  };

  const drawSentinel = (c, x, y, k, t, i) => {
    // red search beam, sweeping ahead and down
    const ang = .5 + Math.sin(t * .0012 + i * 1.7) * .35, len = 300 * k, spread = .2;
    const g = c.createRadialGradient(x + 20 * k, y, 0, x + 20 * k, y, len); g.addColorStop(0, col.eye); g.addColorStop(1, 'transparent');
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .28; c.fillStyle = g;
    poly(c, [[x + 18 * k, y], [x + 18 * k + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len], [x + 18 * k + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len]]); c.fill(); c.restore();
    // tentacles trail behind, thinning toward the tips
    for (let j = 0; j < 10; j++) {
      let px = x - 12 * k, py = y + (j - 4.5) * 2.6 * k;
      for (let n = 1; n <= 15; n++) {
        const nx = x - 12 * k - n * 10 * k, ny = y + (j - 4.5) * 3.2 * k * (1 + n * .13) + Math.sin(t * .005 + n * .55 + j * 1.3) * n * 1.4 * k;
        c.strokeStyle = col.sentinel; c.lineWidth = Math.max(.8, (4.6 - n * .26) * k); c.lineCap = 'round';
        c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.stroke(); px = nx; py = ny;
      }
    }
    c.strokeStyle = col['sentinel-hi']; c.globalAlpha = .45; c.lineWidth = .9;
    for (let j = 0; j < 4; j++) { c.beginPath(); for (let n = 0; n <= 10; n++) { const nx = x - 12 * k - n * 10 * k, ny = y + (j - 4.5) * 3.2 * k * (1 + n * .13) + Math.sin(t * .005 + n * .55 + j * 1.3) * n * 1.4 * k - 1.2 * k; n ? c.lineTo(nx, ny) : c.moveTo(nx, ny); } c.stroke(); }
    c.globalAlpha = 1; c.lineCap = 'butt';
    c.fillStyle = col.sentinel; c.beginPath(); c.ellipse(x - 12 * k, y, 15 * k, 12 * k, 0, 0, Math.PI * 2); c.ellipse(x + 2 * k, y, 24 * k, 15 * k, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = col.pencil; c.lineWidth = 1.4; c.stroke();
    c.strokeStyle = col['sentinel-hi']; c.globalAlpha = .6; c.lineWidth = 1.2; c.beginPath(); c.ellipse(x + 2 * k, y - 2 * k, 18 * k, 9 * k, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    [-8, -1, 6].forEach(dx => { c.beginPath(); c.ellipse(x + dx * k, y, 3 * k, 14 * k, 0, -Math.PI / 2, Math.PI / 2); c.stroke(); });
    c.globalAlpha = 1;
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .18; c.fillStyle = col.eye; c.beginPath(); c.ellipse(x + 30 * k, L.water + 12, 60 * k, 5, 0, 0, Math.PI * 2); c.fill(); c.restore();
    for (let e = 0; e < 7; e++) {
      const a = -.95 + e * .32, ex = x + 14 * k + Math.cos(a) * 9 * k, ey = y + Math.sin(a) * 10 * k, er = 2.3 * k;
      c.save(); c.globalCompositeOperation = 'lighter'; const eg = c.createRadialGradient(ex, ey, 0, ex, ey, er * 4); eg.addColorStop(0, col.eye); eg.addColorStop(1, 'transparent');
      c.globalAlpha = .55 + .25 * Math.sin(t * .02 + e * 2 + i); c.fillStyle = eg; c.fillRect(ex - er * 4, ey - er * 4, er * 8, er * 8); c.restore();
      c.fillStyle = col.eye; c.beginPath(); c.arc(ex, ey, er, 0, Math.PI * 2); c.fill();
    }
  };

  // Falling water: a faint sheet, strands with long flowing breaks, and foam where it lands.
  const pour = (c, x, y0, y1, wd, t) => {
    c.save();
    const sheet = c.createLinearGradient(0, y0, 0, y1); sheet.addColorStop(0, col['hull-hi']); sheet.addColorStop(1, 'transparent');
    c.globalAlpha = .1; c.fillStyle = sheet; c.fillRect(x - wd / 2, y0, wd, y1 - y0);
    c.strokeStyle = col['hull-hi']; c.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * wd / 5, sp = .1 + (i % 3) * .03;
      c.lineWidth = i % 2 ? .9 : 1.4; c.globalAlpha = .18 + (i % 3) * .07; c.setLineDash([26 + i * 5, 5 + i]); c.lineDashOffset = -t * sp;
      c.beginPath(); c.moveTo(x + ox, y0); c.quadraticCurveTo(x + ox + Math.sin(t * .003 + i) * 2, (y0 + y1) / 2, x + ox * 1.25, y1); c.stroke();
    }
    c.setLineDash([]); c.globalAlpha = .3; c.fillStyle = col['hull-hi'];
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(x + Math.sin(t * .006 + i * 2) * wd * .7, y1 + 3, 3 + (i % 3) * 3, 1.6, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
  };

  // How far through its scroll range the band is: 0 as it enters at the bottom, 1 at the end of the page.
  const progress = () => {
    const r = band.getBoundingClientRect(), vh = innerHeight;
    const maxScroll = document.documentElement.scrollHeight - vh, endTop = r.top - (maxScroll - scrollY);
    return Math.max(0, Math.min(1, (vh - r.top) / Math.max(1, vh - endTop)));
  };

  const frame = now => {
    const dt = Math.min(48, now - (last || now)); last = now;
    const t = reduced ? 0 : now, q = progress();
    qs = qs < 0 || reduced ? q : qs + (q - qs) * Math.min(1, dt * .006);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(bg, 0, 0, w, h);
    world(ctx);
    const sx = L.man - L.shaftW / 2;
    // dust turning in the daylight from the shaft
    ctx.fillStyle = col.lamp;
    for (let i = 0; i < 16; i++) { const p = (i * 37 % 100) / 100, yy = L.street + 20 + ((p * 900 + t * .01 * (1 + i % 3)) % (L.water - L.street - 30)), spread = (yy - L.street) / (L.water - L.street) * 80;
      ctx.globalAlpha = .35 + .3 * Math.sin(t * .002 + i); ctx.beginPath(); ctx.arc(sx + L.shaftW / 2 + Math.sin(t * .0007 + i * 1.9) * (L.shaftW / 2 + spread * .8), yy, 1.1, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    // water pouring from the culverts and the storm drain
    L.culverts.forEach(({ x, y, r: cr }) => pour(ctx, x, y + cr - 6, L.water, cr * .9, t));
    pour(ctx, L.drain, L.top + 18, L.water, 10, t);
    // drips from the ceiling into the water
    if (!reduced) {
      if (drips.length < 14 && Math.random() < .08) drips.push({ x: Math.random() * W, y: L.top + 60, v: 0, hit: 0 });
      drips = drips.filter(d => (d.hit ? now - d.hit < 500 : true));
      drips.forEach(d => { if (!d.hit) { d.v += .02 * dt; d.y += d.v * dt / 16; if (d.y >= L.water) { d.y = L.water; d.hit = now; } } });
    }
    ctx.strokeStyle = col['hull-hi']; ctx.lineWidth = 1.2;
    drips.forEach(d => { ctx.beginPath(); if (d.hit) { const kk = (now - d.hit) / 500; ctx.globalAlpha = .5 * (1 - kk); ctx.ellipse(d.x, L.water + 3, 4 + kk * 16, 1 + kk * 3, 0, 0, Math.PI * 2); } else { ctx.globalAlpha = .6; ctx.moveTo(d.x, d.y - 5); ctx.lineTo(d.x, d.y); } ctx.stroke(); });
    ctx.globalAlpha = 1;
    // caged wall lamps: dim, and one of them flickers
    L.lamps.forEach((x, i) => {
      const fl = i === 1 && !reduced ? (Math.sin(t * .03) > .7 || Math.sin(t * .0007) > .95 ? .25 : 1) : 1;
      const lg = ctx.createRadialGradient(x, L.top + 90, 0, x, L.top + 90, 120); lg.addColorStop(0, col.lamp); lg.addColorStop(1, 'transparent');
      ctx.globalAlpha = .22 * fl; ctx.fillStyle = lg; ctx.fillRect(x - 120, L.top - 30, 240, 240);
      ctx.globalAlpha = .9 * fl; ctx.fillStyle = col.lamp; ctx.fillRect(x - 3, L.top + 86, 6, 8);
      ctx.globalAlpha = .18 * fl; ctx.fillRect(x - 2, L.water + 6, 4, 30); ctx.globalAlpha = 1;
    });
    // haze drifting along the tunnel
    for (let i = 0; i < 3; i++) {
      const hx = ((t * .012 + i * W / 3) % (W + 400)) - 200, hy = L.top + 150 + i * 70, hz = ctx.createRadialGradient(hx, hy, 0, hx, hy, 220);
      hz.addColorStop(0, col['hull-hi']); hz.addColorStop(1, 'transparent'); ctx.globalAlpha = .05; ctx.fillStyle = hz; ctx.fillRect(hx - 220, hy - 220, 440, 440);
    }
    ctx.globalAlpha = 1;
    // the channel flows left to right
    ctx.strokeStyle = col['hull-hi']; ctx.lineWidth = 1.5;
    for (let i = 0; i < W / 34; i++) { const y = L.water + 8 + (i % 6) * 10, x = ((i * 97 + t * .03 * (1 + (i % 3) * .4)) % (W + 60)) - 30; ctx.globalAlpha = .1 + (i % 3) * .04; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 18 + (i % 4) * 6, y); ctx.stroke(); }
    ctx.globalAlpha = 1;
    // the machines swim through as the page scrolls; the ship goes dark while one is close
    const k = 1.25 * Math.max(.75, L.k), lead = -W * .3 + qs * W * 1.45, near = L.ship.len * .95;
    const pos = [0, 1, 2].map(i => ({ x: lead - i * 190 * k, y: L.top + 96 + i * 50 * k + Math.sin(t * .0011 + i * 2) * 12, i }));
    const target = pos.some(p => Math.abs(p.x - L.ship.cx) < near) ? 0 : 1;
    lights = reduced ? target : lights + (target - lights) * Math.min(1, dt * .006);
    drawReflection(ctx, t, lights);
    drawShip(ctx, t, lights);
    // the machines and their beams stay inside the tunnel
    ctx.save(); ctx.beginPath(); ctx.rect(-10, L.top, W + 20, L.bot - L.top); ctx.clip();
    pos.forEach(p => { if (p.x > -300 && p.x < W + 300) drawSentinel(ctx, p.x, p.y, k, t, p.i); });
    ctx.restore();
    // status line, bottom left
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const passing = target === 0, pad = Math.max(16, (w - 1200) / 2 + 16), ty = (L.bot - 12) * s;
    ctx.font = '500 12px "IBM Plex Mono", ui-monospace, monospace'; ctx.textBaseline = 'bottom';
    const head = `ship · power ${lights > .5 ? '2.4 kW' : '0 W'} · `;
    ctx.fillStyle = col['term-dim']; ctx.fillText(head, pad, ty);
    ctx.fillStyle = passing ? col.eye : col['term-dim']; ctx.fillText(passing ? 'lights off, sentinels passing' : 'lights on', pad + ctx.measureText(head).width, ty);
  };

  const loop = now => { frame(now); raf = requestAnimationFrame(loop); };
  const start = () => { if (!raf && visible && !document.hidden && !reduced && L) raf = requestAnimationFrame(loop); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
  const build = (cw, ch) => {
    stop(); w = cw; h = ch; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    readColors(); layout(); paintStatic(); frame(performance.now()); start();
  };
  new ResizeObserver(([e]) => { const { width, height } = e.contentRect; if (Math.abs(width - w) > 1 || Math.abs(height - h) > 1) build(width, height); }).observe(cv);
  const retheme = () => { if (L) { readColors(); paintStatic(); frame(performance.now()); } };
  new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(band);
  // with reduced motion there is no loop, so scrolling redraws one still frame
  if (reduced) { let queued = false; addEventListener('scroll', () => { if (queued || !L) return; queued = true; requestAnimationFrame(() => { queued = false; frame(performance.now()); }); }, { passive: true }); }
};
