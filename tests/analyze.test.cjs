const { test } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/analyze');

function request(body, headers = {}) {
  return new Promise(resolve => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { resolve({ status: this.code, data }); } };
    handler({ method: 'POST', headers, body }, res);
  });
}
test('requires explicit fictional-text confirmation; rejects identifiable text before calling AI', async () => {
  assert.equal((await request({ text: '지금 입금해 주세요. 인증은 입금 후 해요.' })).status, 400);
  assert.equal((await request({ fictionalTest: true, text: '문의는 010-1234-5678로 주세요.' })).status, 400);
});
test('key missing is an honest unavailable response, never a fake AI result', async () => {
  const old = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try { assert.equal((await request({ fictionalTest: true, text: '티켓 인증은 언제 받을 수 있나요?' })).status, 503); }
  finally { if (old !== undefined) process.env.GEMINI_API_KEY = old; }
});
test('rejects invented evidence and uses only literal input quotes', () => {
  const result = handler.normalizeResult({ signals: [
    { quote: '없는 문구', reason: '이유', question: '질문' },
    { quote: '입금 후', reason: '인증 시점 확인', question: '먼저 인증 가능한가요?' }
  ], missing: ['양도 방법'] }, '인증은 입금 후 가능해요.');
  assert.equal(result.signals.length, 1);
  assert.equal(result.signals[0].quote, '입금 후');
});
test('provider quota stops the request, with no paid fallback', async () => {
  const oldFetch = global.fetch, oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.match(url, /gemini-2\.5-flash-lite:generateContent$/);
    assert.ok(!url.includes('test-placeholder'));
    assert.equal(options.headers['x-goog-api-key'], 'test-placeholder');
    return { ok: false, status: 429 };
  };
  try {
    const result = await request({ fictionalTest: true, text: '인증은 입금 후에만 해 드릴게요.' }, { 'x-forwarded-for': 'test-quota' });
    assert.equal(result.status, 429); assert.equal(calls, 1);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
  }
});
test('successful model output is parsed and ungrounded quotes are removed', async () => {
  const oldFetch = global.fetch, oldKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'test-placeholder';
  global.fetch = async (_url, options) => {
    const sent = JSON.parse(options.body);
    assert.equal(sent.generationConfig.maxOutputTokens, 1600);
    return { ok: true, json: async () => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
      signals: [{ quote: '입금 후에만', reason: '먼저 인증을 확인하기 어려워요.', question: '입금 전에 인증이 가능한가요?' },
        { quote: '위조 티켓', reason: '입력에 없음', question: '질문' }], missing: ['티켓 전달 방법']
    }) }] } }] }) };
  };
  try {
    const result = await request({ fictionalTest: true, text: '판매자: 인증은 입금 후에만 해 드릴게요.' }, { 'x-forwarded-for': 'test-success' });
    assert.equal(result.status, 200); assert.equal(result.data.signals.length, 1);
    assert.deepEqual(result.data.missing, ['티켓 전달 방법']);
  } finally {
    global.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = oldKey;
  }
});
test('Groq requires explicit selection and uses its server key with the same evidence checks', async () => {
  const oldFetch = global.fetch, oldProvider = process.env.AI_PROVIDER, oldKey = process.env.GROQ_API_KEY;
  process.env.AI_PROVIDER = 'groq'; process.env.GROQ_API_KEY = 'test-groq-placeholder';
  global.fetch = async (url, options) => {
    assert.equal(url, 'https://api.groq.com/openai/v1/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer test-groq-placeholder');
    assert.equal(JSON.parse(options.body).model, 'openai/gpt-oss-20b');
    return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"signals":[],"missing":["티켓 전달 방법"]}' } }] }) };
  };
  try {
    const result = await request({ fictionalTest: true, text: '판매자: 인증은 입금 전에 보여 드릴 수 있어요.' }, { 'x-forwarded-for': 'test-groq' });
    assert.equal(result.status, 200); assert.equal(result.data.provider, 'Groq'); assert.equal(result.data.signals.length, 0);
  } finally {
    global.fetch = oldFetch;
    if (oldProvider === undefined) delete process.env.AI_PROVIDER; else process.env.AI_PROVIDER = oldProvider;
    if (oldKey === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = oldKey;
  }
});
