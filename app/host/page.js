'use client';
import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { getSocket } from '@/lib/socketClient';
import { Sound } from '@/lib/sound';
import { HostLobby, HostCountdown, HostPreview, HostQuestion, HostResults, HostWinner } from '@/components/Host';

const iconBtn = { border: '1px solid rgba(0,0,0,.12)', background: '#fff', borderRadius: 999, width: 42, height: 42, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };

function ControlsMenu({ paused, onPause, onUnpause, onSkip, onReveal, onEnd }) {
  const [open, setOpen] = useState(false);
  const item = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', border: 'none', background: 'transparent', padding: '10px 12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', borderRadius: 9, fontFamily: 'inherit', color: '#161616' };
  const act = (fn) => { setOpen(false); fn(); };
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((o) => !o)} aria-label="Värdkontroller" title="Värdkontroller" style={{ ...iconBtn, background: open ? '#161616' : '#fff', color: open ? '#fff' : '#161616' }}>⋯</button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 25 }} />
          <div style={{ position: 'absolute', right: 0, top: 50, zIndex: 26, background: '#fff', borderRadius: 14, boxShadow: '0 18px 50px -20px rgba(0,0,0,.45)', border: '1px solid rgba(0,0,0,.08)', padding: 6, minWidth: 210 }}>
            <button style={item} onClick={() => act(paused ? onUnpause : onPause)}>{paused ? '▶ Återuppta' : '⏸ Pausa'}</button>
            <button style={item} onClick={() => act(onReveal)}>➡ Visa svar</button>
            <button style={item} onClick={() => act(onSkip)}>⏭ Hoppa över</button>
            <div style={{ height: 1, background: 'rgba(0,0,0,.08)', margin: '4px 6px' }} />
            <button style={{ ...item, color: '#C62828' }} onClick={() => act(onEnd)}>⏹ Avsluta spelet</button>
          </div>
        </>
      )}
    </div>
  );
}

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
  const [paused, setPaused] = useState(false);
  const [isFs, setIsFs] = useState(false);
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
    const startOnce = () => { if (!mutedRef.current) Sound.startMusic(); window.removeEventListener('pointerdown', startOnce); };
    window.addEventListener('pointerdown', startOnce);
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);

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
    s.on('room:reset', () => { setPaused(false); setPhase('lobby'); });
    s.on('game:countdown', (d) => { setCount(d.n); setPaused(false); setPhase('countdown'); Sound.tick(); });
    s.on('game:preview', (data) => { setQ(data); setPaused(false); setPhase('preview'); Sound.go(); });
    s.on('game:question', (data) => { setQ(data); setPaused(false); setAnswered({ count: 0, total: pc.current }); setPhase('question'); });
    s.on('game:answered', (a) => setAnswered(a));
    s.on('game:paused', () => setPaused(true));
    s.on('game:resumed', (d) => { setQ((prev) => ({ ...prev, endsAt: d.endsAt })); setPaused(false); });
    s.on('game:results', (r) => { setResults(r); setPaused(false); setPhase('results'); });
    s.on('game:over', (d) => { setPodium(d.podium); setPaused(false); setPhase('winner'); Sound.win(); });

    return () => { window.removeEventListener('pointerdown', startOnce); document.removeEventListener('fullscreenchange', onFs); s.off('connect', onConnect); ['room:players', 'room:quiz', 'room:reset', 'game:countdown', 'game:preview', 'game:question', 'game:answered', 'game:paused', 'game:resumed', 'game:results', 'game:over'].forEach((e) => s.off(e)); };
  }, []);

  useEffect(() => {
    if (phase !== 'question' || paused) { clearInterval(tick.current); return; }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((q.endsAt - Date.now()) / 1000)));
    update();
    tick.current = setInterval(update, 250);
    return () => clearInterval(tick.current);
  }, [phase, q.endsAt, paused]);

  const s = () => getSocket();
  const pickQuiz = (id) => s().emit('host:setQuiz', { quizId: id });
  const start = () => s().emit('host:start');
  const reveal = () => s().emit('host:reveal');
  const next = () => s().emit('host:next');
  const restart = () => s().emit('host:restart');
  const pause = () => s().emit('host:pause');
  const unpause = () => s().emit('host:unpause');
  const skip = () => s().emit('host:skip');
  const endGame = () => { if (confirm('Avsluta spelet och visa vinnaren nu?')) s().emit('host:end'); };
  const resetGame = () => { if (confirm('Nollställa? Alla spelare måste gå med på nytt.')) s().emit('host:reset'); };
  const toggleMute = () => { const m = !muted; setMuted(m); mutedRef.current = m; Sound.setMuted(m); if (!m) Sound.startMusic(); };
  const toggleFs = () => { if (typeof document === 'undefined') return; if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); };

  const resultsQuestion = { text: q.text, type: results.type, choices: results.choices.length ? results.choices : q.choices, correct: results.correct, double: results.double };
  const inGame = phase === 'question' || phase === 'preview' || phase === 'countdown';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 36, position: 'relative', background: 'radial-gradient(1000px 680px at 10% 4%, rgba(0,201,172,.20), transparent 58%), radial-gradient(900px 620px at 92% 96%, rgba(255,174,56,.16), transparent 58%), radial-gradient(760px 560px at 95% 6%, rgba(63,164,245,.14), transparent 60%), radial-gradient(700px 520px at 4% 92%, rgba(126,87,194,.12), transparent 60%), #ECEAE3' }}>
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 20, display: 'flex', gap: 8 }}>
        {inGame && <ControlsMenu paused={paused} onPause={pause} onUnpause={unpause} onSkip={skip} onReveal={reveal} onEnd={endGame} />}
        <button onClick={toggleFs} aria-label="Helskärm" title="Helskärm" style={iconBtn}>{isFs ? '🡼' : '⛶'}</button>
        <button onClick={toggleMute} aria-label="Ljud på/av" title="Ljud på/av" style={iconBtn}>{muted ? '🔇' : '🔊'}</button>
      </div>
      {phase === 'lobby' && <HostLobby pin={pin} joinUrl={joinUrl} qr={qr} players={players} quiz={quiz} quizzes={quizzes} onPickQuiz={pickQuiz} onStart={start} />}
      {phase === 'countdown' && <HostCountdown n={count} />}
      {phase === 'preview' && <HostPreview question={q} qIndex={q.qIndex} total={q.total} />}
      {phase === 'question' && <HostQuestion qIndex={q.qIndex} total={q.total} question={q} timeLeft={timeLeft} timeLimit={q.timeLimit} answeredCount={answered.count} playerCount={players.length} paused={paused} />}
      {phase === 'results' && <HostResults question={resultsQuestion} distribution={results.distribution} leaderboard={results.leaderboard.slice(0, 5)} onNext={next} isLast={results.isLast} />}
      {phase === 'winner' && <HostWinner podium={podium} onRestart={restart} onNewGame={resetGame} />}
    </main>
  );
}
