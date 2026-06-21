// Shared quiz file store (server-side). Used by both the game server and the
// admin API so edits made in /admin are picked up by new games.
const fs = require('fs');
const path = require('path');
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

function readRaw() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => {
    try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); }
    catch (e) { return null; }
  }).filter(Boolean);
}

let cache = null;
function load() { cache = readRaw().map((d) => ({ ...d, questions: (d.questions || []).map(normQuestion) })); return cache; }
function all() { return cache || load(); }
function reload() { return load(); }
function get(id) { const a = all(); return a.find((q) => q.id === id) || a[0]; }
function meta() { return all().map((q) => ({ id: q.id, title: q.title, count: q.questions.length })); }
function rawList() { return readRaw().sort((a, b) => (a.title || '').localeCompare(b.title || '')); }
function rawOne(id) { return readRaw().find((q) => q.id === id) || null; }

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

function save(quiz) {
  const err = validate(quiz);
  if (err) return { error: err };
  let id = slug(quiz.id || quiz.title);
  if (!id) return { error: 'Ogiltigt id' };
  const clean = {
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
  fs.writeFileSync(path.join(DIR, id + '.json'), JSON.stringify(clean, null, 2), 'utf8');
  reload();
  return { ok: true, id };
}

function remove(id) {
  const p = path.join(DIR, slug(id) + '.json');
  if (fs.existsSync(p)) { fs.unlinkSync(p); reload(); return { ok: true }; }
  return { error: 'Hittades inte' };
}

module.exports = { DIR, normQuestion, all, reload, get, meta, rawList, rawOne, save, remove, validate, slug };
