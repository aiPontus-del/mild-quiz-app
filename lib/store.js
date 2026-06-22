// Optional durable storage for game rooms.
// If REDIS_URL is set, rooms are mirrored to Redis (e.g. Upstash) so a server
// restart can rehydrate live games. Without it, everything stays in memory.
// MQ_REDIS_MOCK=1 swaps in an in-memory ioredis mock (used by tests).
let client = null;
const useMock = process.env.MQ_REDIS_MOCK === '1';
const REDIS_URL = process.env.REDIS_URL;

if (useMock) {
  try { const Mock = require('ioredis-mock'); client = new Mock(); } catch (e) { console.error('[store] ioredis-mock missing', e.message); }
} else if (REDIS_URL) {
  try {
    const Redis = require('ioredis');
    // tolerate stray quotes/whitespace from copy-paste
    const url = REDIS_URL.trim().replace(/^['"]+|['"]+$/g, '');
    try {
      const u = new URL(url);
      const pw = decodeURIComponent(u.password || '');
      const hint = pw ? (pw.slice(0, 2) + '...' + pw.slice(-2)) : '(empty)';
      const scheme = u.protocol.replace(':', '');
      const user = u.username || '(none)';
      const port = u.port || '(default)';
      console.log('[store] redis config: scheme=' + scheme + ' host=' + u.hostname + ':' + port + ' user=' + user + ' passLen=' + pw.length + ' hint=' + hint);
      if (u.protocol === 'redis:') console.warn('[store] note: URL uses redis:// (no TLS). Upstash needs rediss:// (add an extra s).');
    } catch (e) { console.warn('[store] REDIS_URL is not a valid URL - check for spaces/quotes/missing rediss://'); }
    client = new Redis(url);
    client.on('error', (e) => console.error('[store] redis error', e.message));
    client.on('connect', () => console.log('[store] redis connected ✓'));
  } catch (e) { console.error('[store] ioredis missing — running in-memory only', e.message); }
}

const KEY = (pin) => `mq:room:${pin}`;
const SET = 'mq:rooms';
const TTL = 6 * 3600; // seconds
const QUIZZES = 'mq:quizzes'; // hash: id -> quiz JSON (custom quizzes from /admin)

function serialize(room) {
  return {
    pin: room.pin,
    quizId: room.quiz.id,
    phase: room.phase,
    qIndex: room.qIndex,
    startedAt: room.startedAt || 0,
    endsAt: room.endsAt || 0,
    players: [...room.players.values()].map((p) => ({
      id: p.id, name: p.name, initial: p.initial, color: p.color,
      score: p.score, streak: p.streak, token: p.token, last: p.last || null,
    })),
    answers: [...room.answers.entries()],
    activeQ: room.activeQ || null,
  };
}

module.exports = {
  enabled: !!client,
  label: useMock ? 'mock' : (REDIS_URL ? 'redis' : 'memory'),
  async save(room) {
    if (!client) return;
    try {
      await client.set(KEY(room.pin), JSON.stringify(serialize(room)), 'EX', TTL);
      await client.sadd(SET, room.pin);
    } catch (e) { /* non-fatal */ }
  },
  async remove(pin) {
    if (!client) return;
    try { await client.del(KEY(pin)); await client.srem(SET, pin); } catch (e) {}
  },
  async loadAll() {
    if (!client) return [];
    try {
      const pins = await client.smembers(SET);
      const out = [];
      for (const pin of pins) {
        const raw = await client.get(KEY(pin));
        if (raw) out.push(JSON.parse(raw));
        else await client.srem(SET, pin);
      }
      return out;
    } catch (e) { return []; }
  },

  // ---- durable custom quizzes (created/edited in /admin) ----
  async saveQuiz(quiz) {
    if (!client) return;
    try { await client.hset(QUIZZES, quiz.id, JSON.stringify(quiz)); } catch (e) {}
  },
  async removeQuiz(id) {
    if (!client) return;
    try { await client.hdel(QUIZZES, id); } catch (e) {}
  },
  async loadQuizzes() {
    if (!client) return [];
    try {
      const h = await client.hgetall(QUIZZES);
      return Object.values(h || {}).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean);
    } catch (e) { return []; }
  },
};
