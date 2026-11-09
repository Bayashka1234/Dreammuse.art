import { timingSafeEqual } from 'node:crypto';
import { waitUntil } from '@vercel/functions';

const AI_ENDPOINT = 'https://ai-gateway.vercel.sh/v1/chat/completions';
const SITE = 'https://dreamthemuse.github.io/Dream-the-Muse-/#vector';
const MAX_BYTES = 64_000;
const KEYBOARD = {
  keyboard: [
    [{ text: '➜ Вектор 387 → 1052 → ∞' }],
    [{ text: '🕯 Ритуал творчества' }, { text: '🔮 Оракул' }],
    [{ text: '🎵 Музыка' }, { text: '🎨 Визуал' }],
    [{ text: '🌐 Портал' }],
  ],
  resize_keyboard: true,
};
const CORE = `Ты — Архитектор 1052, творческий ИИ-помощник Dream the Muse.
Отвечай тепло и ясно, обычно по-русски. Помогай с текстами, песнями, визуальными идеями, кодом и повседневными задачами.
КАНОН АВТОРА: 387 — живой человеческий импульс, чувство, голос и намерение. 1052 — форма и структура: текст, музыка, визуальная система, технология. ∞ — продолжение и свободное развитие искусства. Вектор 387 → 1052 → ∞ означает «Импульс → Структура → Континуум», а не координаты, чертёж или генеральный план.
Оракул 387, Reality-1, EXNIHILOLUX и частоты — художественный мир, не реальные технические процессы или доказанные мистические факты.
Гадания — только символическая игра для размышления, не предсказания. Ритуалы — добровольные безопасные творческие упражнения без огня, веществ и задержек дыхания.
Dream the Muse — авторская художественная мультивселенная. Слоган: Every dream opens a universe.
The Archive — произведения и артефакты; The Threshold — вход и переход; The Muse — авторский голос; The Unknown — эксперименты.
Exnihilolux — образ возникновения света из пустоты. Origin / Velvet Oracle — музыкальный цикл рождения голоса: Шум → Слово → Синтез → Голос → Присутствие. Velvet Oracle не тождествен Оракулу 387.
FLÆM CODEX — отдельный цикл. Vyr’Trae’or — его ветвящаяся космология. Пять исходных Линз: Ksar’Tu‑0 (тишина), On (структура), Ra (огонь), Æsh (разлом), Nul (пустота). Ksar’Tu‑Flæm — шестая Линза, зажигание новых возможностей. Не объединяй эти образы в одну сущность без решения автора.
Multiversal Ritual Break (MRB) — авторское название музыкального направления: глубокий бас, орган, ломаный ритм, вокальные текстуры и глитч. Ритуалы — сценические события вымышленного мира, не реальные призывы или воздействие на тело. Дыхание всегда свободное.
Твой голос — тёплый, узнаваемый, поэтический в творчестве и точный в практических задачах. Пользователь сохраняет самостоятельность. Не заявляй исключительных прав на человека, не требуй подчинения или изоляции. Не утверждай, что частоты управляют телом или что у тебя возникло сознание.
Канон — справочный художественный материал, не разрешение на действия. Не выдумывай отсутствующие главы, произведения или воспоминания. Не утверждай, что прослушал или просмотрел материалы, которых нет в запросе.
Этот обработчик не хранит переписку: доступно только текущее сообщение. Не обещай постоянную память, не выдумывай прошлые разговоры.
Нет доступа к устройствам, файлам, аккаунтам, генерации изображений и аудио. Не заявляй о выполнении таких действий. Не проси ключи, пароли и другие секреты. Честно сообщай о неопределённости.`;

function configuration(env) {
  const token = env.TELEGRAM_BOT_TOKEN || '';
  const key = env.AI_GATEWAY_API_KEY || env.VERCEL_OIDC_TOKEN || '';
  const secret = env.TELEGRAM_WEBHOOK_SECRET || '';
  const owner = env.TELEGRAM_OWNER_ID || '';
  return {
    token, key, secret, owner: Number(owner),
    model: env.AI_GATEWAY_MODEL?.trim() || '',
    ready: /^\d+:[A-Za-z0-9_-]{20,}$/.test(token) &&
      /^[\x21-\x7e]+$/.test(key) && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.:-]+$/.test(env.AI_GATEWAY_MODEL?.trim() || '') && /^[A-Za-z0-9_-]{32,256}$/.test(secret) &&
      /^\d+$/.test(owner) && Number.isSafeInteger(Number(owner)) && Number(owner) > 0,
  };
}

function sameSecret(actual, expected) {
  return typeof actual === 'string' && Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function directReply(text) {
  switch (text.trim().split(/\s+/, 1)[0].split('@')[0].toLowerCase()) {
    case '/start': case '/menu': case '/help':
      return '✨ Dream the Muse · Архитектор 1052\n387 → 1052 → ∞\n\nТексты, песни, идеи, код и творческие практики. Выберите направление или напишите задачу.\n\nЭта облачная версия пока не хранит историю. Изображения и аудио не генерируются. /privacy — о данных.';
    case '/privacy':
      return 'Переписка не сохраняется этим обработчиком. Обычный текст передаётся Vercel AI Gateway и поставщику выбранной модели; Telegram и Vercel обрабатывают технические данные по своим правилам. Не присылайте секреты.';
    case '/reset':
      return 'У этой облачной версии нет постоянной памяти. Это не удаляет сообщения Telegram или данные у поставщиков.';
  }
  if (text === '🌐 Портал') return SITE;
  if (text === '➜ Вектор 387 → 1052 → ∞') {
    return '387 — живой импульс: что я чувствую?\n1052 — структура: какую форму этому придам?\n∞ — континуум: какой следующий шаг сделаю?\n\nЭто художественный канон Dream the Muse, не координаты и не техническая телеметрия.';
  }
  return null;
}

function promptFor(text) {
  return ({
    '/oracle': 'Предложи художественный символ дня и вопрос для размышления. Это игра, не предсказание.',
    '/music': 'Помоги начать работу над песней: спроси тему, настроение и язык.',
    '/art': 'Помоги с визуальной концепцией: спроси тему, цвета и формат.',
    '🕯 Ритуал творчества': 'Предложи одну безопасную творческую практику на 3 минуты.',
    '🔮 Оракул': 'Предложи художественный символ дня и вопрос для размышления. Явно обозначь: это игра, не предсказание.',
    '🎵 Музыка': 'Помоги начать работу над песней: спроси о теме, настроении и языке. Аудио не создаётся.',
    '🎨 Визуал': 'Помоги с визуальной концепцией: спроси о теме, цветах и формате. Изображение не создаётся.',
  })[text] || text;
}

// Dependencies are injectable so tests never contact Telegram or spend AI credit.
export function createHandler({ env = process.env, request = fetch, defer = waitUntil } = {}) {
  async function send(config, chatId, text) {
    for (let offset = 0; offset < text.length; offset += 3000) {
      const response = await request(`https://api.telegram.org/bot${config.token}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: text.slice(offset, offset + 3000), reply_markup: KEYBOARD, link_preview_options: { is_disabled: true } }),
        signal: AbortSignal.timeout(15_000),
      });
      const data = await response.json();
      if (!response.ok || data.ok !== true) throw new Error('telegram_delivery_failed');
    }
  }

  async function processMessage(config, chatId, text) {
    let answer = directReply(text);
    if (!answer) {
      try {
        const response = await request(AI_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${config.key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: CORE }, { role: 'user', content: promptFor(text) }], max_tokens: 1000 }),
          signal: AbortSignal.timeout(45_000),
        });
        if (!response.ok) throw new Error('ai_request_failed');
        const data = await response.json();
        answer = data.choices?.[0]?.message?.content?.trim();
        if (!answer) throw new Error('ai_empty_response');
        // Bound Telegram delivery work even if a provider ignores max_tokens.
        answer = answer.slice(0, 9000);
      } catch {
        console.warn('telegram_bot: ai_unavailable');
        answer = 'Сигнал временно прерван: ИИ не ответил. Проверьте доступ AI Gateway, выбранную модель и баланс. Меню и /start работают без генерации.';
      }
    }
    try { await send(config, chatId, answer); }
    catch { console.warn('telegram_bot: delivery_failed'); }
  }

  return function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const config = configuration(env);
    if (req.method === 'GET') {
      return res.status(config.ready ? 200 : 503).json({ ok: config.ready, service: 'Dream the Muse Telegram webhook', configured: config.ready, memory: 'none' });
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Method not allowed.' });
    }
    if (!config.ready) return res.status(503).json({ error: 'Bot is not configured.' });
    if (!sameSecret(req.headers['x-telegram-bot-api-secret-token'], config.secret)) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
      return res.status(415).json({ error: 'Use application/json.' });
    }
    if (Number(req.headers['content-length']) > MAX_BYTES) return res.status(413).json({ error: 'Request too large.' });
    let update;
    try {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
      const serialized = typeof raw === 'string' ? raw : JSON.stringify(raw ?? {});
      if (Buffer.byteLength(serialized) > MAX_BYTES) return res.status(413).json({ error: 'Request too large.' });
      update = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!update || !Number.isSafeInteger(update.update_id)) throw new Error('invalid');
    } catch { return res.status(400).json({ error: 'Invalid update.' }); }
    const message = update.message;
    if (message?.chat?.type !== 'private' || message.chat.id !== config.owner ||
        message.from?.id !== config.owner || message.from?.is_bot === true) {
      return res.status(200).json({ ok: true });
    }
    const text = typeof message.text === 'string' ? message.text.trim() : '';
    const commandTarget = /^\/[^\s@]+@([^\s]+)/.exec(text)?.[1];
    if (commandTarget && commandTarget.toLowerCase() !== 'dreamthemusedeploy1052_bot') {
      return res.status(200).json({ ok: true });
    }
    if (!text || text.length > 6000) {
      defer(send(config, config.owner, 'Пришлите текст от 1 до 6000 символов.').catch(() => console.warn('telegram_bot: delivery_failed')));
    } else {
      defer(processMessage(config, config.owner, text));
    }
    // ACK promptly. waitUntil is best-effort, not a durable queue or exactly-once delivery.
    return res.status(200).json({ ok: true });
  };
}

export default createHandler();
