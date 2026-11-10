const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifyUser, AUTH_URL } = require('../lib/auth.cjs');

test('missing authorization cannot call the identity service', async () => {
  const old = global.fetch;
  global.fetch = () => { throw new Error('must-not-fetch'); };
  try { assert.equal((await verifyUser({ headers: {} })).status, 401); }
  finally { global.fetch = old; }
});
test('a forged or expired bearer token is rejected by Supabase, without trusting local claims', async () => {
  const old = global.fetch;
  global.fetch = async () => ({ status: 401, ok: false });
  try { assert.equal((await verifyUser({ headers: { authorization: 'Bearer forged-token-not-a-real-session' } })).status, 401); }
  finally { global.fetch = old; }
});
test('only a verified non-anonymous user is accepted, and token is sent to the fixed auth origin', async () => {
  const old = global.fetch;
  global.fetch = async (url, options) => {
    assert.equal(url, AUTH_URL); assert.equal(options.headers.Authorization, 'Bearer test-session-token-for-unit-tests');
    return { status: 200, ok: true, json: async () => ({ id: 'verified-user', is_anonymous: false, email: 'example@example.com' }) };
  };
  try { assert.deepEqual(await verifyUser({ headers: { authorization: 'Bearer test-session-token-for-unit-tests' } }), { status: 200, userId: 'verified-user' }); }
  finally { global.fetch = old; }
});
test('auth outage never becomes a successful login', async () => {
  const old = global.fetch;
  global.fetch = async () => { throw new Error('offline'); };
  try { assert.equal((await verifyUser({ headers: { authorization: 'Bearer test-session-token-for-unit-tests' } })).status, 503); }
  finally { global.fetch = old; }
});
