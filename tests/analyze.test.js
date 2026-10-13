const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/analyze');

function request(body, extra = {}) {
  return { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.1' }, body, ...extra };
}
function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } };
}
const originalFetch = global.fetch;
const originalKey = process.env.OPENAI_API_KEY;
test.after(() => { global.fetch = originalFetch; if (originalKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = originalKey; });

test('rejects invalid input before any AI request', async () => {
  global.fetch = () => { throw new Error('Should not call AI'); };
  for (const text of ['', 'x'.repeat(8001)]) {
    const res = response(); await handler(request({ text }), res); assert.equal(res.code, 400);
  }
  const res = response(); await handler(request({ text: '거래 글' }, { method: 'GET' }), res); assert.equal(res.code, 405);
});
test('rejects cross-origin use and unconfigured service without fabricated results', async () => {
  const cross = response(); await handler(request({ text: '거래 글' }, { headers: { origin: 'https://untrusted.example', 'content-type': 'application/json' } }), cross); assert.equal(cross.code, 403);
  delete process.env.OPENAI_API_KEY;
  const res = response(); await handler(request({ text: '거래 글' }), res); assert.equal(res.code, 503); assert.equal(res.body.signals, undefined);
});
test('sends the text to Responses API, keeps the key server-side, and validates source evidence', async () => {
  process.env.OPENAI_API_KEY = 'test-only-key';
  const input = '예매 내역은 보여줄 수 없어요. 친구 이름으로 보내 주세요.';
  const output = { level: 'caution', summary: '증빙과 예금주를 먼저 확인해 주세요.', signals: [{ title: '증빙 확인 어려움', quote: '예매 내역은 보여줄 수 없어요.', reason: '예매 사실이 확인되지 않았어요.', question: '개인정보를 가린 예매 증빙을 받을 수 있을까요?' }], missing_information: ['전달 시점'], next_steps: ['입금 전에 증빙을 확인해 주세요.'] };
  let call;
  global.fetch = async (url, options) => { call = { url, options }; return { ok: true, json: async () => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(output) }] }] }) }; };
  const res = response(); await handler(request({ text: input }), res);
  assert.equal(res.code, 200); assert.deepEqual(res.body, output);
  const payload = JSON.parse(call.options.body);
  assert.equal(call.url, 'https://api.openai.com/v1/responses'); assert.equal(payload.store, false);
  assert.equal(payload.input[0].content, input); assert.equal(payload.input[0].role, 'user'); assert.equal(payload.text.format.strict, true);
  assert.ok(!JSON.stringify(res.body).includes('test-only-key'));
  global.fetch = async () => ({ ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ ...output, signals: [{ ...output.signals[0], quote: '원문에 없는 근거' }] }) }] }] }) });
  const bad = response(); await handler(request({ text: input }), bad); assert.equal(bad.code, 502); assert.equal(bad.body.signals, undefined);
});
test('AI quota errors are reported as errors, not a safe-trade result', async () => {
  global.fetch = async () => ({ ok: false, status: 429 });
  const res = response(); await handler(request({ text: '양도할 티켓이 있어요.' }), res);
  assert.equal(res.code, 503); assert.match(res.body.error, /한도/); assert.equal(res.body.level, undefined);
});
