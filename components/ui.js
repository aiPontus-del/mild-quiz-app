'use client';
import { useState, useEffect } from 'react';
import { SHAPES } from '@/lib/game';

export function Shape({ index, size = 40 }) {
  const s = SHAPES[index];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      {s.name === 'triangle' && <polygon points="50,12 92,86 8,86" fill="#fff" />}
      {s.name === 'diamond' && <polygon points="50,8 92,50 50,92 8,50" fill="#fff" />}
      {s.name === 'circle' && <circle cx="50" cy="50" r="42" fill="#fff" />}
      {s.name === 'square' && <rect x="13" y="13" width="74" height="74" rx="12" fill="#fff" />}
    </svg>
  );
}

export function Card({ children, wide = 1060 }) {
  return (
    <div style={{ width: `min(${wide}px,100%)`, background: '#fff', borderRadius: 30, border: '1px solid rgba(0,0,0,.06)', boxShadow: '0 36px 90px -40px rgba(0,0,0,.45)', overflow: 'hidden' }}>
      {children}
    </div>
  );
}

export function Phone({ children, bg = '#101010' }) {
  return (
    <div style={{ width: 392, background: '#141414', borderRadius: 46, padding: 12, boxShadow: '0 44px 90px -34px rgba(0,0,0,.6)', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', width: 120, height: 26, background: '#141414', borderRadius: '0 0 16px 16px', zIndex: 5 }} />
      <div style={{ borderRadius: 36, overflow: 'hidden', height: 720, background: bg, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  );
}

export function Tag({ children, color = '#00A58F' }) {
  return <span className="mono" style={{ fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color }}>{children}</span>;
}

export function DoubleBadge() {
  return (
    <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#3a2600', background: '#FFAE38', padding: '6px 12px', borderRadius: 999 }}>
      ×2 Dubbla poäng
    </span>
  );
}

export function Media({ image, video, max = 260 }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [image]);
  if (video) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <video src={video} autoPlay muted loop playsInline controls
          style={{ maxHeight: max, maxWidth: '100%', borderRadius: 18, background: '#000' }} />
      </div>
    );
  }
  if (image) {
    if (err) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <div className="mono" style={{ maxWidth: '100%', height: Math.min(max, 140), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 24px', borderRadius: 18, background: '#F4F3EF', color: '#9A988E', fontSize: 12, textAlign: 'center', border: '1px dashed rgba(0,0,0,.15)' }}>
            <span style={{ fontSize: 22 }}>🖼️</span>
            Bilden kunde inte laddas — använd en direktlänk (.jpg/.png) eller ladda upp en bild.
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <img src={image} alt="" onError={() => setErr(true)} style={{ maxHeight: max, maxWidth: '100%', borderRadius: 18, objectFit: 'cover' }} />
      </div>
    );
  }
  return null;
}
