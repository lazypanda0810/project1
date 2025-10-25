const crypto = require('crypto');
const { verifyRazorpaySignature, verifyStripeSignature } = require('../services/paymentWebhook');

describe('paymentWebhook helpers', () => {
  describe('verifyRazorpaySignature', () => {
    test('returns true for a valid signature', () => {
      const body = JSON.stringify({ event: 'payment.captured', payload: { id: 'p_test', amount: 100 } });
      const secret = 'test_secret_razor';
      const sig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      expect(verifyRazorpaySignature(body, sig, secret)).toBe(true);
    });

    test('returns false for an invalid signature', () => {
      const body = JSON.stringify({ event: 'payment.captured' });
      const secret = 'test_secret_razor';
      const badSig = 'deadbeef';
      expect(verifyRazorpaySignature(body, badSig, secret)).toBe(false);
    });
  });

  describe('verifyStripeSignature', () => {
    test('returns true for a valid signature and fresh timestamp', () => {
      const body = JSON.stringify({ id: 'evt_test' });
      const secret = 'whsec_test_key';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${timestamp}.${body}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const header = `t=${timestamp},v1=${sig}`;
      expect(verifyStripeSignature(header, body, secret)).toBe(true);
    });

    test('returns false for an invalid signature', () => {
      const body = JSON.stringify({ id: 'evt_test' });
      const secret = 'whsec_test_key';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const header = `t=${timestamp},v1=invalidsig`;
      expect(verifyStripeSignature(header, body, secret)).toBe(false);
    });

    test('returns false for an old timestamp beyond tolerance', () => {
      const body = JSON.stringify({ id: 'evt_old' });
      const secret = 'whsec_test_key';
      // create a timestamp far in the past
      const timestamp = Math.floor(Date.now() / 1000) - 100000;
      const signedPayload = `${timestamp}.${body}`;
      const sig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const header = `t=${timestamp},v1=${sig}`;
      expect(verifyStripeSignature(header, body, secret)).toBe(false);
    });
  });
});
