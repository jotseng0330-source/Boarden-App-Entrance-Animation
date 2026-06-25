import React from "react";

// ── Easing ───────────────────────────────────────────────────────────────────
const Easing = {
  linear: (t: number) => t,
  easeInQuad:    (t: number) => t * t,
  easeOutQuad:   (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic:   (t: number) => t * t * t,
  easeOutCubic:  (t: number) => (--t) * t * t + 1,
  easeInOutCubic:(t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeInQuart:   (t: number) => t * t * t * t,
  easeOutQuart:  (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart:(t: number) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t),
  easeInExpo:    (t: number) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo:   (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInSine:    (t: number) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine:   (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    if (t === 0) return 0;
    if (t === 1) return 1;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ── Timeline context ─────────────────────────────────────────────────────────
interface TimelineCtx {
  time: number; duration: number; playing: boolean;
  setTime: (t: number | ((p: number) => number)) => void;
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void;
}
const TimelineContext = React.createContext<TimelineCtx>({
  time: 0, duration: 10, playing: false, setTime: () => {}, setPlaying: () => {},
});
const useTime = () => React.useContext(TimelineContext).time;
const useTimeline = () => React.useContext(TimelineContext);

// ── Stage ────────────────────────────────────────────────────────────────────
function Stage({ width = 1280, height = 720, duration = 10, background = "#f6f4ef",
  loop = true, autoplay = true, persistKey = "animstage", children }: {
  width?: number; height?: number; duration?: number; background?: string;
  loop?: boolean; autoplay?: boolean; persistKey?: string; children?: React.ReactNode;
}) {
  const [time, setTime] = React.useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ":t") || "0");
      return isFinite(v) ? clamp(v, 0, duration) : 0;
    } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(autoplay);
  const [hoverTime, setHoverTime] = React.useState<number | null>(null);
  const [scale, setScale] = React.useState(1);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastTsRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    try { localStorage.setItem(persistKey + ":t", String(time)); } catch {}
  }, [time, persistKey]);

  React.useEffect(() => {
    if (!stageRef.current) return;
    const el = stageRef.current;
    const measure = () => {
      const s = Math.min(el.clientWidth / width, (el.clientHeight - 44) / height);
      setScale(Math.max(0.05, s));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [width, height]);

  React.useEffect(() => {
    if (!playing) { lastTsRef.current = null; return; }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => {
        let next = t + dt;
        if (next >= duration) {
          if (loop) next = next % duration;
          else { next = duration; setPlaying(false); }
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTsRef.current = null; };
  }, [playing, duration, loop]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt?.tagName === "INPUT" || tgt?.tagName === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); setPlaying((p) => !p); }
      else if (e.code === "ArrowLeft") setTime((t) => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.code === "ArrowRight") setTime((t) => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration));
      else if (e.key === "0" || e.code === "Home") setTime(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  const displayTime = hoverTime != null ? hoverTime : time;
  const ctxValue = React.useMemo(
    () => ({ time: displayTime, duration, playing, setTime, setPlaying }),
    [displayTime, duration, playing]
  );

  return (
    <div ref={stageRef} style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", background: "#0a0a0a", fontFamily: "Inter, system-ui, sans-serif",
    }}>
      <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: 0 }}>
        <div style={{
          width, height, background, position: "relative",
          transform: `scale(${scale})`, transformOrigin: "center",
          flexShrink: 0, boxShadow: "0 20px 60px rgba(0,0,0,0.4)", overflow: "hidden",
        }}>
          <TimelineContext.Provider value={ctxValue}>{children}</TimelineContext.Provider>
        </div>
      </div>
      <PlaybackBar
        time={displayTime} duration={duration} playing={playing}
        onPlayPause={() => setPlaying((p) => !p)}
        onReset={() => setTime(0)}
        onSeek={(t) => setTime(t)}
        onHover={(t) => setHoverTime(t)}
      />
    </div>
  );
}

// ── PlaybackBar ──────────────────────────────────────────────────────────────
function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
        background: hover ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
        color: "#f6f4ef", cursor: "pointer", padding: 0, transition: "background 120ms",
      }}>
      {children}
    </button>
  );
}

function PlaybackBar({ time, duration, playing, onPlayPause, onReset, onSeek, onHover }: {
  time: number; duration: number; playing: boolean;
  onPlayPause: () => void; onReset: () => void;
  onSeek: (t: number) => void; onHover: (t: number | null) => void;
}) {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const timeFromEvent = React.useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    return clamp((e.clientX - rect.left) / rect.width, 0, 1) * duration;
  }, [duration]);

  React.useEffect(() => {
    if (!dragging) return;
    const onUp = () => setDragging(false);
    const onMove = (e: MouseEvent) => onSeek(timeFromEvent(e));
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mouseup", onUp); window.removeEventListener("mousemove", onMove); };
  }, [dragging, timeFromEvent, onSeek]);

  const pct = duration > 0 ? (time / duration) * 100 : 0;
  const fmt = (t: number) => {
    const total = Math.max(0, t);
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    const cs = Math.floor((total * 100) % 100);
    return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  };
  const mono = "JetBrains Mono, ui-monospace, monospace";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "8px 16px",
      background: "rgba(20,20,20,0.92)", borderTop: "1px solid rgba(255,255,255,0.08)",
      width: "100%", maxWidth: 680, alignSelf: "center", borderRadius: 8,
      color: "#f6f4ef", fontFamily: "Inter, system-ui, sans-serif", userSelect: "none", flexShrink: 0,
    }}>
      <IconButton onClick={onReset} title="Return to start (0)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
        </svg>
      </IconButton>
      <IconButton onClick={onPlayPause} title="Play/pause (space)">
        {playing
          ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2l9 5-9 5V2z" fill="currentColor"/></svg>
        }
      </IconButton>
      <div style={{ fontFamily: mono, fontSize: 12, fontVariantNumeric: "tabular-nums", width: 64, textAlign: "right", color: "#f6f4ef" }}>{fmt(time)}</div>
      <div ref={trackRef}
        onMouseMove={(e) => { const t = timeFromEvent(e); dragging ? onSeek(t) : onHover(t); }}
        onMouseLeave={() => { if (!dragging) onHover(null); }}
        onMouseDown={(e) => { setDragging(true); onSeek(timeFromEvent(e)); onHover(null); }}
        style={{ flex: 1, height: 22, position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2 }}/>
        <div style={{ position: "absolute", left: 0, width: `${pct}%`, height: 4, background: "oklch(72% 0.12 250)", borderRadius: 2 }}/>
        <div style={{ position: "absolute", left: `${pct}%`, top: "50%", width: 12, height: 12, marginLeft: -6, marginTop: -6, background: "#fff", borderRadius: 6, boxShadow: "0 2px 4px rgba(0,0,0,0.4)" }}/>
      </div>
      <div style={{ fontFamily: mono, fontSize: 12, fontVariantNumeric: "tabular-nums", width: 64, textAlign: "left", color: "rgba(246,244,239,0.55)" }}>{fmt(duration)}</div>
    </div>
  );
}

// ── BoardenSplash scene ──────────────────────────────────────────────────────
const BRAND = { orange: "#F6A623", red: "#E2504A", blue: "#2E9FE8", glyph: "rgba(255,255,255,0.85)", ink: "#F4F4F6" };
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a), 0, 1);

const B_FONT = 290, B_LEFT = 40, B_TOP = 50, LINE_H = 22, XR = 308;
const LINES = [
  { x0: 205, x1: XR, cy: 103 },
  { x0: 233, x1: XR, cy: 161 },
  { x0: 245, x1: XR, cy: 219 },
  { x0: 222, x1: XR, cy: 277 },
];
const WAVE_CYCLES = 2.3, WAVE_AMP = 9;

function linePath(L: { x0: number; x1: number; cy: number }, wave: number) {
  const N = 24, W = L.x1 - L.x0, amp = WAVE_AMP * wave;
  let d = "";
  for (let i = 0; i <= N; i++) {
    const f = i / N;
    const x = L.x0 + f * W;
    const y = L.cy + amp * Math.sin(f * Math.PI * 2 * WAVE_CYCLES + L.x0 * 0.06);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d;
}

const T = {
  borderA: 0.05, borderB: 0.7,
  bInA: 0.2, bInB: 0.85,
  lineStart: 0.8, lineStagger: 0.3, lineDraw: 0.46,
  thumbA: 2.15, thumbB: 2.8,
  straightA: 2.15, straightB: 2.85,
  nodA: 2.85, nodB: 3.25,
  wordA: 3.3, wordB: 3.9,
  fadeA: 4.05, fadeB: 4.35,
};
const TILT = 12;

function BoardenMark({ t }: { t: number }) {
  const E = Easing;
  const S = 380, stroke = 11;

  const inP = E.easeOutCubic(seg(t, 0, 0.95));
  const breath = t > T.nodB ? 1 + 0.008 * Math.sin((t - T.nodB) * 1.5) : 1;
  const groupScale = (0.94 + 0.06 * inP) * breath;
  const drawP = E.easeInOutCubic(seg(t, T.borderA, T.borderB));
  const glowP = seg(t, 0.1, 1.1);
  const bIn = E.easeOutBack(seg(t, T.bInA, T.bInB));
  const bOpacity = seg(t, T.bInA, T.bInA + 0.2);
  const nod = 1 + 0.06 * Math.sin(seg(t, T.nodA, T.nodB) * Math.PI);
  const thumbSeg = seg(t, T.thumbA, T.thumbB);
  const bRot = t < T.thumbA
    ? TILT * E.easeOutCubic(seg(t, T.bInA, T.bInB))
    : TILT * (1 - E.easeOutBack(thumbSeg));
  const thumbPop = 1 + 0.06 * Math.sin(thumbSeg * Math.PI);
  const bScale = (0.88 + 0.12 * bIn) * nod * thumbPop;
  const wave = 1 - E.easeInOutCubic(seg(t, T.straightA, T.straightB));

  return (
    <div style={{
      position: "absolute", left: "50%", top: 700,
      width: S, height: S, marginLeft: -S / 2,
      transform: `scale(${groupScale})`, transformOrigin: "center",
    }}>
      <div style={{
        position: "absolute", inset: -160,
        background: "radial-gradient(circle at 50% 50%, rgba(226,80,74,0.16), rgba(46,159,232,0.09) 45%, rgba(0,0,0,0) 70%)",
        opacity: glowP, filter: "blur(6px)", pointerEvents: "none",
      }}/>
      <div style={{ position: "absolute", inset: stroke / 2, background: "#000", borderRadius: 92, opacity: Math.min(1, drawP * 1.4) }}/>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <linearGradient id="boardenGrad" x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0%" stopColor={BRAND.orange}/>
            <stop offset="38%" stopColor={BRAND.red}/>
            <stop offset="100%" stopColor={BRAND.blue}/>
          </linearGradient>
        </defs>
        <rect x={stroke/2} y={stroke/2} width={S-stroke} height={S-stroke} rx={96} ry={96}
          fill="none" stroke="url(#boardenGrad)" strokeWidth={stroke} strokeLinecap="round"
          pathLength={1} strokeDasharray={1} strokeDashoffset={1-drawP}/>
      </svg>
      <div style={{
        position: "absolute", left: B_LEFT, top: B_TOP,
        fontFamily: '"Lexend Deca", sans-serif', fontWeight: 500, fontSize: B_FONT, lineHeight: 1,
        color: BRAND.glyph, opacity: bOpacity,
        transform: `rotate(${bRot}deg) scale(${bScale})`, transformOrigin: "108px 232px",
      }}>b</div>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {LINES.map((L, i) => {
          const st = T.lineStart + i * T.lineStagger;
          const p = Easing.easeInOutSine(seg(t, st, st + T.lineDraw));
          return <path key={i} d={linePath(L, wave)} fill="none" stroke={BRAND.glyph}
            strokeWidth={LINE_H} strokeLinecap="butt" strokeLinejoin="round"
            pathLength={1} strokeDasharray={1} strokeDashoffset={1-p}/>;
        })}
      </svg>
    </div>
  );
}

function BoardenSplash() {
  const t = useTime();
  const wP = Easing.easeOutCubic(seg(t, T.wordA, T.wordB));
  const fadeOut = 1 - seg(t, T.fadeA, T.fadeB);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", opacity: fadeOut, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 80% at 50% 36%, rgba(20,20,22,1) 0%, #000 60%)" }}/>
      <BoardenMark t={t}/>
      <div style={{
        position: "absolute", left: 0, right: 0, top: 1180, textAlign: "center",
        fontFamily: '"Lexend Deca", sans-serif', fontWeight: 500, fontSize: 88,
        letterSpacing: "0.005em", color: BRAND.ink,
        opacity: wP, transform: `translateY(${(1 - wP) * 16}px)`,
      }}>boarden</div>
    </div>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Stage width={1080} height={1920} duration={4.25} background="#000" persistKey="boarden-splash">
      <BoardenSplash/>
    </Stage>
  );
}
