const crypto = require('crypto');

function verifyRazorpaySignature(bodyRaw, signature, secret) {
  // bodyRaw should be the raw request body string
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (e) {
    return false;
  }
}

function verifyStripeSignature(header, bodyRaw, secret, tolerance = 300) {
  // Minimal Stripe signature verification. For production use official stripe SDK.
  if (!header || !secret) return false;
  // header looks like: t=timestamp,v1=signature
  const parts = header.split(',').reduce((acc, p) => {
    const [k, v] = p.split('='); acc[k] = v; return acc;
  }, {});
  const timestamp = parts.t;
  const sig = parts.v1;
  if (!timestamp || !sig) return false;
  const signedPayload = `${timestamp}.${bodyRaw}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  let isValid = false;
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sig);
    if (a.length !== b.length) return false;
    isValid = crypto.timingSafeEqual(a, b);
    if (!isValid) return false;
  } catch (e) {
    return false;
  }
  if (!isValid) return false;
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (Math.abs(age) > tolerance) return false;
  return true;
}

module.exports = {
  verifyRazorpaySignature,
  verifyStripeSignature
};
