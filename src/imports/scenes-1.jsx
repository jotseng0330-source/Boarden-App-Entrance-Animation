// Boarden splash — an invisible stroke writes four wavy "notes" that straighten
// into clean lines, the logo settles, then the wordmark appears.
// The "b" is real Lexend Deca; lines are square-capped; everything centered.
// Reads timeline globals (useTime / Easing / clamp / interpolate) at render time.

const BRAND = {
  orange: '#F6A623',
  red:    '#E2504A',
  blue:   '#2E9FE8',
  glyph:  'rgba(255,255,255,0.85)',   // object is solid white @ 85%
  ink:    '#F4F4F6',
};

const seg = (t, a, b) => window.clamp((t - a) / (b - a), 0, 1);

// ── icon-box geometry (380 box), b + lines centered as a group ───────────────
// b (Lexend Deca text, weight 500 to match the icon) — visual top≈92, baseline≈288
const B_FONT = 290, B_LEFT = 40, B_TOP = 50;
const LINE_H = 22;
const XR = 308;                            // shared right edge (right-aligned), pulled in toward the b
const LINES = [                            // ragged-left paragraph, square ends
  { x0: 205, x1: XR, cy: 103 },            // longest, top aligns b top
  { x0: 233, x1: XR, cy: 161 },
  { x0: 245, x1: XR, cy: 219 },            // shortest
  { x0: 222, x1: XR, cy: 277 },            // bottom aligns b bottom
];
const WAVE_CYCLES = 2.3, WAVE_AMP = 9;

function linePath(L, wave) {
  const N = 24, W = L.x1 - L.x0, amp = WAVE_AMP * wave;
  let d = '';
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const x = L.x0 + f * W;
    const y = L.cy + amp * Math.sin(f * Math.PI * 2 * WAVE_CYCLES + L.x0 * 0.06);
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d;
}

const T = {
  borderA: 0.05, borderB: 0.7,
  bInA: 0.2, bInB: 0.85,
  lineStart: 0.8, lineStagger: 0.3, lineDraw: 0.46,
  thumbA: 2.15, thumbB: 2.8,                // the “thumb” flicks up → settles into the icon b
  straightA: 2.15, straightB: 2.85,         // …waves straighten at the same moment
  nodA: 2.85, nodB: 3.25,
  wordA: 3.3, wordB: 3.9,
  fadeA: 4.05, fadeB: 4.35,
};

const TILT = 12;                            // hand-pose lean before the thumb flicks up

function BoardenMark({ t }) {
  const E = window.Easing;
  const S = 380, stroke = 11;

  const inP = E.easeOutCubic(seg(t, 0, 0.95));
  const breath = t > T.nodB ? 1 + 0.008 * Math.sin((t - T.nodB) * 1.5) : 1;
  const groupScale = (0.94 + 0.06 * inP) * breath;

  const drawP = E.easeInOutCubic(seg(t, T.borderA, T.borderB));
  const glowP = seg(t, 0.1, 1.1);

  const bIn = E.easeOutBack(seg(t, T.bInA, T.bInB));
  const bOpacity = seg(t, T.bInA, T.bInA + 0.2);
  const nod = 1 + 0.06 * Math.sin(seg(t, T.nodA, T.nodB) * Math.PI);

  // “thumbs-up” gesture: the b leans like a hand (stem = thumb), then the thumb
  // flicks up and the glyph settles into the clean app-icon b.
  const thumbSeg = seg(t, T.thumbA, T.thumbB);
  let bRot;
  if (t < T.thumbA) bRot = TILT * E.easeOutCubic(seg(t, T.bInA, T.bInB));
  else              bRot = TILT * (1 - E.easeOutBack(thumbSeg));   // overshoots past upright
  const thumbPop = 1 + 0.06 * Math.sin(thumbSeg * Math.PI);        // little pop as it flicks
  const bScale = (0.88 + 0.12 * bIn) * nod * thumbPop;

  const wave = 1 - E.easeInOutCubic(seg(t, T.straightA, T.straightB));

  return React.createElement('div', {
    style: {
      position: 'absolute', left: '50%', top: 700,
      width: S, height: S, marginLeft: -S / 2,
      transform: `scale(${groupScale})`, transformOrigin: 'center',
    },
  },
    React.createElement('div', {
      style: {
        position: 'absolute', inset: -160,
        background: 'radial-gradient(circle at 50% 50%, rgba(226,80,74,0.16), rgba(46,159,232,0.09) 45%, rgba(0,0,0,0) 70%)',
        opacity: glowP, filter: 'blur(6px)', pointerEvents: 'none',
      },
    }),
    React.createElement('div', {
      style: { position: 'absolute', inset: stroke / 2, background: '#000', borderRadius: 92, opacity: Math.min(1, drawP * 1.4) },
    }),
    // gradient border (draws on)
    React.createElement('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}`, style: { position: 'absolute', inset: 0, overflow: 'visible' } },
      React.createElement('defs', null,
        React.createElement('linearGradient', { id: 'boardenGrad', x1: '0', y1: '0', x2: '0.25', y2: '1' },
          React.createElement('stop', { offset: '0%', stopColor: BRAND.orange }),
          React.createElement('stop', { offset: '38%', stopColor: BRAND.red }),
          React.createElement('stop', { offset: '100%', stopColor: BRAND.blue }),
        ),
      ),
      React.createElement('rect', {
        x: stroke / 2, y: stroke / 2, width: S - stroke, height: S - stroke, rx: 96, ry: 96,
        fill: 'none', stroke: 'url(#boardenGrad)', strokeWidth: stroke, strokeLinecap: 'round',
        pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - drawP,
      }),
    ),
    // the “b” — real Lexend Deca (weight 500); reads as a thumbs-up, then settles
    React.createElement('div', {
      style: {
        position: 'absolute', left: B_LEFT, top: B_TOP,
        fontFamily: '"Lexend Deca", sans-serif', fontWeight: 500, fontSize: B_FONT, lineHeight: 1,
        color: BRAND.glyph, opacity: bOpacity,
        transform: `rotate(${bRot}deg) scale(${bScale})`, transformOrigin: '108px 232px',
      },
    }, 'b'),
    // lines — square-capped, written by an invisible stroke then straightened
    React.createElement('svg', { width: S, height: S, viewBox: `0 0 ${S} ${S}`, style: { position: 'absolute', inset: 0, overflow: 'visible' } },
      ...LINES.map((L, i) => {
        const st = T.lineStart + i * T.lineStagger;
        const p = E.easeInOutSine(seg(t, st, st + T.lineDraw));
        return React.createElement('path', {
          key: i, d: linePath(L, wave), fill: 'none', stroke: BRAND.glyph,
          strokeWidth: LINE_H, strokeLinecap: 'butt', strokeLinejoin: 'round',
          pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p,
        });
      }),
    ),
  );
}

function BoardenSplash() {
  const t = window.useTime();
  const E = window.Easing;
  const wP = E.easeOutCubic(seg(t, T.wordA, T.wordB));
  const fadeOut = 1 - seg(t, T.fadeA, T.fadeB);

  return React.createElement('div', {
    style: { position: 'absolute', inset: 0, background: '#000', opacity: fadeOut, overflow: 'hidden' },
  },
    React.createElement('div', {
      style: { position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 36%, rgba(20,20,22,1) 0%, #000 60%)' },
    }),
    React.createElement(BoardenMark, { t }),
    React.createElement('div', {
      style: {
        position: 'absolute', left: 0, right: 0, top: 1180, textAlign: 'center',
        fontFamily: '"Lexend Deca", sans-serif', fontWeight: 500, fontSize: 88,
        letterSpacing: '0.005em', color: BRAND.ink,
        opacity: wP, transform: `translateY(${(1 - wP) * 16}px)`,
      },
    }, 'boarden'),
  );
}

window.BoardenSplash = BoardenSplash;
module.exports = { BoardenSplash };
