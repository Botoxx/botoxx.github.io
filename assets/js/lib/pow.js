// Proof of work for the contact relay: find a nonce so SHA-256(`key:ts:nonce`) starts with `bits` zero bits.
// The Lambda checks the same thing (infra/contact-relay/lambda/handler.mjs, powValid). Plain JS SHA-256,
// because WebCrypto's digest is async and far too slow for hundreds of thousands of tiny hashes.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
const W = new Uint32Array(64), H = new Uint32Array(8), bytes = new Uint8Array(128);

// SHA-256 of an ASCII string; returns the first 32 bits of the digest, which is all the check needs.
export const sha256Head = str => {
  const n = str.length, blocks = n + 9 <= 64 ? 1 : 2;
  bytes.fill(0, 0, blocks * 64);
  for (let i = 0; i < n; i++) bytes[i] = str.charCodeAt(i);
  bytes[n] = 0x80;
  const bitLen = n * 8, end = blocks * 64;
  bytes[end - 4] = bitLen >>> 24; bytes[end - 3] = bitLen >>> 16; bytes[end - 2] = bitLen >>> 8; bytes[end - 1] = bitLen;
  H.set([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < 16; i++) { const o = b * 64 + i * 4; W[i] = bytes[o] << 24 | bytes[o + 1] << 16 | bytes[o + 2] << 8 | bytes[o + 3]; }
    for (let i = 16; i < 64; i++) {
      const w15 = W[i - 15], w2 = W[i - 2];
      const s0 = (w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
      const s1 = (w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);
      W[i] = W[i - 16] + s0 + W[i - 7] + s1;
    }
    let a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let i = 0; i < 64; i++) {
      const S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
      const t1 = h + S1 + (e & f ^ ~e & g) + K[i] + W[i] | 0;
      const S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
      const t2 = S0 + (a & bb ^ a & c ^ bb & c) | 0;
      h = g; g = f; f = e; e = d + t1 | 0; d = c; c = bb; bb = a; a = t1 + t2 | 0;
    }
    H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return H[0];
};

// Searches in slices and yields between them, so the page stays responsive while it works.
export const solvePow = async (key, bits, { slice = 20000, now = Date.now } = {}) => {
  const ts = now(), prefix = `${key}:${ts}:`, shift = 32 - bits;
  for (let nonce = 0; ; ) {
    for (const end = nonce + slice; nonce < end; nonce++) if (sha256Head(prefix + nonce) >>> shift === 0) return { ts, nonce };
    await new Promise(r => setTimeout(r, 0));
  }
};
