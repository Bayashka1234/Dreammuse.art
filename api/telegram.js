import { createHash, timingSafeEqual } from 'node:crypto';

const BOT_USERNAME = 'DreamTheMuseDeploy1052_bot';
const SITE_URL = 'https://dreammuse.art';
const MAX_BODY_BYTES = 64_000;

const KEYBOARD = {
  keyboard: [
    [{ text: '🔮 Послание оракула' }],
    [{ text: '🎵 Музыка' }, { text: '🎨 Творчество' }],
    [{ text: '✨ О Dream the Muse' }],
  ],
  resize_keyboard: true,
  is_persistent: true,
};

// Авторские заготовки для развлекательного бота, не предсказания.
const MESSAGES = [
  'Сегодня ищи вдохновение в паузе. Послушай тишину, а затем запиши один звук, который хочется сохранить.',
  'Твоя идея не обязана сразу стать шедевром. Дай ей первые четыре строки — или четыре ноты.',
  'Выбери цвет своего настроения и придумай для него название песни.',
  'Маленький творческий шаг на сегодня: собери три слова, из которых может начаться новая история.',
  'Переслушай любимую мелодию и заметь деталь, которую раньше пропускал. Внимание тоже бывает творчеством.',
  'Не спеши исправлять первый набросок. Иногда его неровность — начало собственного стиля.',
  'Представь, что твой день — обложка альбома. Какие свет, образ и название ты выберешь?',
  'Поймай случайный ритм вокруг себя: шаги, дождь или стук чашки. С него может начаться музыка.',
  'Напиши короткое письмо своей будущей песне. О чём она будет и какое чувство сохранит?',
  'Сегодня можно не завершать, а исследовать. Попробуй непривычное сочетание слов, звуков или красок.',
];

function oracleMessage(chatId) {
  // Стабильный выбор на день (UTC), без базы данных и хранения переписки.
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash('sha256').update(`${chatId}:${day}`).digest();
  return '🔮 Послание оракула\n\n' +
    MESSAGES[hash.readUInt32BE(0) % MESSAGES.length] +
    '\n\nЭто творческая игра для вдохновения, а не предсказание будущего.';
}

function replyFor(text, chatId) {
  const command = text.trim().split(/\s+/, 1)[0].toLowerCase();
  const [name, target] = command.split('@');
  if (name.startsWith('/') && target && target !== BOT_USERNAME.toLowerCase()) return null;
  const action = name.startsWith('/') ? name : text.trim();

  switch (action) {
    case '/start':
    case '/help':
    case '/menu':
      return '✨ Привет! Это Dream the Muse — твой карманный оракул о музыке и творчестве.\n\n' +
        'Выбери кнопку: получи послание для вдохновения или загляни в творческий мир автора.\n\n' +
        'Пока я отвечаю готовыми текстами, без ИИ и свободного диалога. ' +
        'Не присылай личные данные и секреты. /privacy — о данных.';
    case '/oracle':
    case '🔮 Послание оракула':
      return oracleMessage(chatId);
    case '/music':
    case '🎵 Музыка':
      return '🎵 Музыкальный мир Dream the Muse\n\n' +
        `Загляни на сайт автора: ${SITE_URL}\n\n` +
        'Прямые ссылки на треки появятся здесь после добавления автором.';
    case '/art':
    case '🎨 Творчество':
      return '🎨 Творчество Dream the Muse\n\n' +
        `Сайт автора: ${SITE_URL}\n\n` +
        'А пока — маленькая творческая игра: придумай название для своего сегодняшнего настроения.';
    case '/about':
    case '✨ О Dream the Muse':
      return '✨ Dream the Muse — музыка, творчество и развлекательные послания для вдохновения.\n\n' +
        `Творческий мир автора: ${SITE_URL}\n\n` +
        'Этот бот работает без ИИ. Послание выбирается из готовой подборки и остаётся тем же в течение дня (UTC).';
    case '/privacy':
      return 'Этот обработчик не сохраняет историю переписки и не отправляет сообщения ИИ-сервисам. ' +
        'Telegram передаёт ему текст сообщения и идентификатор чата, чтобы доставить ответ. ' +
        'Telegram и платформа хостинга могут обрабатывать технические данные по своим правилам. ' +
        'Не отправляй пароли, ключи и другие секреты.';
    default:
      return 'Я пока не веду свободный диалог, но могу поделиться вдохновением. ' +
        'Нажми «🔮 Послание оракула», «🎵 Музыка» или «🎨 Творчество». /menu — показать меню.';
  }
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret)) {
    return res.status(503).json({ error: 'Bot is not configured.' });
  }

  const supplied = req.headers['x-telegram-bot-api-secret-token'];
  if (
    typeof supplied !== 'string' ||
    Buffer.byteLength(supplied) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))
  ) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) {
    return res.status(415).json({ error: 'Use application/json.' });
  }
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) {
    return res.status(413).json({ error: 'Request too large.' });
  }

  let update;
  try {
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : req.body;
    const serialized = typeof raw === 'string' ? raw : JSON.stringify(raw ?? {});
    if (Buffer.byteLength(serialized) > MAX_BODY_BYTES) {
      return res.status(413).json({ error: 'Request too large.' });
    }
    update = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!update || !Number.isSafeInteger(update.update_id)) throw new Error('Invalid update.');
  } catch {
    return res.status(400).json({ error: 'Invalid update.' });
  }

  const message = update.message;
  // Только личные чаты. Каналы, группы, правки и сообщения ботов игнорируются.
  if (
    message?.chat?.type !== 'private' ||
    !Number.isSafeInteger(message.chat.id) ||
    message.from?.is_bot === true
  ) {
    return res.status(200).json({ ok: true });
  }

  const text = typeof message.text === 'string'
    ? replyFor(message.text, message.chat.id)
    : 'Пока я понимаю только текст и кнопки меню. /menu — открыть меню.';
  if (!text) return res.status(200).json({ ok: true });

  // Telegram выполняет sendMessage из ответа на webhook: исходящий HTTP-запрос
  // и токен бота в работающей функции не нужны. Результат доставки не возвращается.
  return res.status(200).json({
    method: 'sendMessage',
    chat_id: message.chat.id,
    text,
    reply_markup: KEYBOARD,
    link_preview_options: { is_disabled: true },
  });
}
