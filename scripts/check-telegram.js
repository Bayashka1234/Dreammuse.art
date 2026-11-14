import assert from 'node:assert/strict';
import { createHandler } from '../api/telegram.js';

// Synthetic, non-working values; no network or real credentials used.
const env = {
  TELEGRAM_BOT_TOKEN: '123456:test_placeholder_not_a_real_token',
  TELEGRAM_WEBHOOK_SECRET: 'test_placeholder_secret_at_least_32_chars',
  TELEGRAM_OWNER_ID: '123', AI_GATEWAY_API_KEY: 'test_placeholder', AI_GATEWAY_MODEL: 'test/model',
};
let calls = [], jobs = [], aiFails = false, deliveryFails = false;
const request = async (url, options) => {
  calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
  if (url === 'https://ai-gateway.vercel.sh/v1/chat/completions') {
    return { ok: !aiFails, json: async () => ({ choices: [{ message: { content: '387 — импульс; 1052 — структура; ∞ — продолжение.' } }] }) };
  }
  if (deliveryFails) throw new Error('synthetic sensitive error must not escape');
  return { ok: true, json: async () => ({ ok: true }) };
};
function invoke({ method = 'POST', secret = env.TELEGRAM_WEBHOOK_SECRET, body, type = 'application/json' } = {}, config = env) {
  const handler = createHandler({ env: config, request, defer: promise => jobs.push(promise) });
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(data) { this.body = data; return this; } };
  handler({ method, headers: { 'content-type': type, 'x-telegram-bot-api-secret-token': secret }, body: body ?? update('/start') }, res);
  return res;
}
function update(text, owner = 123) {
  return { update_id: 1, message: { chat: { id: owner, type: 'private' }, from: { id: owner, is_bot: false }, text } };
}
async function drain() { await Promise.all(jobs); jobs = []; }
assert.equal(invoke({ method: 'GET' }, {}).code, 503);
assert.equal(invoke({ method: 'GET' }).code, 200);
assert.equal(invoke({ method: 'PUT' }).code, 405);
assert.equal(invoke({ secret: 'wrong' }).code, 401);
assert.equal(invoke({ type: 'text/plain' }).code, 415);
assert.equal(invoke({ body: '{' }).code, 400);
assert.equal(invoke({ body: 'x'.repeat(64_001) }).code, 413);
assert.equal(invoke({ body: { update_id: 1 } }).code, 200);
invoke({ body: update('/start', 999) });
const forged = update('/start'); forged.message.from.id = 999; invoke({ body: forged });
const group = update('/start'); group.message.chat.type = 'group'; invoke({ body: group });
invoke({ body: update('/start@another_bot') });
assert.equal(calls.length, 0);
assert.equal(jobs.length, 0);
assert.equal(invoke({ body: update('/start@DreamTheMuseDeploy1052_bot') }).code, 200);
await drain(); assert.equal(calls.length, 1); assert.match(calls[0].body.text, /Архитектор 1052/);
calls = [];
invoke({ body: update('Объясни вектор') }); await drain();
assert.equal(calls.length, 2); assert.match(calls[0].body.messages[0].content, /387 — живой человеческий импульс/);
assert.match(calls[0].body.messages[0].content, /не координаты/);
assert.equal(calls[0].body.model, 'test/model');
assert.match(calls[0].body.messages[0].content, /Velvet Oracle/);
assert.match(calls[0].body.messages[0].content, /Ksar’Tu‑Flæm/);
assert.match(calls[0].body.messages[0].content, /не разрешение на действия/);
assert.equal(calls[1].body.chat_id, 123);
calls = [];
invoke({ body: update('➜ Вектор 387 → 1052 → ∞') }); await drain();
assert.equal(calls.length, 1); assert.match(calls[0].body.text, /художественный канон/);
for (const text of ['🕯 Ритуал творчества', '🔮 Оракул', '🎵 Музыка', '🎨 Визуал', '🌐 Портал', '/privacy', '/reset']) {
  calls = []; invoke({ body: update(text) }); await drain(); assert.ok(calls.length > 0);
}
calls = []; aiFails = true;
invoke({ body: update('Привет') }); await drain(); assert.match(calls.at(-1).body.text, /Сигнал временно прерван/);
deliveryFails = true; invoke(); await drain(); // Must not reject or expose upstream errors.
assert.equal(invoke({}, { ...env, TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN + '\x16' }).code, 503);
assert.equal(invoke({ method: 'GET' }, { ...env, AI_GATEWAY_MODEL: '' }).code, 503);
assert.equal(invoke({ method: 'GET' }, { ...env, AI_GATEWAY_API_KEY: '', VERCEL_OIDC_TOKEN: 'synthetic_oidc' }).code, 200);
assert.equal(invoke({ method: 'GET' }, { ...env, AI_GATEWAY_API_KEY: '', VERCEL_OIDC_TOKEN: '' }).code, 503);
calls = []; aiFails = false; deliveryFails = false;
invoke({ body: update('/privacy') }); await drain();
assert.match(calls[0].body.text, /Vercel AI Gateway/);
assert.doesNotMatch(calls[0].body.text, /OpenRouter/);
calls = [];
invoke({ body: update('Проверка OIDC') }, { ...env, AI_GATEWAY_API_KEY: '', VERCEL_OIDC_TOKEN: 'synthetic_oidc' }); await drain();
assert.equal(calls[0].headers.Authorization, 'Bearer synthetic_oidc');
calls = [];
invoke({ body: update('Приоритет ключа') }, { ...env, VERCEL_OIDC_TOKEN: 'synthetic_oidc' }); await drain();
assert.equal(calls[0].headers.Authorization, 'Bearer test_placeholder');
assert.equal(invoke({ method: 'GET' }, { ...env, AI_GATEWAY_MODEL: 'not-a-model-id' }).code, 503);
// Reproduce production: no static env token, one reused handler, rotating headers.
const productionEnv = { ...env, VERCEL: '1', AI_GATEWAY_API_KEY: '', VERCEL_OIDC_TOKEN: 'stale_local_token' };
const reusedHandler = createHandler({ env: productionEnv, request, defer: promise => jobs.push(promise) });
function productionCall(oidc, secret = env.TELEGRAM_WEBHOOK_SECRET) {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
  reusedHandler({ method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-bot-api-secret-token': secret, 'x-vercel-oidc-token': oidc }, body: update('Привет') }, res);
  return res;
}
calls = [];
assert.equal(productionCall('synthetic_request_one').code, 200); await drain();
assert.equal(calls[0].headers.Authorization, 'Bearer synthetic_request_one');
calls = [];
assert.equal(productionCall('synthetic_request_two').code, 200); await drain();
assert.equal(calls[0].headers.Authorization, 'Bearer synthetic_request_two');
calls = [];
assert.equal(productionCall(undefined).code, 503); // No stale env fallback on Vercel.
assert.equal(productionCall(['ambiguous', 'header']).code, 503);
assert.equal(productionCall('synthetic_request_three', 'wrong').code, 401);
assert.equal(calls.length, 0);
productionEnv.AI_GATEWAY_API_KEY = 'explicit_test_key';
assert.equal(productionCall('synthetic_request_four').code, 200); await drain();
assert.equal(calls[0].headers.Authorization, 'Bearer explicit_test_key');
console.log('PASS: health/configuration, method/auth/body checks, owner/private filtering, bot targeting, menu, canonical AI prompt, explicit Telegram delivery, safe failures. All providers mocked.');
