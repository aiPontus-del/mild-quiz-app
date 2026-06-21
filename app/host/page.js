'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getSocket } from '@/lib/socketClient';
import { Sound } from '@/lib/sound';
import { HostLobby, HostCountdown, HostPreview, HostQuestion, HostResults, HostWinner } from '@/components/Host';

export default function HostPage() {
  const [pin, setPin] = useState('······');
  const [qr, setQr] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [quiz, setQuiz] = useState({ id: '', title: '' });
  const [players, setPlayers] = useState([]);
  const [phase, setPhase] = useState('lobby');
  const [count, setCount] = useState(3);
  const [q, setQ] = useState({ qIndex: 0, total: 0, text: '', choices: [], type: 'single', timeLimit: 20, endsAt: 0, image: null, video: null, double: false });
  const [timeLeft, setTimeLeft] = useState(0);
  const [answered, setAnswered] = useState({ count: 0, total: 0 });
  const [results, setResults] = useState({ correct: 0, type: 'single', choices: [], distribution: [0, 0, 0, 0], leaderboard: [], isLast: false, double: false });
  const [podium, setPodium] = useState([]);
  const [joinUrl, setJoinUrl] = useState('…');
  const [muted, setMuted] = useState(false);
  const tick = useRef(null);
  const pinRef = useRef(null);
  const mutedRef = useRef(false);
  const pc = useRef(0); pc.current = players.length;

  function makeQr(p) {
    if (typeof window === 'undefined') return;
    QRCode.toDataURL(`${window.location.origin}/?pin=${p}`, { margin: 1, width: 220 }).then(setQr).catch(() => {});
  }
  function applyMeta(res) {
    setPin(res.pin); setQuizzes(res.quizzes); setQuiz(res.quiz); makeQr(res.pin);
    pinRef.current = res.pin;
    try { localStorage.setItem('mq_host', res.pin); } catch (e) {}
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setJoinUrl(window.location.host);
      try { pinRef.current = localStorage.getItem('mq_host'); } catch (e) {}
    }
    // start background music on first interaction (browsers block autoplay)
    const startOnce = () => { if (!mutedRef.current) Sound.startMusic(); window.removeEventListener('pointerdown', startOnce); };
    window.addEventListener('pointerdown', startOnce);

    const s = getSocket();
    const onConnect = () => {
      if (pinRef.current) {
        s.emit('host:resume', { pin: pinRef.current }, (res) => {
          if (res && res.ok) applyMeta(res);
          else s.emit('host:create', {}, (r) => r && r.ok && applyMeta(r));
        });
      } else {
        s.emit('host:create', {}, (r) => r && r.ok && applyMeta(r));
      }
    };
    if (s.connected) onConnect(); else s.on('connect', onConnect);

    s.on('room:players', (d) => setPlayers(d.players));
    s.on('room:quiz', (qz) => setQuiz(qz));
    s.on('room:reset', () => setPhase('lobby'));
    s.on('game:countdown', (d) => { setCount(d.n); setPhase('countdown'); Sound.tick(); });
    s.on('game:preview', (data) => { setQ(data); setPhase('preview'); Sound.go(); });
    s.on('game:question', (data) => { setQ(data); setAnswered({ count: 0, total: pc.current }); setPhase('question'); });
    s.on('game:answered', (a) => setAnswered(a));
    s.on('game:results', (r) => { setResults(r); setPhase('results'); });
    s.on('game:over', (d) => { setPodium(d.podium); setPhase('winner'); Sound.win(); });

    return () => { window.removeEventListener('pointerdown', startOnce); s.off('connect', onConnect); ['room:players', 'room:quiz', 'room:reset', 'game:countdown', 'game:preview', 'game:question', 'game:answered', 'game:results', 'game:over'].forEach((e) => s.off(e)); };
  }, []);

  useEffect(() => {
    if (phase !== 'question') { clearInterval(tick.current); return; }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((q.endsAt - Date.now()) / 1000)));
    update();
    tick.current = setInterval(update, 250);
    return () => clearInterval(tick.current);
  }, [phase, q.endsAt]);

  const s = () => getSocket();
  const pickQuiz = (id) => s().emit('host:setQuiz', { quizId: id });
  const start = () => s().emit('host:start');
  const reveal = () => s().emit('host:reveal');
  const next = () => s().emit('host:next');
  const restart = () => s().emit('host:restart');
  const toggleMute = () => {
    const m = !muted; setMuted(m); mutedRef.current = m; Sound.setMuted(m);
    if (!m) Sound.startMusic();
  };

  const resultsQuestion = { text: q.text, type: results.type, choices: results.choices.length ? results.choices : q.choices, correct: results.correct, double: results.double };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, position: 'relative' }}>
      <button onClick={toggleMute} aria-label="Ljud på/av"
        style={{ position: 'fixed', top: 16, right: 16, zIndex: 20, border: '1px solid rgba(0,0,0,.12)', background: '#fff', borderRadius: 999, width: 42, height: 42, fontSize: 18, cursor: 'pointer' }}>
        {muted ? '🔇' : '🔊'}
      </button>
      {phase === 'lobby' && <HostLobby pin={pin} joinUrl={joinUrl} qr={qr} players={players} quiz={quiz} quizzes={quizzes} onPickQuiz={pickQuiz} onStart={start} />}
      {phase === 'countdown' && <HostCountdown n={count} />}
      {phase === 'preview' && <HostPreview question={q} qIndex={q.qIndex} total={q.total} />}
      {phase === 'question' && <HostQuestion qIndex={q.qIndex} total={q.total} question={q} timeLeft={timeLeft} timeLimit={q.timeLimit} answeredCount={answered.count} playerCount={players.length} onReveal={reveal} />}
      {phase === 'results' && <HostResults question={resultsQuestion} distribution={results.distribution} leaderboard={results.leaderboard.slice(0, 5)} onNext={next} isLast={results.isLast} />}
      {phase === 'winner' && <HostWinner podium={podium} onRestart={restart} />}
    </main>
  );
}
