'use client';
import { useState, useEffect } from 'react';
import { Phone, Shape } from './ui';
import { SHAPES } from '@/lib/game';

export function PlayerJoin({ onJoin, error, initialPin }) {
  const [pin, setPin] = useState(initialPin || '');
  const [name, setName] = useState('');
  useEffect(() => { if (initialPin) setPin(initialPin); }, [initialPin]);
  return (
    <Phone bg="#101010">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 26px', color: '#fff', gap: 18 }}>
        <div style={{ textAlign: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-.02em' }}>Mild Quiz</div>
          <div className="mono" style={{ fontSize: 11, color: '#00FFD1', letterSpacing: '.14em', textTransform: 'uppercase', marginTop: 4 }}>Häng med på storbilden</div>
        </div>
        <div className="qz-in">
          <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" placeholder="Spel-PIN"
            style={{ width: '100%', padding: '16px 18px', borderRadius: 16, border: 'none', fontSize: 20, fontWeight: 700, letterSpacing: '.12em', textAlign: 'center', marginBottom: 12 }} />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Smeknamn" maxLength={18}
            style={{ width: '100%', padding: '16px 18px', borderRadius: 16, border: 'none', fontSize: 18, fontWeight: 600, textAlign: 'center' }} />
        </div>
        {error && <div style={{ background: 'rgba(239,83,80,.15)', color: '#ff8a87', borderRadius: 12, padding: '10px 14px', fontSize: 14, textAlign: 'center' }}>{error}</div>}
        <button onClick={() => onJoin(pin, name)}
          style={{ marginTop: 4, border: 'none', cursor: 'pointer', background: 'linear-gradient(180deg,#00C9AC,#00A58F)', color: '#04211c', borderRadius: 16, padding: 18, fontSize: 19, fontWeight: 800 }}>
          Gå med →
        </button>
      </div>
    </Phone>
  );
}

export function PlayerWaiting({ name, title, subtitle }) {
  return (
    <Phone bg="#101010">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, color: '#fff', textAlign: 'center' }}>
        <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(158deg,#00C9AC,#00997F)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38, fontWeight: 900, marginBottom: 22, animation: 'qzPop .5s ease both' }}>{name?.[0]?.toUpperCase() || '✓'}</div>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px' }}>{title || `Du är med, ${name}!`}</h1>
        <p style={{ opacity: .75, fontSize: 15 }}>{subtitle || 'Titta på storbilden — spelet börjar snart.'}</p>
        <div className="mono" style={{ marginTop: 24, display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FFD1', animation: `qzBlink 1.2s ${i * .2}s infinite` }} />)}
        </div>
      </div>
    </Phone>
  );
}

export function PlayerPreview({ qIndex, total, double }) {
  return (
    <Phone bg="#101010">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, color: '#fff', textAlign: 'center' }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: '#00FFD1' }}>Fråga {qIndex + 1} / {total}</div>
        {double && <div className="mono" style={{ marginTop: 14, fontSize: 12, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#3a2600', background: '#FFAE38', padding: '6px 12px', borderRadius: 999 }}>×2 Dubbla poäng</div>}
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: '20px 0 8px' }}>Gör dig redo</h1>
        <p style={{ opacity: .75, fontSize: 15 }}>Läs frågan på storbilden…</p>
      </div>
    </Phone>
  );
}

function Header({ qLabel, timeLeft, double }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px 14px' }}>
      <span className="mono" style={{ fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: '#7C7C7C' }}>{qLabel}{double ? ' · ×2' : ''}</span>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: '#00FFD1' }}>⏱ {timeLeft}s</span>
    </div>
  );
}

function Locked() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', textAlign: 'center', gap: 14 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,255,209,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>✓</div>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Svar låst</h2>
      <p className="mono" style={{ color: '#7C7C7C', fontSize: 12 }}>Väntar på de andra spelarna…</p>
    </div>
  );
}

export function PlayerAnswer({ qLabel, timeLeft, locked, type, choiceCount, choices, double, onSubmit }) {
  const [sel, setSel] = useState([]);
  useEffect(() => { setSel([]); }, [qLabel]);

  if (type === 'truefalse') {
    return (
      <Phone>
        <div style={{ padding: '40px 16px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Header qLabel={qLabel} timeLeft={timeLeft} double={double} />
          {locked ? <Locked /> : (
            <div style={{ flex: 1, display: 'grid', gridTemplateRows: '1fr 1fr', gap: 12 }}>
              {[0, 1].map((i) => (
                <button key={i} onClick={() => onSubmit(i)}
                  style={{ border: 'none', cursor: 'pointer', borderRadius: 22, background: i === 0 ? '#00BFA5' : '#EF5350', color: '#fff', fontSize: 30, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <span style={{ fontSize: 34 }}>{i === 0 ? '✓' : '✕'}</span>{(choices && choices[i]) || (i === 0 ? 'Sant' : 'Falskt')}
                </button>
              ))}
            </div>
          )}
        </div>
      </Phone>
    );
  }

  const multi = type === 'multi';
  const n = choiceCount || 4;
  const toggle = (i) => setSel((s) => s.includes(i) ? s.filter((x) => x !== i) : [...s, i]);
  return (
    <Phone>
      <div style={{ padding: '40px 16px 16px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Header qLabel={qLabel} timeLeft={timeLeft} double={double} />
        {locked ? <Locked /> : (
          <>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12 }}>
              {Array.from({ length: n }).map((_, i) => {
                const on = sel.includes(i);
                return (
                  <button key={i} onClick={() => (multi ? toggle(i) : onSubmit(i))}
                    style={{ border: multi && on ? '4px solid #fff' : '4px solid transparent', cursor: 'pointer', borderRadius: 22, background: SHAPES[i].color, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', opacity: multi && !on ? 0.82 : 1 }}>
                    <Shape index={i} size={56} />
                    {multi && on && <span style={{ position: 'absolute', top: 8, right: 10, fontSize: 18, color: '#fff' }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {multi && (
              <button onClick={() => sel.length && onSubmit(sel)} disabled={!sel.length}
                style={{ marginTop: 12, border: 'none', cursor: 'pointer', background: '#00BFA5', color: '#04211c', borderRadius: 16, padding: 16, fontSize: 17, fontWeight: 800, opacity: sel.length ? 1 : 0.4 }}>
                Skicka svar ({sel.length})
              </button>
            )}
          </>
        )}
        <div className="mono" style={{ textAlign: 'center', fontSize: 11, color: '#5C5C5C', paddingTop: 12 }}>
          {multi ? 'Välj alla rätta och skicka' : 'Tryck på formen som matchar skärmen'}
        </div>
      </div>
    </Phone>
  );
}

export function PlayerFeedback({ correct, points, bonus, streak, double, score, rank }) {
  const bg = correct ? 'linear-gradient(160deg,#00C9AC,#00997F)' : 'linear-gradient(160deg,#EF5350,#C62828)';
  return (
    <Phone bg={bg}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 30px', color: '#fff' }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 900, marginBottom: 20, animation: 'qzPop .5s ease both' }}>{correct ? '✓' : '✕'}</div>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-.03em', margin: '0 0 6px' }}>{correct ? 'Rätt!' : 'Tyvärr'}</h1>
        <div className="mono" style={{ fontSize: 42, fontWeight: 700, marginBottom: 8 }}>{correct ? `+${points}` : '+0'}</div>
        {correct && (bonus > 0 || double) && (
          <div className="mono" style={{ fontSize: 12, opacity: .95, marginBottom: 18 }}>
            {streak > 1 && <span>🔥 {streak} i rad · +{bonus} bonus</span>}{streak > 1 && double && ' · '}{double && <span>×2 dubbla poäng</span>}
          </div>
        )}
        <div style={{ background: 'rgba(0,0,0,.18)', borderRadius: 18, padding: '16px 26px', display: 'flex', gap: 30, marginTop: 6 }}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .8 }}>Poäng</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{score}</div>
          </div>
          <div style={{ width: 1, background: 'rgba(255,255,255,.25)' }} />
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .8 }}>Placering</div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{rank}</div>
          </div>
        </div>
        <p style={{ marginTop: 22, fontSize: 15, opacity: .9 }}>Väntar på nästa fråga…</p>
      </div>
    </Phone>
  );
}
