import { create } from 'zustand';
import type { TelemetryTrack, Track, PlayerProfile } from '../data/schema';
import type { SpeedUnit } from '../util/units';

export type WidgetId =
  | 'topLeft.progress'
  | 'topLeft.time'
  | 'topRight'
  | 'minimap.map'
  | 'minimap.name'
  | 'speedo.arc'
  | 'speedo.gear'
  | 'speedo.abs'
  | 'speedo.tcr'
  | 'speedo.unit'
  | 'speedo.speed';

export type Layout = Record<WidgetId, { x: number; y: number }>;

const DEFAULT_LAYOUT: Layout = {
  'topLeft.progress': { x: 0, y: 0 },
  'topLeft.time': { x: 0, y: 0 },
  'topRight': { x: 0, y: 0 },
  'minimap.map': { x: 0, y: 192 },
  'minimap.name': { x: 0, y: 192 },
  'speedo.arc': { x: -44, y: -50 },
  'speedo.gear': { x: -44, y: -53 },
  'speedo.abs': { x: -50, y: -62 },
  'speedo.tcr': { x: -51, y: -50 },
  'speedo.unit': { x: -46, y: -53 },
  'speedo.speed': { x: -45, y: -59 },
};

const LAYOUT_KEY = 'hud5.layout.v3';

function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_LAYOUT, ...parsed };
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

function saveLayout(l: Layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

interface PlaybackState {
  telemetry: TelemetryTrack | null;
  track: Track | null;
  profile: PlayerProfile;
  currentTime: number;
  playing: boolean;
  rate: number;
  unit: SpeedUnit;
  exporterMode: boolean;
  editMode: boolean;
  layout: Layout;
  stageScale: number;
  videoUrl: string | null;
  videoAspect: number;
  videoDuration: number;

  setTelemetry(t: TelemetryTrack | null): void;
  setVideo(url: string | null, aspect: number, duration: number): void;
  setTrack(t: Track | null): void;
  setProfile(p: Partial<PlayerProfile>): void;
  setUnit(u: SpeedUnit): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(t: number): void;
  setRate(r: number): void;
  setExporterMode(on: boolean): void;
  setEditMode(on: boolean): void;
  setStageScale(s: number): void;
  nudgeWidget(id: WidgetId, dx: number, dy: number): void;
  setWidgetOffset(id: WidgetId, x: number, y: number): void;
  resetLayout(): void;
}

export const usePlayback = create<PlaybackState>((set, get) => ({
  telemetry: null,
  track: null,
  profile: { name: 'ANNA' },
  currentTime: 0,
  playing: false,
  rate: 1,
  unit: 'kmh',
  exporterMode: false,
  editMode: false,
  layout: loadLayout(),
  stageScale: 1,
  videoUrl: null,
  videoAspect: 16 / 9,
  videoDuration: 0,

  setTelemetry: t => set({ telemetry: t, currentTime: 0, playing: false }),
  setVideo: (url, aspect, duration) => {
    const prev = get().videoUrl;
    if (prev) URL.revokeObjectURL(prev);
    set({ videoUrl: url, videoAspect: aspect, videoDuration: duration, currentTime: 0, playing: false });
  },
  setTrack: t => set({ track: t }),
  setProfile: p => set(s => ({ profile: { ...s.profile, ...p } })),
  setUnit: u => set({ unit: u }),
  play: () => {
    const s = get();
    if (!s.telemetry && !s.videoUrl) return;
    set({ playing: true });
  },
  pause: () => set({ playing: false }),
  toggle: () => set(s => ({ playing: !s.playing })),
  seek: t => set({ currentTime: Math.max(0, t) }),
  setRate: r => set({ rate: r }),
  setExporterMode: on => set({ exporterMode: on }),
  setEditMode: on => set({ editMode: on }),
  setStageScale: s => set({ stageScale: s }),
  nudgeWidget: (id, dx, dy) => {
    const cur = get().layout[id];
    const next: Layout = { ...get().layout, [id]: { x: cur.x + dx, y: cur.y + dy } };
    saveLayout(next);
    set({ layout: next });
  },
  setWidgetOffset: (id, x, y) => {
    const next: Layout = { ...get().layout, [id]: { x, y } };
    saveLayout(next);
    set({ layout: next });
  },
  resetLayout: () => {
    saveLayout({ ...DEFAULT_LAYOUT });
    set({ layout: { ...DEFAULT_LAYOUT } });
  },
}));

let raf = 0;
let last = 0;

export function startPlaybackLoop(): () => void {
  const tick = (ts: number) => {
    const s = usePlayback.getState();
    const duration = Math.max(s.telemetry?.duration ?? 0, s.videoDuration ?? 0);
    // When a video is loaded, the <video> element is the time source —
    // App.tsx pushes video.currentTime into the store each rAF tick.
    if (s.playing && duration > 0 && !s.videoUrl) {
      if (last) {
        const dt = ((ts - last) / 1000) * s.rate;
        const next = s.currentTime + dt;
        if (next >= duration) {
          usePlayback.setState({ currentTime: duration, playing: false });
        } else {
          usePlayback.setState({ currentTime: next });
        }
      }
      last = ts;
    } else {
      last = 0;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
