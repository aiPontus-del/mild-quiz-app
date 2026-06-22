// Custom Node server: Next.js + Socket.IO + in-memory game rooms.
// Optional durability via Redis (set REDIS_URL) so games survive a restart.
const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');
const path = require('path');
const next = require('next');
const { Server } = require('socket.io');
const store = require('./lib/store');

const dev = process.env.NODE_ENV !== 'production';
const port = process.env.PORT || 3000;
const app = next({ dev });
const handle = app.getRequestHandler();

const PREVIEW_MS = 3500;
const HOST_GRACE_MS = 120000;   // keep a room alive this long if the host drops
const PLAYER_GRACE_MS = 60000;  // keep a lobby player this long if they drop

const QZ = require('./lib/quizzes-fs');
const getQuiz = (id) => QZ.get(id);
const quizMeta = () => QZ.meta();

const PALETTE = ['#EF5350', '#3FA4F5', '#FFAE38', '#00BFA5', '#7E57C2'];
const newId = () => Math.random().toString(36).slice(2, 9);
const newToken = () => newId() + newId();
function makePin(rooms) { let pin; do { pin = String(Math.floor(100000 + Math.random() * 900000)); } while (rooms.has(pin)); return pin; }
function colorFor(name) { return PALETTE[(name.charCodeAt(0) + name.length) % PALETTE.length]; }
function basePoints(t, lim) { const f = Math.min(1, Math.max(0, t / lim)); return Math.round(1000 * (1 - f / 2)); }
function isCorrect(answer, q) {
  if (q.type === 'multi') {
    const want = Array.isArray(q.correct) ? q.correct : [q.correct];
    const got = Array.isArray(answer) ? answer : [answer];
    if (got.length !== want.length) return false;
    return [...want].sort().join(',') === [...got].sort().join(',');
  }
  return answer === q.correct;
}
function publicPlayers(room) {
  return [...room.players.values()].map((p) => ({ id: p.id, name: p.name, initial: p.initial, color: p.color, score: p.score, streak: p.streak, connected: p.connected !== false }));
}
function leaderboard(room) { return publicPlayers(room).sort((a, b) => b.score - a.score); }

app.prepare().then(async () => {
  const rooms = new Map();
  const httpServer = createServer((req, res) => handle(req, res, parse(req.url, true)));
  const io = new Server(httpServer);

  const persist = (room) => { store.save(room); };
  const drop = (pin) => { store.remove(pin); };

  function clearRoomTimer(room) {
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    if (room.countdownT) { clearInterval(room.countdownT); room.countdownT = null; }
    if (room.previewT) { clearTimeout(room.previewT); room.previewT = null; }
  }
  function questionPublic(q, qIndex, total, extra) {
    return Object.assign({ qIndex, total, text: q.text, type: q.type, choices: q.choices, image: q.image, video: q.video, double: q.double, timeLimit: q.timeLimit }, extra || {});
  }
  function shuffleArr(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function shuffledQuestion(q) {
    if (q.type === 'truefalse') return { type: q.type, text: q.text, image: q.image, video: q.video, double: q.double, timeLimit: q.timeLimit, choices: q.choices, correct: q.correct };
    const order = shuffleArr([...Array(q.choices.length).keys()]);
    const choices = order.map((i) => q.choices[i]);
    let correct;
    if (q.type === 'multi') { const set = new Set(Array.isArray(q.correct) ? q.correct : [q.correct]); correct = order.map((orig, idx) => (set.has(orig) ? idx : -1)).filter((x) => x >= 0); }
    else { correct = order.indexOf(q.correct); }
    return { type: q.type, text: q.text, image: q.image, video: q.video, double: q.double, timeLimit: q.timeLimit, choices, correct };
  }
  function currentQ(room) { return room.activeQ || room.quiz.questions[room.qIndex]; }
  function resultsSnapshot(room) {
    const q = currentQ(room);
    const dist = q.choices.map(() => 0);
    for (const [id, a] of room.answers.entries()) {
      const sel = Array.isArray(a.answer) ? a.answer : [a.answer];
      sel.forEach((i) => { if (dist[i] != null) dist[i] += 1; });
    }
    return { qIndex: room.qIndex, correct: q.correct, type: q.type, choices: q.choices, distribution: dist, leaderboard: leaderboard(room), isLast: room.qIndex + 1 >= room.quiz.questions.length, double: q.double };
  }

  function startCountdown(room, nextIdx) {
    clearRoomTimer(room);
    room.phase = 'countdown'; room.qIndex = nextIdx;
    let n = 3;
    io.to(room.pin).emit('game:countdown', { n });
    persist(room);
    room.countdownT = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(room.countdownT); room.countdownT = null; startPreview(room); }
      else io.to(room.pin).emit('game:countdown', { n });
    }, 800);
  }
  function startPreview(room) {
    clearRoomTimer(room);
    room.activeQ = shuffledQuestion(room.quiz.questions[room.qIndex]);
    room.phase = 'preview';
    io.to(room.pin).emit('game:preview', questionPublic(room.activeQ, room.qIndex, room.quiz.questions.length));
    persist(room);
    room.previewT = setTimeout(() => startQuestion(room), PREVIEW_MS);
  }
  function startQuestion(room) {
    clearRoomTimer(room);
    const q = currentQ(room);
    room.phase = 'question'; room.answers = new Map(); room.startedAt = Date.now(); room.paused = false;
    room.endsAt = room.startedAt + q.timeLimit * 1000;
    io.to(room.pin).emit('game:question', questionPublic(q, room.qIndex, room.quiz.questions.length, { endsAt: room.endsAt }));
    persist(room);
    room.timer = setTimeout(() => endQuestion(room), q.timeLimit * 1000);
  }
  function endQuestion(room) {
    clearRoomTimer(room);
    if (room.phase !== 'question') return;
    room.phase = 'results';
    const q = currentQ(room);
    const limitMs = q.timeLimit * 1000;
    for (const p of room.players.values()) {
      const a = room.answers.get(p.id);
      if (a && isCorrect(a.answer, q)) {
        const base = basePoints(a.timeMs, limitMs);
        const bonus = Math.min(p.streak, 5) * 100;
        let pts = base + bonus; if (q.double) pts *= 2;
        p.score += pts; p.streak += 1;
        p.last = { correct: true, points: pts, base, bonus, streak: p.streak, double: q.double };
      } else {
        p.streak = 0;
        p.last = { correct: false, points: 0, base: 0, bonus: 0, streak: 0, double: q.double };
      }
    }
    const snap = resultsSnapshot(room);
    io.to(room.pin).emit('game:results', snap);
    for (const p of room.players.values()) {
      const rank = 1 + snap.leaderboard.filter((x) => x.score > p.score).length;
      if (p.socketId) io.to(p.socketId).emit('you:result', Object.assign({ score: p.score, rank }, p.last));
    }
    persist(room);
  }
  function endGame(room) {
    clearRoomTimer(room);
    room.phase = 'winner';
    io.to(room.pin).emit('game:over', { podium: leaderboard(room).slice(0, 3) });
    persist(room);
  }

  function emitCurrentToHost(socket, room) {
    socket.emit('room:players', { players: publicPlayers(room) });
    const q = currentQ(room);
    if (room.phase === 'preview') socket.emit('game:preview', questionPublic(q, room.qIndex, room.quiz.questions.length));
    else if (room.phase === 'question') { socket.emit('game:question', questionPublic(q, room.qIndex, room.quiz.questions.length, { endsAt: room.endsAt })); socket.emit('game:answered', { count: room.answers.size, total: room.players.size }); }
    else if (room.phase === 'results') socket.emit('game:results', resultsSnapshot(room));
    else if (room.phase === 'winner') socket.emit('game:over', { podium: leaderboard(room).slice(0, 3) });
  }
  function emitCurrentToPlayer(socket, room, player) {
    const q = currentQ(room);
    if (room.phase === 'preview') socket.emit('game:preview', questionPublic(q, room.qIndex, room.quiz.questions.length));
    else if (room.phase === 'question') { socket.emit('game:question', questionPublic(q, room.qIndex, room.quiz.questions.length, { endsAt: room.endsAt })); if (room.answers.has(player.id)) socket.emit('you:locked'); }
    else if (room.phase === 'results') { const lb = leaderboard(room); const rank = 1 + lb.filter((x) => x.score > player.score).length; socket.emit('you:result', Object.assign({ score: player.score, rank }, player.last || { correct: false, points: 0 })); }
    else if (room.phase === 'winner') socket.emit('game:over', { podium: leaderboard(room).slice(0, 3) });
  }

  function scheduleHostGrace(room) {
    if (room.hostGraceT) clearTimeout(room.hostGraceT);
    room.hostGraceT = setTimeout(() => {
      if (!room.hostConnected) { clearRoomTimer(room); io.to(room.pin).emit('host:left'); rooms.delete(room.pin); drop(room.pin); }
    }, HOST_GRACE_MS);
  }

  // load bundled + durable (Redis) quizzes before serving
  try { await QZ.refresh(); } catch (e) { console.error('[quizzes] initial load failed', e.message); }

  // ---- rehydrate from Redis on boot ----
  try {
    const saved = await store.loadAll();
    for (const s of saved) {
      const quiz = getQuiz(s.quizId);
      const players = new Map();
      (s.players || []).forEach((p) => players.set(p.id, Object.assign({}, p, { socketId: null, connected: false })));
      const room = { pin: s.pin, quiz, hostSocketId: null, hostConnected: false, phase: s.phase, qIndex: s.qIndex || 0, players, answers: new Map(s.answers || []), startedAt: s.startedAt || 0, endsAt: s.endsAt || 0, activeQ: s.activeQ || null, timer: null, countdownT: null, previewT: null, hostGraceT: null };
      rooms.set(room.pin, room);
      scheduleHostGrace(room);
      const now = Date.now();
      if (room.phase === 'question') {
        if (room.endsAt > now + 300) room.timer = setTimeout(() => endQuestion(room), room.endsAt - now);
        else endQuestion(room);
      } else if (room.phase === 'countdown' || room.phase === 'preview') {
        startPreview(room);
      }
    }
    if (saved.length) console.log(`[store] rehydrated ${saved.length} room(s) from ${store.label}`);
  } catch (e) { console.error('[store] rehydrate failed', e.message); }

  io.on('connection', (socket) => {
    socket.data = { pin: null, role: null, playerId: null };

    socket.on('host:create', async ({ quizId } = {}, cb) => {
      await QZ.refresh();
      const pin = makePin(rooms);
      const room = { pin, quiz: getQuiz(quizId), hostSocketId: socket.id, hostConnected: true, phase: 'lobby', qIndex: 0, players: new Map(), answers: new Map(), startedAt: 0, endsAt: 0, timer: null, countdownT: null, previewT: null, hostGraceT: null };
      rooms.set(pin, room);
      socket.join(pin); socket.data.pin = pin; socket.data.role = 'host';
      persist(room);
      cb && cb({ ok: true, pin, quizzes: quizMeta(), quiz: { id: room.quiz.id, title: room.quiz.title } });
    });

    socket.on('host:resume', async ({ pin } = {}, cb) => {
      const room = rooms.get(String(pin || '').trim());
      if (!room) return cb && cb({ ok: false });
      await QZ.refresh();
      room.hostSocketId = socket.id; room.hostConnected = true;
      if (room.hostGraceT) { clearTimeout(room.hostGraceT); room.hostGraceT = null; }
      socket.join(room.pin); socket.data.pin = room.pin; socket.data.role = 'host';
      cb && cb({ ok: true, pin: room.pin, quizzes: quizMeta(), quiz: { id: room.quiz.id, title: room.quiz.title }, phase: room.phase });
      emitCurrentToHost(socket, room);
    });

    socket.on('host:setQuiz', async ({ quizId }) => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.phase !== 'lobby') return;
      await QZ.refresh();
      room.quiz = getQuiz(quizId);
      io.to(room.pin).emit('room:quiz', { id: room.quiz.id, title: room.quiz.title });
      persist(room);
    });

    socket.on('host:start', async () => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.players.size === 0) return;
      // pull the latest saved version of the selected quiz so /admin edits take effect
      await QZ.refresh();
      const fresh = getQuiz(room.quiz && room.quiz.id);
      if (fresh) { room.quiz = fresh; io.to(room.pin).emit('room:quiz', { id: fresh.id, title: fresh.title }); }
      for (const p of room.players.values()) { p.score = 0; p.streak = 0; }
      startCountdown(room, 0);
    });
    socket.on('host:reveal', () => { const room = rooms.get(socket.data.pin); if (room && room.phase === 'question') endQuestion(room); });
    socket.on('host:pause', () => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.phase !== 'question' || room.paused) return;
      room.paused = true;
      room.pausedRemaining = Math.max(0, room.endsAt - Date.now());
      room.pausedElapsed = Math.max(0, Date.now() - room.startedAt);
      if (room.timer) { clearTimeout(room.timer); room.timer = null; }
      io.to(room.pin).emit('game:paused');
      persist(room);
    });
    socket.on('host:unpause', () => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.phase !== 'question' || !room.paused) return;
      room.paused = false;
      room.startedAt = Date.now() - (room.pausedElapsed || 0);
      room.endsAt = Date.now() + (room.pausedRemaining || 0);
      room.timer = setTimeout(() => endQuestion(room), room.pausedRemaining || 0);
      io.to(room.pin).emit('game:resumed', { endsAt: room.endsAt });
      persist(room);
    });
    socket.on('host:skip', () => {
      const room = rooms.get(socket.data.pin);
      if (!room || (room.phase !== 'question' && room.phase !== 'preview' && room.phase !== 'countdown')) return;
      clearRoomTimer(room); room.paused = false;
      if (room.qIndex + 1 >= room.quiz.questions.length) endGame(room);
      else startCountdown(room, room.qIndex + 1);
    });
    socket.on('host:end', () => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.phase === 'lobby' || room.phase === 'winner') return;
      endGame(room);
    });
    socket.on('host:reset', () => {
      const room = rooms.get(socket.data.pin);
      if (!room) return;
      clearRoomTimer(room); room.paused = false;
      room.hostSocketId = socket.id; room.hostConnected = true;
      room.players = new Map(); room.answers = new Map(); room.qIndex = 0; room.phase = 'lobby';
      io.to(room.pin).emit('room:cleared');
      io.to(room.pin).emit('room:players', { players: [] });
      socket.emit('room:reset'); // straight to the host that requested it
      persist(room);
    });
    socket.on('host:next', () => {
      const room = rooms.get(socket.data.pin);
      if (!room || room.phase !== 'results') return;
      if (room.qIndex + 1 >= room.quiz.questions.length) endGame(room); else startCountdown(room, room.qIndex + 1);
    });
    socket.on('host:restart', () => {
      const room = rooms.get(socket.data.pin);
      if (!room) return;
      clearRoomTimer(room);
      room.phase = 'lobby'; room.qIndex = 0; room.answers = new Map();
      for (const p of room.players.values()) { p.score = 0; p.streak = 0; }
      io.to(room.pin).emit('room:reset');
      io.to(room.pin).emit('room:players', { players: publicPlayers(room) });
      persist(room);
    });

    socket.on('player:join', ({ pin, name }, cb) => {
      const room = rooms.get(String(pin || '').trim());
      if (!room) return cb && cb({ error: 'Fel PIN — kolla storbilden' });
      if (room.phase !== 'lobby') return cb && cb({ error: 'Spelet har redan börjat' });
      const clean = String(name || '').trim().slice(0, 18);
      if (!clean) return cb && cb({ error: 'Skriv ett smeknamn' });
      if ([...room.players.values()].some((p) => p.name.toLowerCase() === clean.toLowerCase())) return cb && cb({ error: 'Namnet är taget' });
      const id = newId(); const token = newToken();
      room.players.set(id, { id, name: clean, initial: clean[0].toUpperCase(), color: colorFor(clean), score: 0, streak: 0, token, socketId: socket.id, connected: true });
      socket.join(room.pin); socket.data.pin = room.pin; socket.data.role = 'player'; socket.data.playerId = id;
      persist(room);
      cb && cb({ ok: true, playerId: id, token, name: clean });
      io.to(room.pin).emit('room:players', { players: publicPlayers(room) });
    });

    socket.on('player:rejoin', ({ pin, token }, cb) => {
      const room = rooms.get(String(pin || '').trim());
      if (!room) return cb && cb({ error: 'Spelet finns inte längre' });
      const player = [...room.players.values()].find((p) => p.token === token);
      if (!player) return cb && cb({ error: 'Kunde inte återansluta' });
      if (player.removeT) { clearTimeout(player.removeT); player.removeT = null; }
      player.socketId = socket.id; player.connected = true;
      socket.join(room.pin); socket.data.pin = room.pin; socket.data.role = 'player'; socket.data.playerId = player.id;
      cb && cb({ ok: true, name: player.name });
      io.to(room.pin).emit('room:players', { players: publicPlayers(room) });
      emitCurrentToPlayer(socket, room, player);
    });

    socket.on('player:answer', ({ answer }) => {
      const room = rooms.get(socket.data.pin);
      const id = socket.data.playerId;
      if (!room || room.phase !== 'question' || room.paused || !id) return;
      if (room.answers.has(id)) return;
      room.answers.set(id, { answer, timeMs: Date.now() - room.startedAt });
      socket.emit('you:locked');
      if (room.hostSocketId) io.to(room.hostSocketId).emit('game:answered', { count: room.answers.size, total: room.players.size });
      persist(room);
      if (room.answers.size >= room.players.size && room.players.size > 0) endQuestion(room);
    });

    socket.on('disconnect', () => {
      const room = rooms.get(socket.data.pin);
      if (!room) return;
      if (socket.data.role === 'player' && socket.data.playerId) {
        const player = room.players.get(socket.data.playerId);
        if (player) {
          player.connected = false; player.socketId = null;
          if (room.phase === 'lobby') {
            player.removeT = setTimeout(() => {
              if (!player.connected) { room.players.delete(player.id); io.to(room.pin).emit('room:players', { players: publicPlayers(room) }); persist(room); }
            }, PLAYER_GRACE_MS);
          }
          io.to(room.pin).emit('room:players', { players: publicPlayers(room) });
          persist(room);
        }
      } else if (socket.data.role === 'host') {
        room.hostConnected = false; room.hostSocketId = null;
        scheduleHostGrace(room);
      }
    });
  });

  httpServer.listen(port, () => console.log(`> Mild Quiz on http://localhost:${port} [storage: ${store.label}]`));
});
