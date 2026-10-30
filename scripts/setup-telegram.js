import { pathToFileURL } from 'node:url';

// Run locally with secrets in .env.telegram; never print tokens, API URLs or
// Telegram error bodies, which may contain credentials or private details.
export async function configureWebhook(env = process.env, request = fetch) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const secret = env.TELEGRAM_WEBHOOK_SECRET;
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token || '')) {
    throw new Error('Set TELEGRAM_BOT_TOKEN from BotFather in .env.telegram.');
  }
  if (!/^[A-Za-z0-9_-]{32,256}$/.test(secret || '')) {
    throw new Error('Set TELEGRAM_WEBHOOK_SECRET (32–256 letters, digits, _ or -).');
  }

  let url;
  try {
    url = new URL(env.TELEGRAM_WEBHOOK_URL);
  } catch {
    throw new Error('Set TELEGRAM_WEBHOOK_URL to your production HTTPS /api/telegram endpoint.');
  }
  if (
    url.protocol !== 'https:' || url.username || url.password ||
    url.search || url.hash || url.pathname !== '/api/telegram'
  ) {
    throw new Error('Use a production HTTPS URL ending in /api/telegram, without credentials or query parameters.');
  }

  async function telegram(method, body = {}) {
    try {
      const response = await request(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error('Telegram rejected request.');
      return data.result;
    } catch {
      throw new Error(`Telegram ${method} failed. Check token, network and bot settings; no credentials were logged.`);
    }
  }

  const bot = await telegram('getMe');
  if (bot?.username?.toLowerCase() !== 'dreamthemusedeploy1052_bot') {
    throw new Error('This token does not belong to @DreamTheMuseDeploy1052_bot. Nothing was changed.');
  }

  const current = await telegram('getWebhookInfo');
  if (current.url && current.url !== url.href && env.TELEGRAM_REPLACE_WEBHOOK !== 'true') {
    throw new Error('The bot already has another webhook. Review it first; set TELEGRAM_REPLACE_WEBHOOK=true only if you intend to replace it.');
  }

  // Check deployment and its secret BEFORE changing Telegram delivery.
  // This update has no message, so it does not send anything to a chat.
  let probe;
  try {
    probe = await request(url.href, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Telegram-Bot-Api-Secret-Token': secret,
      },
      body: JSON.stringify({ update_id: 0 }),
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    const data = await probe.json();
    if (!probe.ok || data.ok !== true) throw new Error('Probe failed.');
  } catch {
    throw new Error('Webhook check failed. Check production deployment, TELEGRAM_WEBHOOK_SECRET and deployment protection. Telegram settings were not changed.');
  }

  await telegram('setWebhook', {
    url: url.href,
    secret_token: secret,
    allowed_updates: ['message'],
    max_connections: 1,
  });

  const info = await telegram('getWebhookInfo');
  if (info.url !== url.href) {
    throw new Error('Webhook registration could not be confirmed. Check getWebhookInfo before retrying.');
  }
  return 'Webhook registered for @DreamTheMuseDeploy1052_bot. Send /start in Telegram to verify replies. Delivery is not yet verified.';
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(await configureWebhook());
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
