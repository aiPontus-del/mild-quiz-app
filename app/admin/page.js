'use client';
import { useEffect, useState } from 'react';

const SHAPE_COLORS = ['#EF5350', '#3FA4F5', '#FFAE38', '#00BFA5'];
const blankQuestion = () => ({ type: 'single', text: '', choices: ['', '', '', ''], correct: 0, timeLimit: 20, image: '', video: '', double: false });
const blankQuiz = () => ({ id: '', title: '', description: '', questions: [blankQuestion()] });

const label = { fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9A988E' };
const input = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,.14)', fontSize: 15, fontFamily: 'inherit', background: '#fff' };
const btn = { border: 'none', cursor: 'pointer', borderRadius: 12, padding: '12px 20px', fontSize: 15, fontWeight: 800, fontFamily: 'inherit' };
const teal = { ...btn, background: 'linear-gradient(180deg,#00C9AC,#00A58F)', color: '#04211c' };
const ghost = { ...btn, background: '#fff', color: '#161616', border: '1px solid rgba(0,0,0,.14)' };

export default function AdminPage() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadList() {
    const r = await fetch('/api/quizzes'); const d = await r.json();
    setList(d.quizzes || []);
  }
  useEffect(() => { loadList(); }, []);

  async function editQuiz(id) {
    const r = await fetch('/api/quizzes/' + id); const d = await r.json();
    if (!d.quiz) return;
    const q = d.quiz;
    setEditing({
      id: q.id, title: q.title || '', description: q.description || '',
      questions: (q.questions || []).map((x) => ({
        type: x.type || 'single',
        text: x.text || '',
        choices: x.type === 'truefalse' ? ['', '', '', ''] : (x.choices || ['', '', '', '']).concat(['', '', '', '']).slice(0, 4),
        correct: x.correct,
        timeLimit: x.timeLimit || 20,
        image: x.image || '', video: x.video || '', double: !!x.double,
      })),
    });
    setError('');
  }

  function newQuiz() { setEditing(blankQuiz()); setError(''); }

  async function del(id, title) {
    if (!confirm(`Radera quizet "${title}"?`)) return;
    await fetch('/api/quizzes/' + id, { method: 'DELETE' });
    loadList();
  }

  async function save() {
    setSaving(true); setError('');
    const payload = {
      id: editing.id, title: editing.title, description: editing.description,
      questions: editing.questions.map((q) => {
        const out = { type: q.type, text: q.text, timeLimit: Number(q.timeLimit) || 20, double: q.double };
        if (q.image) out.image = q.image;
        if (q.video) out.video = q.video;
        if (q.type === 'truefalse') { out.correct = q.correct === 1 ? 1 : 0; }
        else { out.choices = q.choices; out.correct = q.correct; }
        return out;
      }),
    };
    const r = await fetch('/api/quizzes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await r.json();
    setSaving(false);
    if (d.error) { setError(d.error); return; }
    setEditing(null); loadList();
  }

  // ---- question editing helpers ----
  const setQ = (i, patch) => setEditing((e) => ({ ...e, questions: e.questions.map((q, idx) => idx === i ? { ...q, ...patch } : q) }));
  const setChoice = (i, ci, val) => setEditing((e) => ({ ...e, questions: e.questions.map((q, idx) => idx === i ? { ...q, choices: q.choices.map((c, k) => k === ci ? val : c) } : q) }));
  function changeType(i, type) {
    setEditing((e) => ({ ...e, questions: e.questions.map((q, idx) => {
      if (idx !== i) return q;
      let correct = q.correct;
      if (type === 'multi') correct = Array.isArray(q.correct) ? q.correct : [typeof q.correct === 'number' ? q.correct : 0];
      else if (type === 'truefalse') correct = Array.isArray(q.correct) ? 0 : (q.correct === 1 ? 1 : 0);
      else correct = Array.isArray(q.correct) ? (q.correct[0] ?? 0) : (typeof q.correct === 'number' ? q.correct : 0);
      return { ...q, type, correct };
    }) }));
  }
  const toggleMulti = (i, ci) => setEditing((e) => ({ ...e, questions: e.questions.map((q, idx) => {
    if (idx !== i) return q;
    const arr = Array.isArray(q.correct) ? q.correct : [];
    return { ...q, correct: arr.includes(ci) ? arr.filter((x) => x !== ci) : [...arr, ci] };
  }) }));
  const addQ = () => setEditing((e) => ({ ...e, questions: [...e.questions, blankQuestion()] }));
  const removeQ = (i) => setEditing((e) => ({ ...e, questions: e.questions.filter((_, idx) => idx !== i) }));
  const moveQ = (i, dir) => setEditing((e) => {
    const qs = [...e.questions]; const j = i + dir;
    if (j < 0 || j >= qs.length) return e;
    [qs[i], qs[j]] = [qs[j], qs[i]]; return { ...e, questions: qs };
  });

  return (
    <div style={{ minHeight: '100vh', background: '#E9E7E0', color: '#161616' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 22px', background: '#101010', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>Mild Quiz</span>
          <span style={{ ...label, color: '#00FFD1' }}>Admin · quizhanterare</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/host" style={{ ...ghost, textDecoration: 'none', padding: '8px 14px', fontSize: 13 }}>← Till värdskärmen</a>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '28px 20px 60px' }}>
        {!editing && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>Dina quiz ({list.length})</h1>
              <button style={teal} onClick={newQuiz}>+ Nytt quiz</button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {list.map((q) => (
                <div key={q.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid rgba(0,0,0,.06)' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{q.title}</div>
                    <div style={{ ...label, marginTop: 2 }}>{(q.questions || []).length} frågor · {q.id}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={{ ...ghost, padding: '8px 14px', fontSize: 13 }} onClick={() => editQuiz(q.id)}>Redigera</button>
                    <button style={{ ...ghost, padding: '8px 14px', fontSize: 13, color: '#C62828' }} onClick={() => del(q.id, q.title)}>Radera</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {editing && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>{editing.id ? 'Redigera quiz' : 'Nytt quiz'}</h1>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={ghost} onClick={() => setEditing(null)}>Avbryt</button>
                <button style={{ ...teal, opacity: saving ? .6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Sparar…' : 'Spara quiz'}</button>
              </div>
            </div>

            {error && <div style={{ background: '#FDE7E7', color: '#C62828', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 14 }}>{error}</div>}

            <div style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16, border: '1px solid rgba(0,0,0,.06)' }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <div style={label}>Titel</div>
                  <input style={input} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="t.ex. Filmklassiker" />
                </div>
                <div>
                  <div style={label}>Beskrivning (valfritt)</div>
                  <input style={input} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Kort text som visas i listan" />
                </div>
              </div>
            </div>

            {editing.questions.map((q, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: 18, marginBottom: 12, border: '1px solid rgba(0,0,0,.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ ...label, color: '#00A58F' }}>Fråga {i + 1}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...ghost, padding: '4px 10px', fontSize: 13 }} onClick={() => moveQ(i, -1)}>↑</button>
                    <button style={{ ...ghost, padding: '4px 10px', fontSize: 13 }} onClick={() => moveQ(i, 1)}>↓</button>
                    <button style={{ ...ghost, padding: '4px 10px', fontSize: 13, color: '#C62828' }} onClick={() => removeQ(i)}>Ta bort</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <select value={q.type} onChange={(e) => changeType(i, e.target.value)} style={{ ...input, width: 'auto' }}>
                    <option value="single">Ett rätt svar</option>
                    <option value="truefalse">Sant / Falskt</option>
                    <option value="multi">Flera rätta</option>
                  </select>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <span style={label}>Tid (s)</span>
                    <input type="number" min="5" max="120" value={q.timeLimit} onChange={(e) => setQ(i, { timeLimit: e.target.value })} style={{ ...input, width: 80 }} />
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                    <input type="checkbox" checked={q.double} onChange={(e) => setQ(i, { double: e.target.checked })} /> Dubbla poäng
                  </label>
                </div>

                <input style={{ ...input, marginBottom: 10, fontWeight: 600 }} value={q.text} onChange={(e) => setQ(i, { text: e.target.value })} placeholder="Skriv frågan här…" />

                {q.type === 'truefalse' ? (
                  <div style={{ display: 'flex', gap: 10 }}>
                    {['Sant', 'Falskt'].map((lbl, ci) => (
                      <label key={ci} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', background: ci === 0 ? '#00BFA5' : '#EF5350', opacity: q.correct === ci ? 1 : .55 }}>
                        <input type="radio" name={`c${i}`} checked={q.correct === ci} onChange={() => setQ(i, { correct: ci })} /> {lbl}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {q.choices.map((c, ci) => {
                      const checked = q.type === 'multi' ? (Array.isArray(q.correct) && q.correct.includes(ci)) : q.correct === ci;
                      return (
                        <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 16, height: 16, borderRadius: 4, background: SHAPE_COLORS[ci], flex: 'none' }} />
                          <input style={{ ...input, flex: 1 }} value={c} onChange={(e) => setChoice(i, ci, e.target.value)} placeholder={`Alternativ ${ci + 1}`} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: checked ? '#00A58F' : '#9A988E', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {q.type === 'multi'
                              ? <input type="checkbox" checked={checked} onChange={() => toggleMulti(i, ci)} />
                              : <input type="radio" name={`c${i}`} checked={checked} onChange={() => setQ(i, { correct: ci })} />}
                            rätt
                          </label>
                        </div>
                      );
                    })}
                  </div>
                )}

                <details style={{ marginTop: 10 }}>
                  <summary style={{ ...label, cursor: 'pointer' }}>Bild/video (valfritt)</summary>
                  <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    <input style={input} value={q.image} onChange={(e) => setQ(i, { image: e.target.value })} placeholder="Bild-URL (https://…)" />
                    <input style={input} value={q.video} onChange={(e) => setQ(i, { video: e.target.value })} placeholder="Video-URL (mp4, https://…)" />
                  </div>
                </details>
              </div>
            ))}

            <button style={{ ...ghost, width: '100%', padding: 14 }} onClick={addQ}>+ Lägg till fråga</button>
          </>
        )}
      </main>
    </div>
  );
}
