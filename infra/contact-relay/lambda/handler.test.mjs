// Contract tests for the contact relay handler. Run: node --test infra/contact-relay/lambda/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createHandler } from './handler.mjs';

const ENV = { ALLOWED_ORIGIN: 'https://cloudgeist.cloud', TO_ADDRESS: 'botond@cloudgeist.cloud', FROM_ADDRESS: 'contact@cloudgeist.cloud', RATE_LIMIT: '5', DAILY_CAP: '20', POW_BITS: '8' };
const NOW = 1_800_000_000_000;
// Solves the proof of work the way the browser does: SHA-256 of `key:ts:nonce` with POW_BITS leading zero bits.
const solve = (key, ts = NOW - 5000, bits = 8) => { for (let n = 0; ; n++) if (createHash('sha256').update(`${key}:${ts}:${n}`).digest().readUInt32BE(0) >>> (32 - bits) === 0) return { ts, nonce: n }; };
const KEY = '3b241101-e2bb-4255-8caf-4136c566a962';

// Same semantics as the DynamoDB store: hourly hit counter per IP, and message claims that are
// 'pending' until sent, with stale pending claims (older than 60 s) open to retry.
const memoryStore = () => {
  const hits = new Map(), msgs = new Map(), days = new Map();
  return {
    msgs,
    async hit(ip, now, limit) { const k = `${ip}#${Math.floor(now / 3.6e6)}`, n = hits.get(k) || 0; if (n >= limit) return false; hits.set(k, n + 1); return true; },
    async daily(now, cap) { const k = new Date(now).toISOString().slice(0, 10), n = days.get(k) || 0; if (n >= cap) return false; days.set(k, n + 1); return true; },
    async claim(key, now) {
      const m = msgs.get(key);
      if (!m || (m.status === 'pending' && m.at < now - 60000)) { msgs.set(key, { status: 'pending', at: now }); return 'new'; }
      return m.status === 'sent' ? 'sent' : 'pending';
    },
    async markSent(key) { msgs.get(key).status = 'sent'; },
    async release(key) { msgs.delete(key); },
  };
};

const setup = (over = {}) => {
  const sent = [], store = over.store || memoryStore();
  let clock = NOW;
  const handler = createHandler({
    env: { ...ENV, ...over.env }, now: () => clock, store, hashIp: ip => `h:${ip}`, log: { info() {}, warn() {}, error() {} },
    sendEmail: over.sendEmail || (async p => { sent.push(p); }),
  });
  return { handler, sent, store, tick: ms => { clock += ms; } };
};

const event = (body, over = {}) => ({
  requestContext: { http: { method: 'POST', sourceIp: '203.0.113.7' } },
  headers: { origin: 'https://cloudgeist.cloud', 'content-type': 'application/json' },
  body: typeof body === 'string' ? body : JSON.stringify(body),
  isBase64Encoded: false,
  ...over,
});
const valid = (over = {}) => { const key = over.key || KEY; return { email: 'cto@example.de', name: 'Anna', message: 'Our AWS spend is about €80,000 a year. Can we talk?', key, website: '', elapsedMs: 9000, pow: solve(key), ...over }; };
const parse = res => ({ status: res.statusCode, body: JSON.parse(res.body) });

test('rejects methods other than POST', async () => {
  const { handler } = setup();
  assert.equal((await handler(event(valid(), { requestContext: { http: { method: 'GET', sourceIp: '1.1.1.1' } } }))).statusCode, 405);
});

test('rejects requests from other origins', async () => {
  const { handler, sent } = setup();
  const res = parse(await handler(event(valid(), { headers: { origin: 'https://evil.example' } })));
  assert.equal(res.status, 403); assert.equal(sent.length, 0);
});

test('rejects oversized bodies and invalid JSON', async () => {
  const { handler } = setup();
  assert.equal((await handler(event('x'.repeat(9000)))).statusCode, 413);
  assert.equal((await handler(event('{not json'))).statusCode, 400);
});

test('validates email, message length and idempotency key', async () => {
  const { handler, sent } = setup();
  for (const bad of [valid({ email: 'nope' }), valid({ email: '' }), valid({ message: 'too short' }), valid({ message: 'x'.repeat(5001) }), valid({ key: 'abc' }), valid({ name: 'n'.repeat(101) })]) {
    const res = parse(await handler(event(bad)));
    assert.equal(res.status, 400, JSON.stringify(bad).slice(0, 60)); assert.ok(res.body.error);
  }
  assert.equal(sent.length, 0);
});

test('a filled trap field or a send within 3 s of page load answers success but sends nothing', async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(event(valid({ website: 'http://spam.example' })))).statusCode, 200);
  assert.equal((await handler(event(valid({ elapsedMs: 1200 })))).statusCode, 200);
  assert.equal(sent.length, 0);
});

test('a valid message is emailed to the owner with the visitor as reply-to', async () => {
  const { handler, sent } = setup();
  const res = parse(await handler(event(valid({ name: 'Anna\r\nBcc: victim@example.com' }))));
  assert.equal(res.status, 200); assert.equal(res.body.ok, true);
  assert.equal(sent.length, 1);
  const p = sent[0];
  assert.deepEqual(p.Destination.ToAddresses, ['botond@cloudgeist.cloud']);
  assert.deepEqual(p.ReplyToAddresses, ['cto@example.de']);
  assert.match(p.FromEmailAddress, /<contact@cloudgeist\.cloud>$/);
  const subject = p.Content.Simple.Subject.Data;
  assert.ok(!/[\r\n]/.test(subject), 'subject must be one line');
  assert.match(p.Content.Simple.Body.Text.Data, /Our AWS spend is about €80,000/);
});

test('accepts a base64-encoded body', async () => {
  const { handler, sent } = setup();
  const res = await handler(event(Buffer.from(JSON.stringify(valid())).toString('base64'), { isBase64Encoded: true }));
  assert.equal(res.statusCode, 200); assert.equal(sent.length, 1);
});

test('a retry with the same key does not send twice', async () => {
  const { handler, sent } = setup();
  assert.equal((await handler(event(valid()))).statusCode, 200);
  const again = parse(await handler(event(valid())));
  assert.equal(again.status, 200); assert.equal(again.body.duplicate, true);
  assert.equal(sent.length, 1);
});

test('a send already in progress answers 409; a stale one can be retried', async () => {
  const store = memoryStore();
  const { handler, sent, tick } = setup({ store });
  store.msgs.set(KEY, { status: 'pending', at: NOW });
  assert.equal((await handler(event(valid()))).statusCode, 409);
  tick(61000);
  assert.equal((await handler(event(valid()))).statusCode, 200);
  assert.equal(sent.length, 1);
});

test('when SES fails the claim is released, so the same message can be sent again', async () => {
  let fail = true; const sent = [];
  const { handler, store } = setup({ sendEmail: async p => { if (fail) throw Object.assign(new Error('Throttling'), { name: 'TooManyRequestsException' }); sent.push(p); } });
  const res = parse(await handler(event(valid())));
  assert.equal(res.status, 502); assert.ok(res.body.error);
  assert.equal(store.msgs.has(KEY), false);
  fail = false;
  assert.equal((await handler(event(valid()))).statusCode, 200);
  assert.equal(sent.length, 1);
});

test('more than 5 messages from one network in an hour are refused', async () => {
  const { handler, sent, tick } = setup();
  for (let i = 0; i < 5; i++) assert.equal((await handler(event(valid({ key: `3b241101-e2bb-4255-8caf-4136c566a96${i}` })))).statusCode, 200);
  const res = parse(await handler(event(valid({ key: '3b241101-e2bb-4255-8caf-4136c566a969' }))));
  assert.equal(res.status, 429); assert.ok(res.body.error);
  tick(3.6e6);
  const later = '3b241101-e2bb-4255-8caf-4136c566a96a';
  assert.equal((await handler(event(valid({ key: later, pow: solve(later, NOW + 3.6e6 - 5000) })))).statusCode, 200);
  assert.equal(sent.length, 6);
});

test('a store outage answers 503 and sends nothing', async () => {
  const broken = { hit: async () => { throw new Error('ProvisionedThroughputExceededException'); }, daily: async () => true, claim: async () => 'new', markSent: async () => {}, release: async () => {} };
  const { handler, sent } = setup({ store: broken });
  const res = parse(await handler(event(valid())));
  assert.equal(res.status, 503); assert.ok(res.body.error); assert.equal(sent.length, 0);
});

test('a failed markSent after a successful send still answers success', async () => {
  const store = memoryStore(); store.markSent = async () => { throw new Error('timeout'); };
  const { handler, sent } = setup({ store });
  assert.equal((await handler(event(valid()))).statusCode, 200);
  assert.equal(sent.length, 1);
});

test('a missing, wrong or expired proof of work is refused before anything is stored', async () => {
  const store = memoryStore(); let touched = false;
  for (const k of ['hit', 'daily', 'claim']) { const f = store[k]; store[k] = async (...a) => { touched = true; return f(...a); }; }
  const { handler, sent } = setup({ store });
  const other = '9f1c2b3a-0000-4000-8000-000000000001';
  for (const pow of [undefined, { ts: NOW - 5000, nonce: -1 }, solve(other), solve(KEY, NOW - 16 * 60000), solve(KEY, NOW + 5 * 60000)]) {
    const res = parse(await handler(event(valid({ pow }))));
    assert.equal(res.status, 400, JSON.stringify(pow)); assert.ok(res.body.error);
  }
  assert.equal(sent.length, 0); assert.equal(touched, false);
});

test('the site-wide daily cap holds even when every message comes from a different network', async () => {
  const { handler, sent } = setup({ env: { DAILY_CAP: '3' } });
  const from = (i, key) => event(valid({ key }), { requestContext: { http: { method: 'POST', sourceIp: `198.51.100.${i}` } } });
  for (let i = 0; i < 3; i++) assert.equal((await handler(from(i, `3b241101-e2bb-4255-8caf-4136c566a97${i}`))).statusCode, 200);
  const res = parse(await handler(from(9, '3b241101-e2bb-4255-8caf-4136c566a979')));
  assert.equal(res.status, 429); assert.match(res.body.error, /today/);
  assert.equal(sent.length, 3);
});

test('retries of a sent message use up neither the network limit nor the daily cap', async () => {
  const { handler, sent } = setup({ env: { DAILY_CAP: '2' } });
  assert.equal((await handler(event(valid()))).statusCode, 200);
  for (let i = 0; i < 6; i++) assert.equal(parse(await handler(event(valid()))).body.duplicate, true);
  assert.equal((await handler(event(valid({ key: '3b241101-e2bb-4255-8caf-4136c566a980' })))).statusCode, 200);
  assert.equal(sent.length, 2);
});

test('a refused message (rate limit) releases its claim, so the visitor can retry later', async () => {
  const store = memoryStore();
  const { handler, tick } = setup({ store, env: { RATE_LIMIT: '1' } });
  assert.equal((await handler(event(valid({ key: '3b241101-e2bb-4255-8caf-4136c566a981' })))).statusCode, 200);
  assert.equal((await handler(event(valid()))).statusCode, 429);
  assert.equal(store.msgs.has(KEY), false);
  tick(3.6e6);
  assert.equal((await handler(event(valid({ pow: solve(KEY, NOW + 3.6e6 - 5000) })))).statusCode, 200);
});
