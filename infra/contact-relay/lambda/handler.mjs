// Contact relay: checks a message sent from the site's audit draft and emails it to the owner via SES.
// Dependencies are passed in, so the contract tests run without AWS.
import { createHash } from 'node:crypto';

export const LIMITS = { body: 8192, name: 100, email: 254, messageMin: 20, messageMax: 5000, minFillMs: 3000, powMaxAgeMs: 15 * 60000, powSkewMs: 60000 };
const EMAIL = /^[^\s@<>"'(),;:]{1,64}@[^\s@<>"'(),;:]+\.[^\s@<>"'(),;:]{2,}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const oneLine = s => s.replace(/[\r\n\t\u2028\u2029]+/g, ' ').trim();
const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

const MSG = {
  method: 'Send the message with POST.',
  origin: 'Messages are accepted from cloudgeist.cloud only.',
  size: 'The message is too long. Keep it under 5,000 characters.',
  json: 'The request could not be read. Reload the page and try again.',
  email: 'Add a valid email address so I can reply.',
  name: 'The name is too long. Keep it under 100 characters.',
  message: `Write at least ${LIMITS.messageMin} and at most ${LIMITS.messageMax} characters.`,
  key: 'The request is missing its send ID. Reload the page and try again.',
  pow: 'The send check did not pass. Reload the page and try again.',
  rate: 'Too many messages from your network in the last hour. Try again later, or copy the message and email it.',
  daily: 'The form has reached its limit for today. Copy the message and email it; the address is on the page.',
  pending: 'This message is already being sent. Wait a moment, then try again.',
  ses: 'The message could not be sent. Copy it and email it instead; the address is on the page.',
  store: 'Sending is unavailable for a moment. Try again shortly, or copy the message and email it.',
};

// Returns { value } for a usable message, or { status, error } for one to refuse.
export const validate = input => {
  if (!input || typeof input !== 'object') return { status: 400, error: MSG.json };
  const str = v => (typeof v === 'string' ? v : '');
  const email = str(input.email).trim(), name = oneLine(str(input.name)), message = str(input.message).trim(), key = str(input.key);
  if (!email || email.length > LIMITS.email || !EMAIL.test(email)) return { status: 400, error: MSG.email };
  if (name.length > LIMITS.name) return { status: 400, error: MSG.name };
  if (message.length < LIMITS.messageMin || message.length > LIMITS.messageMax) return { status: 400, error: MSG.message };
  if (!UUID.test(key)) return { status: 400, error: MSG.key };
  const pow = input.pow && typeof input.pow === 'object' ? { ts: Number(input.pow.ts), nonce: Number(input.pow.nonce) } : null;
  return { value: { email, name, message, key, pow, trap: str(input.website).trim(), elapsedMs: Number(input.elapsedMs) || 0 } };
};

// Proof of work: SHA-256 of `key:ts:nonce` must start with `bits` zero bits. Binding it to the send ID
// makes each solution single-use (the ID is idempotent), and the timestamp bounds how long it stays valid.
export const powValid = (pow, key, bits, now) => {
  if (!pow || !Number.isSafeInteger(pow.ts) || !Number.isSafeInteger(pow.nonce) || pow.nonce < 0) return false;
  if (pow.ts < now - LIMITS.powMaxAgeMs || pow.ts > now + LIMITS.powSkewMs) return false;
  return createHash('sha256').update(`${key}:${pow.ts}:${pow.nonce}`).digest().readUInt32BE(0) >>> (32 - bits) === 0;
};

export const buildEmail = ({ email, name, message }, env) => ({
  FromEmailAddress: `cloudgeist.cloud contact form <${env.FROM_ADDRESS}>`,
  Destination: { ToAddresses: [env.TO_ADDRESS] },
  ReplyToAddresses: [email],
  Content: { Simple: {
    Subject: { Data: oneLine(`Audit enquiry from ${name || email}`).slice(0, 150), Charset: 'UTF-8' },
    Body: { Text: { Data: `${message}\n\n--\nFrom: ${name ? `${name} ` : ''}<${email}>\nSent with the form on cloudgeist.cloud. Reply to answer directly.`, Charset: 'UTF-8' } },
  } },
});

export const createHandler = ({ env, now, sendEmail, store, hashIp, log = console }) => async event => {
  if (event.requestContext?.http?.method !== 'POST') return json(405, { error: MSG.method });
  if (event.headers?.origin !== env.ALLOWED_ORIGIN) return json(403, { error: MSG.origin });

  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : event.body || '';
  if (raw.length > LIMITS.body) return json(413, { error: MSG.size });
  let input;
  try { input = JSON.parse(raw); } catch { return json(400, { error: MSG.json }); }
  const checked = validate(input);
  if (!checked.value) return json(checked.status, { error: checked.error });
  const msg = checked.value;

  const ip = hashIp(event.requestContext?.http?.sourceIp || 'unknown');
  // Bots fill hidden fields and submit at once. Answer as if it worked, so they learn nothing.
  if (msg.trap || msg.elapsedMs < LIMITS.minFillMs) { log.info(JSON.stringify({ outcome: 'dropped', reason: msg.trap ? 'trap' : 'too-fast', ip })); return json(200, { ok: true }); }

  const t = now();
  // Checked before any database write, so scripted junk costs one hash and nothing else.
  if (!powValid(msg.pow, msg.key, Number(env.POW_BITS) || 18, t)) { log.info(JSON.stringify({ outcome: 'pow-failed', ip })); return json(400, { error: MSG.pow }); }

  // The duplicate check comes first, so a retry never uses up the network limit or the daily cap.
  try {
    const claim = await store.claim(msg.key, t);
    if (claim === 'sent') return json(200, { ok: true, duplicate: true });
    if (claim === 'pending') return json(409, { error: MSG.pending });
    const refuse = async (outcome, error) => { log.info(JSON.stringify({ outcome, ip })); await store.release(msg.key).catch(() => {}); return json(429, { error }); };
    if (!(await store.hit(ip, t, Number(env.RATE_LIMIT) || 5))) return refuse('rate-limited', MSG.rate);
    if (!(await store.daily(t, Number(env.DAILY_CAP) || 20))) return refuse('daily-cap', MSG.daily);
  } catch (err) {
    log.error(JSON.stringify({ outcome: 'store-error', error: err.name || String(err) }));
    await store.release(msg.key).catch(() => {});
    return json(503, { error: MSG.store });
  }

  try {
    await sendEmail(buildEmail(msg, env));
  } catch (err) {
    log.error(JSON.stringify({ outcome: 'ses-error', error: err.name || String(err) }));
    // Free the claim so the visitor's retry can go through; if this fails too, the claim goes stale in 60 s.
    await store.release(msg.key).catch(() => {});
    return json(502, { error: MSG.ses });
  }
  // The email has gone out. A failed mark only means a retry within 60 s could send it twice.
  await store.markSent(msg.key).catch(err => log.warn(JSON.stringify({ outcome: 'mark-failed', error: err.name || String(err) })));
  log.info(JSON.stringify({ outcome: 'sent', ip }));
  return json(200, { ok: true });
};
