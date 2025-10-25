const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://localhost:5000';

function makeRazorpaySignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function run() {
  console.log('Running webhook smoke test against', BASE);
  const webhookPath = process.env.WEBHOOK_PATH || '/webhook/razorpay';
  const payload = JSON.stringify({ event: 'payment.captured', payload: { id: 'test_payment', amount: 100 } });
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'test_secret';
  const signature = makeRazorpaySignature(payload, secret);

  try {
    const res = await fetch(`${BASE}${webhookPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-razorpay-signature': signature
      },
      body: payload
    });

    console.log('Webhook endpoint status:', res.status);
    console.log('Webhook response:', (await res.text()).slice(0, 1000));
  } catch (err) {
    console.error('Webhook smoke test failed:', err.message || err);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
