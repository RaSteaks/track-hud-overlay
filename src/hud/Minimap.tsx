import type { Track, TelemetrySample } from '../data/schema';
import { poseAt } from '../data/track';
import { Draggable } from './Draggable';

interface Props {
  track: Track | null;
  sample: TelemetrySample | null;
  currentTime: number;
  playerName: string;
}

const DISC = 240;
const RADIUS = DISC / 2 - 12;
const PADDING = 0.82;

function toViewCoord(x: number, y: number): [number, number] {
  return [DISC / 2 + x * RADIUS * PADDING, DISC / 2 + y * RADIUS * PADDING];
}

export function Minimap({ track, sample, currentTime, playerName }: Props) {
  const hasTrackTime = track?.points.length && track.points[0].t !== undefined;
  const pose = track
    ? poseAt(track, {
        time: hasTrackTime ? currentTime : undefined,
        progress: sample?.progress,
      })
    : null;

  const progressFrac = Math.max(0, Math.min(1, sample?.progress ?? 0));
  const traversedCount = track ? Math.max(1, Math.floor(track.points.length * progressFrac)) : 0;

  const fullPath = track
    ? track.points
        .map((p, i) => {
          const [vx, vy] = toViewCoord(p.x, p.y);
          return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(2)} ${vy.toFixed(2)}`;
        })
        .join(' ')
    : '';

  const traversedPath = track
    ? track.points
        .slice(0, traversedCount)
        .map((p, i) => {
          const [vx, vy] = toViewCoord(p.x, p.y);
          return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(2)} ${vy.toFixed(2)}`;
        })
        .join(' ')
    : '';

  const [mx, my] = pose ? toViewCoord(pose.x, pose.y) : [DISC / 2, DISC / 2];
  // headingRad uses atan2(dx, -dy): 0 = north (up), CW. No offset needed.
  const headingDeg = pose ? (pose.headingRad * 180) / Math.PI : 0;

  // Heading-up rotation: rotate map content so the heading points up.
  const mapAngle = -headingDeg;

  // Car anchor — placed below center so the tilted ground plane shows
  // more of what's ahead than behind.
  const ANCHOR_Y = DISC * 0.68;

  // N label — anchored to true north, sitting on the upper (far) arc.
  const N_RADIUS = DISC / 2 - 22;
  const mapAngleRad = (mapAngle * Math.PI) / 180;
  const nx = DISC / 2 + Math.sin(mapAngleRad) * N_RADIUS;
  const ny = DISC / 2 - Math.cos(mapAngleRad) * N_RADIUS;

  const trackLenKm = track
    ? (() => {
        let total = 0;
        for (let i = 1; i < track.points.length; i++) {
          const dx = track.points[i].x - track.points[i - 1].x;
          const dy = track.points[i].y - track.points[i - 1].y;
          total += Math.hypot(dx, dy);
        }
        return total;
      })()
    : 0;

  const distLabel = track ? `${(trackLenKm * 1.2).toFixed(1)} KM` : '— KM';
  const finish =
    track && track.points.length
      ? toViewCoord(
          track.points[track.points.length - 1].x,
          track.points[track.points.length - 1].y,
        )
      : null;
  const elapsedSec = Math.floor(currentTime);
  const alt = 412 + Math.round(Math.sin(elapsedSec / 30) * 18);

  return (
    <>
      <Draggable
        id="minimap.disc"
        style={{
          position: 'absolute',
          left: 48,
          bottom: 56,
          width: DISC,
          filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.6))',
          fontFamily: 'var(--mono)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--ink-dim)',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          <span>ROUTE · TRACK</span>
          <span>{distLabel}</span>
        </div>
        <div
          style={{
            position: 'relative',
            width: DISC,
            height: DISC,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 50% 50%, rgba(10,12,14,0.35) 0%, rgba(10,12,14,0.18) 60%, rgba(10,12,14,0) 75%)',
          }}
        >
          {/* outer ring */}
          <div
            style={{
              position: 'absolute',
              inset: 10,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.18)',
            }}
          />

          {/* Tilted ground plane — track + fade mask. CSS 3D perspective
              gives the map depth; transform-origin at the car anchor keeps
              the near edge locked while the far edge recedes. */}
          <svg
            viewBox={`0 0 ${DISC} ${DISC}`}
            width={DISC}
            height={DISC}
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'perspective(520px) rotateX(55deg)',
              transformOrigin: `50% ${(ANCHOR_Y / DISC) * 100}%`,
            }}
          >
            <defs>
              <radialGradient
                id="mm-fade"
                cx="50%"
                cy={`${(ANCHOR_Y / DISC) * 100}%`}
                r="50%"
              >
                <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                <stop offset="55%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <mask id="mm-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={DISC} height={DISC}>
                <rect width={DISC} height={DISC} fill="url(#mm-fade)" />
              </mask>
            </defs>

            {track && (
              <g mask="url(#mm-mask)">
                <g
                  transform={`translate(${DISC / 2} ${ANCHOR_Y}) rotate(${mapAngle}) translate(${-mx} ${-my})`}
                >
                  <path
                    d={fullPath}
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                  {traversedCount > 1 && (
                    <path
                      d={traversedPath}
                      fill="none"
                      stroke="var(--amber)"
                      strokeWidth={8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                  {finish && (
                    <>
                      <circle
                        cx={finish[0]}
                        cy={finish[1]}
                        r={4}
                        fill="none"
                        stroke="var(--ink)"
                        strokeWidth={1.5}
                      />
                      <circle cx={finish[0]} cy={finish[1]} r={1.5} fill="var(--ink)" />
                    </>
                  )}
                </g>
              </g>
            )}
          </svg>

          {/* Overlay — car arrow + N label, untilted on top of the plane */}
          <svg
            viewBox={`0 0 ${DISC} ${DISC}`}
            width={DISC}
            height={DISC}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            {pose && (
              <g transform={`translate(${DISC / 2} ${ANCHOR_Y})`}>
                <polygon
                  points="0,-11 8,9 0,3 -8,9"
                  fill="var(--ink)"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6))' }}
                />
              </g>
            )}

            <text
              x={nx}
              y={ny}
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--amber)"
              fontFamily="var(--mono)"
              fontSize={11}
              fontWeight={700}
              letterSpacing="0.15em"
            >
              N
            </text>
          </svg>
        </div>
      </Draggable>

      <Draggable
        id="minimap.name"
        style={{
          position: 'absolute',
          left: 48,
          bottom: 24,
          width: DISC,
          fontFamily: 'var(--mono)',
          filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.6))',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--ink-dim)',
            textTransform: 'uppercase',
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--ink)',
            }}
          >
            <span style={{ width: 8, height: 8, background: 'var(--amber)' }} />
            {playerName} · P{sample?.positionCurrent ?? '—'}
          </span>
          <span>ALT · {alt}m</span>
        </div>
      </Draggable>
    </>
  );
}
