import type { Track, TelemetrySample } from '../data/schema';
import { poseAt } from '../data/track';
import { Draggable } from './Draggable';

interface Props {
  track: Track | null;
  sample: TelemetrySample | null;
  currentTime: number;
  playerName: string;
}

const VIEW = 200;
const RADIUS = VIEW / 2 - 6;
const PADDING = 0.82;

function toViewCoord(x: number, y: number): [number, number] {
  return [VIEW / 2 + x * RADIUS * PADDING, VIEW / 2 + y * RADIUS * PADDING];
}

export function Minimap({ track, sample, currentTime, playerName }: Props) {
  const hasTrackTime = track?.points.length && track.points[0].t !== undefined;
  const pose = track
    ? poseAt(track, {
        time: hasTrackTime ? currentTime : undefined,
        progress: sample?.progress,
      })
    : null;

  const pathD = track
    ? track.points
        .map((p, i) => {
          const [vx, vy] = toViewCoord(p.x, p.y);
          return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(2)} ${vy.toFixed(2)}`;
        })
        .join(' ')
    : '';

  const [mx, my] = pose ? toViewCoord(pose.x, pose.y) : [VIEW / 2, VIEW / 2];
  const headingDeg = pose ? (pose.headingRad * 180) / Math.PI : 0;

  return (
    <>
      <Draggable
        id="minimap.map"
        style={{ position: 'absolute', left: 48, bottom: 300, width: VIEW, height: VIEW }}
      >
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          width={VIEW}
          height={VIEW}
          style={{ display: 'block' }}
        >
          <defs>
            <linearGradient id="trackGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--hud-track-a)" />
              <stop offset="100%" stopColor="var(--hud-track-b)" />
            </linearGradient>
          </defs>
          <circle
            cx={VIEW / 2}
            cy={VIEW / 2}
            r={RADIUS}
            fill="rgba(12,14,20,0.55)"
            stroke="rgba(255,255,255,0.5)"
            strokeWidth={1.5}
          />
          {track && (
            <path
              d={pathD}
              fill="none"
              stroke="url(#trackGrad)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {pose && (
            <g transform={`translate(${mx} ${my}) rotate(${headingDeg})`}>
              <circle r={6} fill="#fff" />
              <path d="M 0 -9 L 5 2 L 0 0 L -5 2 Z" fill="#111" />
            </g>
          )}
          <text
            x={VIEW / 2}
            y={16}
            textAnchor="middle"
            fill="rgba(255,255,255,0.85)"
            fontSize={14}
            fontWeight={600}
            style={{ letterSpacing: '0.1em' }}
          >
            N
          </text>
        </svg>
      </Draggable>

      <Draggable
        id="minimap.name"
        style={{ position: 'absolute', left: 48, bottom: 260 }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 12px',
            borderRadius: 999,
            background: 'rgba(12,14,20,0.55)',
            border: '1px solid rgba(255,255,255,0.35)',
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '0.08em',
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.25)',
              display: 'inline-block',
            }}
          />
          {playerName}
        </div>
      </Draggable>
    </>
  );
}
