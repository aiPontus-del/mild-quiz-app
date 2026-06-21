'use client';
import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSocket } from '@/lib/socketClient';
import { Sound } from '@/lib/sound';
import { PlayerJoin, PlayerWaiting, PlayerPreview, PlayerAnswer, PlayerFeedback } from '@/components/Player';

function PlayerInner() {
  const search = useSearchParams();
  const initialPin = search.get('pin') || '';
  const [phase, setPhase] = useState('join'); // join|waiting|preview|question|results|over
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [q, setQ] = useState({ qIndex: 0, total: 0, endsAt: 0, timeLimit: 20, type: 'single', choices: [], double: false });
  const [timeLeft, setTimeLeft] = useState(0);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState({ correct: false, points: 0, bonus: 0, streak: 0, double: false, score: 0, rank: 1 });
  const tick = useRef(null);
  const session = useRef(null); // { pin, token, name }

  function saveSession(sess) { session.current = sess; try { localStorage.setItem('mq_player', JSON.stringify(sess)); } catch (e) {} }
  function clearSession() { session.current = null; try { localStorage.removeItem('mq_player'); } catch (e) {} }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { const raw = localStorage.getItem('mq_player'); if (raw) session.current = JSON.parse(raw); } catch (e) {}
    }
    const s = getSocket();
    const onConnect = () => {
      const sess = session.current;
      if (sess && sess.token) {
        s.emit('player:rejoin', { pin: sess.pin, token: sess.token }, (res) => {
          if (res && res.ok) { setName(res.name); setError(''); setPhase('waiting'); }
          else { clearSession(); setPhase('join'); }
        });
      }
    };
    if (s.connected) onConnect(); else s.on('connect', onConnect);

    s.on('game:countdown', () => setPhase('waiting'));
    s.on('game:preview', (data) => { setQ(data); setLocked(false); setPhase('preview'); });
    s.on('game:question', (data) => { setQ(data); setPhase('question'); });
    s.on('you:locked', () => setLocked(true));
    s.on('you:result', (r) => { setResult(r); setPhase('results'); (r.correct ? Sound.correct() : Sound.wrong()); });
    s.on('game:over', () => setPhase('over'));
    s.on('room:reset', () => { setLocked(false); setPhase('waiting'); });
    s.on('host:left', () => { clearSession(); setError('Värden avslutade spelet'); setPhase('join'); });
    return () => { s.off('connect', onConnect); ['game:countdown', 'game:preview', 'game:question', 'you:locked', 'you:result', 'game:over', 'room:reset', 'host:left'].forEach((e) => s.off(e)); };
  }, []);


  useEffect(() => {
    if (phase !== 'question') { clearInterval(tick.current); return; }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((q.endsAt - Date.now()) / 1000)));
    update();
    tick.current = setInterval(update, 250);
    return () => clearInterval(tick.current);
  }, [phase, q.endsAt]);

  function join(pin, nm) {
    getSocket().emit('player:join', { pin, name: nm }, (res) => {
      if (res && res.error) { setError(res.error); return; }
      setError(''); setName(res.name); setLocked(false); setPhase('waiting'); Sound.tick();
      saveSession({ pin: String(pin).trim(), token: res.token, name: res.name });
    });
  }

  function submit(answer) {
    if (locked) return;
    setLocked(true); Sound.tick();
    getSocket().emit('player:answer', { answer });
  }

  if (phase === 'join') return <Center><PlayerJoin onJoin={join} error={error} initialPin={initialPin} /></Center>;
  if (phase === 'waiting') return <Center><PlayerWaiting name={name} /></Center>;
  if (phase === 'preview') return <Center><PlayerPreview qIndex={q.qIndex} total={q.total} double={q.double} /></Center>;
  if (phase === 'question') return <Center><PlayerAnswer qLabel={`Fråga ${q.qIndex + 1} · ${name}`} timeLeft={timeLeft} locked={locked} type={q.type} choiceCount={q.choices.length} choices={q.choices} double={q.double} onSubmit={submit} /></Center>;
  if (phase === 'results') return <Center><PlayerFeedback correct={result.correct} points={result.points} bonus={result.bonus} streak={result.streak} double={result.double} score={result.score} rank={result.rank} /></Center>;
  if (phase === 'over') return <Center><PlayerWaiting name={name} title="Spelet är slut" subtitle="Tack för att du spelade! Kolla storbilden för vinnaren." /></Center>;
  return null;
}

export default function PlayerPage() {
  return <Suspense fallback={null}><PlayerInner /></Suspense>;
}

function Center({ children }) {
  return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>{children}</main>;
}
