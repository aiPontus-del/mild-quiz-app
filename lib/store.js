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
  try { const Redis = require('ioredis'); client = new Redis(REDIS_URL); client.on('error', (e) => console.error('[store] redis error', e.message)); }
  catch (e) { console.error('[store] ioredis missing — running in-memory only', e.message); }
}

const KEY = (pin) => `mq:room:${pin}`;
const SET = 'mq:rooms';
const TTL = 6 * 3600; // seconds

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
};
