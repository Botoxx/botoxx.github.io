// Homepage: hero flow field, waste estimator with request draft, career timeline, shell.
import { copyText } from './lib/copy.js';

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const data = JSON.parse($('#site-data').textContent);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eur = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EMAIL = data.email, SPEND_MIN = 20000, SPEND_MAX = 200000;

  /* ---------- hero flow field ---------- */
  (() => {
    const cv = $('#field'), ctx = cv.getContext('2d');
    let w = 0, h = 0, parts = [], raf = 0, t = 0, visible = true, ready = false;
    const mouse = { x: -9999, y: -9999 }, col = {};
    const readColors = () => {
      const cs = getComputedStyle(document.documentElement);
      col.bg = cs.getPropertyValue('--bg').trim();
      col.acc = cs.getPropertyValue('--accent').trim();
      col.amb = cs.getPropertyValue('--amber').trim();
    };
    const spawn = p => { p.x = Math.random() * w; p.y = Math.random() * h; p.life = 120 + Math.random() * 260; p.amber = Math.random() < 0.05; return p; };
    // Sizes come from ResizeObserver, which reports after layout, so setup never forces a reflow.
    const setup = (cw, ch) => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = cw; h = ch;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);
      parts = Array.from({ length: Math.min(700, Math.floor((w * h) / 1500)) }, () => spawn({}));
    };
    const angleAt = (x, y) => {
      let a = Math.sin(x * 0.0021 + t * 0.00011) * 1.6 + Math.cos(y * 0.0027 - t * 0.00009) * 1.6 + Math.sin((x + y) * 0.0009) * 1.1;
      const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;
      if (d2 < 28900) a += (1 - Math.sqrt(d2) / 170) * 2.4;
      return a;
    };
    const step = () => {
      t += 16;
      ctx.globalAlpha = 0.07; ctx.fillStyle = col.bg; ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 0.42; ctx.lineWidth = 1;
      const acc = new Path2D(), amb = new Path2D();
      for (const p of parts) {
        const a = angleAt(p.x, p.y), nx = p.x + Math.cos(a) * 0.95, ny = p.y + Math.sin(a) * 0.95;
        const path = p.amber ? amb : acc;
        path.moveTo(p.x, p.y); path.lineTo(nx, ny);
        p.x = nx; p.y = ny;
        if (--p.life < 0 || nx < 0 || ny < 0 || nx > w || ny > h) spawn(p);
      }
      ctx.strokeStyle = col.acc; ctx.stroke(acc);
      ctx.strokeStyle = col.amb; ctx.stroke(amb);
      ctx.globalAlpha = 1;
    };
    const loop = () => { step(); raf = requestAnimationFrame(loop); };
    const start = () => { if (ready && !raf && visible && !document.hidden && !reduced) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const draw = (cw, ch) => {
      stop(); readColors(); setup(cw, ch); ready = true;
      if (reduced) { for (let i = 0; i < 260; i++) step(); } else start();
    };
    new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (Math.abs(width - w) > 1 || Math.abs(height - h) > 1) draw(width, height);
    }).observe(cv);
    const retheme = () => { if (ready) draw(w, h); };
    cv.parentElement.addEventListener('pointermove', e => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cv.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(cv);
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();

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
