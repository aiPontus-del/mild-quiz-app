// Shared quiz store (server-side). Bundled quizzes live as JSON files in
// quizzes/ (committed to git, so they survive every rebuild). Quizzes created
// or edited in /admin are stored durably in Redis when REDIS_URL is set
// (custom quizzes override a bundled quiz with the same id). Without Redis we
// fall back to writing JSON files to disk — fine locally, but on an ephemeral
// host those live edits vanish on restart.
const fs = require('fs');
const path = require('path');
const store = require('./store');
const DIR = path.join(process.cwd(), 'quizzes');

function normQuestion(q) {
  return {
    type: q.type || 'single',
    text: q.text,
    choices: q.type === 'truefalse' ? (q.choices || ['Sant', 'Falskt']) : q.choices,
    correct: q.correct,
    timeLimit: q.timeLimit || 20,
    image: q.image || null,
    video: q.video || null,
    double: !!q.double,
  };
}

function readDisk() {
  try {
    return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => {
      try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
      catch (e) { return null; }
    }).filter(Boolean);
  } catch (e) { return []; }
}

function mergeById(disk, custom) {
  const map = new Map();
  disk.forEach((q) => { if (q && q.id) map.set(q.id, q); });
  custom.forEach((q) => { if (q && q.id) map.set(q.id, q); }); // custom overrides bundled
  return [...map.values()];
}

let rawCache = null; // merged raw quizzes
let cache = null;    // merged + normalized quizzes

function rebuild(raw) {
  rawCache = raw;
  cache = raw.map((d) => ({ ...d, questions: (d.questions || []).map(normQuestion) }));
  return cache;
}

// Sync fallback (disk only) — used if something asks for a quiz before the
// first async refresh has run. The async refresh layers Redis on top.
function loadDiskOnly() { return rebuild(readDisk()); }

// Async: read bundled files + durable Redis quizzes and rebuild the cache.
async function refresh() {
  const disk = readDisk();
  let custom = [];
  try { custom = await store.loadQuizzes(); } catch (e) { custom = []; }
  return rebuild(mergeById(disk, custom));
}

function all() { return cache || loadDiskOnly(); }
function get(id) { const a = all(); return a.find((q) => q.id === id) || a[0]; }
function meta() { return all().map((q) => ({ id: q.id, title: q.title, count: q.questions.length })); }
function rawList() { if (!rawCache) loadDiskOnly(); return rawCache.slice().sort((a, b) => (a.title || '').localeCompare(b.title || '')); }
function rawOne(id) { if (!rawCache) loadDiskOnly(); return rawCache.find((q) => q.id === id) || null; }

function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40); }

function validate(quiz) {
  if (!quiz || typeof quiz !== 'object') return 'Ogiltigt quiz';
  if (!quiz.title || !String(quiz.title).trim()) return 'Titel saknas';
  const qs = quiz.questions;
  if (!Array.isArray(qs) || qs.length === 0) return 'Minst en fråga krävs';
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    if (!q.text || !String(q.text).trim()) return `Fråga ${i + 1}: text saknas`;
    const type = q.type || 'single';
    if (type === 'truefalse') {
      if (![0, 1].includes(q.correct)) return `Fråga ${i + 1}: välj Sant eller Falskt`;
    } else {
      if (!Array.isArray(q.choices) || q.choices.length !== 4) return `Fråga ${i + 1}: måste ha 4 alternativ`;
      if (q.choices.some((c) => !String(c).trim())) return `Fråga ${i + 1}: tomt svarsalternativ`;
      if (type === 'multi') {
        if (!Array.isArray(q.correct) || q.correct.length === 0) return `Fråga ${i + 1}: markera minst ett rätt svar`;
        if (q.correct.some((c) => c < 0 || c > 3)) return `Fråga ${i + 1}: ogiltigt rätt svar`;
      } else if (typeof q.correct !== 'number' || q.correct < 0 || q.correct > 3) {
        return `Fråga ${i + 1}: markera ett rätt svar`;
      }
    }
  }
  return null;
}

function cleanQuiz(quiz) {
  const id = slug(quiz.id || quiz.title);
  return {
    id,
    title: String(quiz.title).trim(),
    description: String(quiz.description || '').trim(),
    questions: quiz.questions.map((q) => {
      const type = q.type || 'single';
      const out = { type, text: String(q.text).trim(), timeLimit: Number(q.timeLimit) || 20 };
      if (type === 'truefalse') { out.correct = q.correct; }
      else { out.choices = q.choices.map((c) => String(c).trim()); out.correct = q.correct; }
      if (q.image) out.image = String(q.image).trim();
      if (q.video) out.video = String(q.video).trim();
      if (q.double) out.double = true;
      return out;
    }),
  };
}

async function save(quiz) {
  const err = validate(quiz);
  if (err) return { error: err };
  const clean = cleanQuiz(quiz);
  if (!clean.id) return { error: 'Ogiltigt id' };
  if (store.enabled) {
    await store.saveQuiz(clean);
  } else {
    fs.writeFileSync(path.join(DIR, clean.id + '.json'), JSON.stringify(clean, null, 2), 'utf8');
  }
  await refresh();
  return { ok: true, id: clean.id };
}

async function remove(id) {
  const sid = slug(id);
  let found = false;
  if (store.enabled) { await store.removeQuiz(sid); found = true; }
  const p = path.join(DIR, sid + '.json');
  if (fs.existsSync(p)) { fs.unlinkSync(p); found = true; }
  await refresh();
  return found ? { ok: true } : { error: 'Hittades inte' };
}

module.exports = { DIR, normQuestion, refresh, all, get, meta, rawList, rawOne, save, remove, validate, slug,
  // back-compat: callers that used reload() synchronously still work (disk only);
  // prefer await refresh() to include Redis.
  reload: loadDiskOnly };
