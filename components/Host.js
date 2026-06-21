'use client';
import { useState } from 'react';
import { Card, Shape, Tag, Media, DoubleBadge } from './ui';
import { SHAPES } from '@/lib/game';

const accentBtn = {
  width: '100%', border: 'none', cursor: 'pointer', color: '#04211c',
  background: 'linear-gradient(180deg,#00C9AC,#00A58F)', borderRadius: 20, padding: 22,
  fontSize: 21, fontWeight: 800, letterSpacing: '-.01em', boxShadow: '0 16px 32px -14px rgba(0,165,143,.8)',
};
const ctrlBtn = { border: '1px solid rgba(0,0,0,.14)', background: '#fff', color: '#161616', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' };

function CopyLinkButton({ pin }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (typeof window === 'undefined') return;
    const link = `${window.location.origin}/?pin=${pin}`;
    if (navigator.clipboard) navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  };
  return (
    <button onClick={copy} className="mono" style={{ alignSelf: 'flex-start', border: '1px solid rgba(255,255,255,.4)', background: 'rgba(255,255,255,.14)', color: '#fff', borderRadius: 999, padding: '8px 14px', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', cursor: 'pointer' }}>
      {copied ? '✓ Kopierad' : 'Kopiera join-länk'}
    </button>
  );
}

function OptionTile({ i, text, type }) {
  if (type === 'truefalse') {
    const yes = i === 0;
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '22px 24px', borderRadius: 20, background: yes ? '#00BFA5' : '#EF5350', color: '#fff', fontSize: 26, fontWeight: 800 }}>
        <span style={{ fontSize: 30 }}>{yes ? '✓' : '✕'}</span>{text}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '22px 24px', borderRadius: 20, background: SHAPES[i].color, color: SHAPES[i].dark ? '#3a2600' : '#fff', fontSize: 22, fontWeight: 700 }}>
      <Shape index={i} size={36} />{text}
    </div>
  );
}

export function HostLobby({ pin, joinUrl, players, quiz, quizzes, onPickQuiz, onStart, qr }) {
  return (
    <Card>
      <div style={{ padding: '34px 38px 38px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: '#EF5350', animation: 'qzDot 1.5s infinite' }} />
            <Tag>Live lobby</Tag>
          </span>
          <span className="mono" style={{ fontSize: 13, color: '#6E6C63' }}>
            <strong style={{ color: '#161616', fontSize: 16 }}>{players.length}</strong> spelare inne
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span className="mono" style={{ fontSize: 11, color: '#9A988E', textTransform: 'uppercase', letterSpacing: '.14em' }}>Quiz:</span>
          <select value={quiz.id} onChange={(e) => onPickQuiz(e.target.value)}
            style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: '8px 12px', borderRadius: 12, border: '1px solid rgba(0,0,0,.12)', background: '#fff', cursor: 'pointer' }}>
            {quizzes.map((q) => <option key={q.id} value={q.id}>{q.title} · {q.count ?? (q.questions && q.questions.length)} frågor</option>)}
          </select>
          <a href="/admin" style={{ marginLeft: 'auto', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#00A58F', textDecoration: 'none' }}>✎ Skapa / redigera quiz</a>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 22 }}>
          <div style={{ background: 'linear-gradient(158deg,#00C9AC,#00997F)', borderRadius: 24, padding: 30, color: '#fff', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', opacity: .8, marginBottom: 4 }}>Spel-PIN</div>
              <div className="mono" style={{ fontWeight: 700, fontSize: 48, letterSpacing: '.06em', lineHeight: 1 }}>{pin}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 108, height: 108, background: '#fff', borderRadius: 16, padding: 8, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {qr ? <img src={qr} alt="QR" style={{ width: '100%', height: '100%' }} /> : <span className="mono" style={{ fontSize: 10, color: '#999' }}>…</span>}
              </div>
              <div className="mono" style={{ fontSize: 12, lineHeight: 1.5, opacity: .95 }}>Skanna för att<br />gå med direkt<br /><span style={{ opacity: .8 }}>{joinUrl}</span></div>
            </div>
            <CopyLinkButton pin={pin} />
          </div>

          <div style={{ background: '#F4F3EF', borderRadius: 24, padding: 24, display: 'flex', flexDirection: 'column', minHeight: 360 }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 14px' }}>Spelare</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, alignContent: 'flex-start', flex: 1, overflow: 'auto' }}>
              {players.length === 0 && <span className="mono" style={{ fontSize: 13, color: '#9A988E' }}>Väntar på att spelare ansluter…</span>}
              {players.map((p) => (
                <div key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid rgba(0,0,0,.05)', borderRadius: 999, padding: '6px 14px 6px 6px', animation: 'qzPop .42s cubic-bezier(.2,1.3,.4,1) both' }}>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800, background: p.color }}>{p.initial}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <button onClick={onStart} disabled={players.length === 0} style={{ ...accentBtn, marginTop: 22, opacity: players.length === 0 ? .5 : 1 }}>
          Starta spelet →
        </button>
      </div>
    </Card>
  );
}

export function HostCountdown({ n }) {
  return (
    <Card wide={1060}>
      <div style={{ padding: '90px 38px', textAlign: 'center' }}>
        <Tag>Gör dig redo</Tag>
        <div style={{ fontSize: 160, fontWeight: 900, color: '#00A58F', lineHeight: 1, marginTop: 16, animation: 'qzPop .4s ease both' }} key={n}>{n}</div>
        <p style={{ fontSize: 18, color: '#6E6C63', marginTop: 10 }}>Nästa fråga kommer strax…</p>
      </div>
    </Card>
  );
}

export function HostPreview({ question, qIndex, total }) {
  return (
    <Card>
      <div style={{ padding: '34px 38px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <Tag>Fråga {qIndex + 1} / {total}</Tag>
          {question.double && <DoubleBadge />}
        </div>
        <Media image={question.image} video={question.video} max={300} />
        <h1 style={{ fontSize: 'clamp(28px,3.6vw,46px)', fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.12, margin: '6px auto', maxWidth: '20ch' }}>{question.text}</h1>
        <p className="mono" style={{ color: '#9A988E', marginTop: 18, letterSpacing: '.1em', textTransform: 'uppercase', fontSize: 12 }}>Gör dig redo att svara…</p>
      </div>
    </Card>
  );
}

export function HostQuestion({ qIndex, total, question, timeLeft, timeLimit, answeredCount, playerCount, paused }) {
  const circ = 2 * Math.PI * 51;
  const offset = circ * (1 - timeLeft / timeLimit);
  return (
    <Card>
      <div style={{ padding: '26px 38px 34px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mono" style={{ fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: '#fff', background: '#161616', padding: '9px 16px', borderRadius: 999 }}>
              Fråga {String(qIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
            {question.double && <DoubleBadge />}
            {paused && <Tag color="#C62828">Pausad</Tag>}
          </div>
          <span className="mono" style={{ fontSize: 13, color: '#6E6C63' }}>
            <strong style={{ color: '#161616', fontSize: 16 }}>{answeredCount}</strong> / {playerCount} har svarat
          </span>
          <div style={{ position: 'relative', width: 84, height: 84, flex: 'none' }}>
            <svg width="84" height="84" viewBox="0 0 118 118">
              <circle cx="59" cy="59" r="51" fill="none" stroke="#EEEBE4" strokeWidth="11" />
              <circle cx="59" cy="59" r="51" fill="none" stroke="#00BFA5" strokeWidth="11" strokeLinecap="round" transform="rotate(-90 59 59)" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset .9s linear' }} />
            </svg>
            <div className="mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700 }}>{timeLeft}</div>
          </div>
        </div>

        <Media image={question.image} video={question.video} max={190} />
        <h1 style={{ fontSize: 'clamp(22px,2.8vw,38px)', fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.1, textAlign: 'center', margin: '4px auto 14px', maxWidth: '22ch' }}>{question.text}</h1>
        {question.type === 'multi' && <p className="mono" style={{ textAlign: 'center', color: '#9A988E', fontSize: 12, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '.1em' }}>Välj alla rätta svar</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {question.choices.map((c, i) => <OptionTile key={i} i={i} text={c} type={question.type} />)}
        </div>

      </div>
    </Card>
  );
}

export function HostResults({ question, distribution, leaderboard, onNext, isLast }) {
  const max = Math.max(1, ...distribution);
  const correctSet = Array.isArray(question.correct) ? new Set(question.correct) : new Set([question.correct]);
  const isTF = question.type === 'truefalse';
  return (
    <Card>
      <div style={{ padding: '32px 38px 36px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Tag>Resultat</Tag>{question.double && <DoubleBadge />}
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 800, margin: '8px 0 20px' }}>{question.text}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 26 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {question.choices.map((c, i) => {
              const right = correctSet.has(i);
              const color = isTF ? (i === 0 ? '#00BFA5' : '#EF5350') : SHAPES[i].color;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: right ? 1 : 0.55 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: 'none', color: '#fff', fontWeight: 800 }}>
                    {isTF ? (i === 0 ? '✓' : '✕') : <Shape index={i} size={20} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                      <span>{c} {right && <span style={{ color: '#00A58F' }}>✓ rätt</span>}</span>
                      <span className="mono" style={{ color: '#6E6C63' }}>{distribution[i]}</span>
                    </div>
                    <div style={{ height: 12, borderRadius: 6, background: '#EEEBE4', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(distribution[i] / max) * 100}%`, background: right ? '#00BFA5' : 'rgba(0,0,0,.18)', borderRadius: 6, transformOrigin: 'left', animation: 'qzBar .6s ease both' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ background: '#F4F3EF', borderRadius: 20, padding: 20 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Topplista</h3>
            {leaderboard.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(0,0,0,.06)' : 'none' }}>
                <span className="mono" style={{ width: 18, color: '#9A988E' }}>{i + 1}</span>
                <span style={{ width: 26, height: 26, borderRadius: '50%', background: p.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>{p.initial}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{p.name}{p.streak > 1 && <span title="streak" style={{ marginLeft: 6 }}>🔥{p.streak}</span>}</span>
                <span className="mono" style={{ fontWeight: 700 }}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onNext} style={{ ...accentBtn, marginTop: 24 }}>{isLast ? 'Visa vinnaren →' : 'Nästa fråga →'}</button>
      </div>
    </Card>
  );
}

export function HostWinner({ podium, onRestart, onNewGame }) {
  const order = [1, 0, 2];
  const heights = { 0: 150, 1: 110, 2: 86 };
  return (
    <Card>
      <div style={{ padding: '40px 38px 44px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{ position: 'absolute', top: -20, left: `${(i * 7) % 100}%`, width: 8, height: 14, background: ['#EF5350', '#3FA4F5', '#FFAE38', '#00BFA5'][i % 4], animation: `qzConfetti ${2 + (i % 5) * .4}s linear ${i * .15}s infinite` }} />
        ))}
        <Tag>Spelet är slut</Tag>
        <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-.03em', margin: '8px 0 30px' }}>🏆 {podium[0] && podium[0].name} vinner!</h1>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 18 }}>
          {order.map((rank) => {
            const p = podium[rank];
            if (!p) return null;
            return (
              <div key={p.id} style={{ width: 150 }}>
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, margin: '0 auto 8px' }}>{p.initial}</div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div className="mono" style={{ color: '#6E6C63', marginBottom: 8 }}>{p.score} p</div>
                <div style={{ height: heights[rank], borderRadius: '12px 12px 0 0', background: rank === 0 ? 'linear-gradient(180deg,#00C9AC,#00A58F)' : '#E0DED6', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 10, fontWeight: 900, fontSize: 24, color: rank === 0 ? '#fff' : '#9A988E' }}>{rank + 1}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30, flexWrap: 'wrap' }}>
          <button onClick={onRestart} style={{ ...accentBtn, width: 'auto', padding: '16px 26px' }}>Spela igen ↺</button>
          <button onClick={onNewGame} style={{ ...accentBtn, width: 'auto', padding: '16px 26px', background: '#fff', color: '#161616', border: '1px solid rgba(0,0,0,.14)', boxShadow: 'none' }}>Nytt spel (rensa spelare)</button>
        </div>
      </div>
    </Card>
  );
}
