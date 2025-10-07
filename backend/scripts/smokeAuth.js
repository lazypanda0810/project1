// Uses global fetch (Node 18+). No external dependency required.
const BASE = process.env.BASE_URL || 'http://localhost:5000';

async function run() {
  console.log('Running auth smoke tests against', BASE);

  try {
    // Register (best-effort; may be disabled in production)
    const registerRes = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke+test@example.com', password: 'Test1234!' })
    });
    console.log('Register status:', registerRes.status);
    const registerBody = await registerRes.text();
    console.log('Register body:', registerBody.slice(0, 500));

    // Login
    const loginRes = await fetch(`${BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'smoke+test@example.com', password: 'Test1234!' })
    });
    console.log('Login status:', loginRes.status);
    const loginJson = await loginRes.json().catch(() => null);
    console.log('Login response:', loginJson);

    if (loginJson && loginJson.token) {
      const token = loginJson.token;
      const protectedRes = await fetch(`${BASE}/api/status`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('Protected route status:', protectedRes.status);
      console.log('Protected body:', (await protectedRes.text()).slice(0, 500));
    } else {
      console.log('No token received; skipping protected route check');
    }
  } catch (err) {
    console.error('Auth smoke test failed:', err.message || err);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
