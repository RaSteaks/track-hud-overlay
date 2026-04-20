import type { TelemetrySample } from '../data/schema';
import { Draggable } from './Draggable';

interface Props {
  sample: TelemetrySample | null;
  currentTime: number;
}

function formatTime(t: number): string {
  const ms = Math.floor((t - Math.floor(t)) * 1000);
  const s = Math.floor(t) % 60;
  const m = Math.floor(t / 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

export function TopLeftStatus({ sample, currentTime }: Props) {
  const pct = Math.round((sample?.progress ?? 0) * 100);
  return (
    <>
      <Draggable
        id="topLeft.progress"
        style={{
          position: 'absolute',
          left: 48,
          top: 43,
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 44, fontWeight: 400, lineHeight: 1 }}>
          {pct}
          <span style={{ fontSize: 24, marginLeft: 2 }}>%</span>
        </span>
        <span style={{ fontSize: 14, letterSpacing: '0.18em', opacity: 0.75 }}>PROGRESS</span>
      </Draggable>
      <Draggable
        id="topLeft.time"
        style={{
          position: 'absolute',
          left: 48,
          top: 95,
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 12, letterSpacing: '0.22em', opacity: 0.6 }}>TIME</span>
        <span style={{ fontSize: 18, letterSpacing: '0.05em', opacity: 0.85 }}>
          {formatTime(currentTime)}
        </span>
      </Draggable>
    </>
  );
}
