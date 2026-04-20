import type { Track, TrackLayer, TrackPoint, TelemetrySample } from '../data/schema';
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

// Real-world scale: half-width of the visible disc in meters. The disc
// pixel radius maps to this many meters, so the visible diameter is 2×.
const VIEW_RADIUS_M = 200;
const M_TO_PX = RADIUS / VIEW_RADIUS_M;

// Track coords are now in meters (see util/projection.ts). toViewCoord
// converts world meters into SVG pixels centered on the disc origin; the
// outer <g> translates the car to ANCHOR_Y and rotates for heading-up.
function toViewCoord(x: number, y: number): [number, number] {
  return [DISC / 2 + x * M_TO_PX, DISC / 2 + y * M_TO_PX];
}

// Pick a "round" scale-bar length that fits comfortably inside the disc.
function pickScaleBarMeters(): number {
  const targetPx = RADIUS * 0.55;
  const targetM = targetPx / M_TO_PX;
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000];
  let best = steps[0];
  for (const s of steps) if (s <= targetM) best = s;
  return best;
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

  const pointsToPath = (pts: TrackPoint[]): string =>
    pts
      .map((p, i) => {
        const [vx, vy] = toViewCoord(p.x, p.y);
        return `${i === 0 ? 'M' : 'L'} ${vx.toFixed(2)} ${vy.toFixed(2)}`;
      })
      .join(' ');

  const layers = track?.layers ?? [];
  const referenceLayers = layers.filter(l => l.kind === 'reference');
  const plannedLayer = layers.find(l => l.kind === 'planned');
  const drivenLayer = layers.find(l => l.kind === 'driven') ?? plannedLayer;

  const splitAtProgress = (layer: TrackLayer): { walked: TrackPoint[]; ahead: TrackPoint[] } => {
    const pts = layer.points;
    if (pts.length < 2) return { walked: pts, ahead: [] };
    const hasTime = pts[0].t !== undefined;
    const target =
      hasTime && sample
        ? currentTime
        : progressFrac * layer.totalLength;
    let cut = 0;
    if (hasTime) {
      for (let i = 0; i < pts.length; i++) {
        if ((pts[i].t ?? 0) <= target) cut = i;
        else break;
      }
    } else {
      for (let i = 0; i < pts.length; i++) {
        if (pts[i].distance <= target) cut = i;
        else break;
      }
    }
    cut = Math.max(0, Math.min(pts.length - 1, cut));
    return {
      walked: pts.slice(0, cut + 1),
      ahead: pts.slice(cut),
    };
  };

  const drivenSplit = drivenLayer ? splitAtProgress(drivenLayer) : null;

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

  // track.totalLength is already in meters (shared planar frame).
  const routeLayer = plannedLayer ?? drivenLayer;
  const trackLenM = routeLayer?.totalLength ?? 0;
  const distLabel = trackLenM > 0 ? `${(trackLenM / 1000).toFixed(2)} KM` : '— KM';

  const scaleBarM = pickScaleBarMeters();
  const scaleBarPx = scaleBarM * M_TO_PX;
  const scaleBarLabel = scaleBarM >= 1000 ? `${scaleBarM / 1000} KM` : `${scaleBarM} M`;
  const finishLayer = plannedLayer ?? drivenLayer;
  const finish =
    finishLayer && finishLayer.points.length
      ? toViewCoord(
          finishLayer.points[finishLayer.points.length - 1].x,
          finishLayer.points[finishLayer.points.length - 1].y,
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
                  {/* Reference layers — dim gray, background context */}
                  {referenceLayers.map((layer, i) => (
                    <path
                      key={`ref-${i}`}
                      d={pointsToPath(layer.points)}
                      fill="none"
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {/* Planned route — full length, dim teal */}
                  {plannedLayer && (
                    <path
                      d={pointsToPath(plannedLayer.points)}
                      fill="none"
                      stroke="var(--teal)"
                      strokeWidth={7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.45}
                    />
                  )}
                  {/* Driven ahead — dim continuation of current path */}
                  {drivenSplit && drivenSplit.ahead.length > 1 && !plannedLayer && (
                    <path
                      d={pointsToPath(drivenSplit.ahead)}
                      fill="none"
                      stroke="var(--teal)"
                      strokeWidth={7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.55}
                    />
                  )}
                  {/* Driven walked — bright amber, trailing from start to car */}
                  {drivenSplit && drivenSplit.walked.length > 1 && (
                    <path
                      d={pointsToPath(drivenSplit.walked)}
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

            {/* Scale bar — fixed, untilted */}
            <g transform={`translate(${DISC / 2 - scaleBarPx / 2} ${DISC - 18})`}>
              <line
                x1={0}
                y1={0}
                x2={scaleBarPx}
                y2={0}
                stroke="var(--ink)"
                strokeWidth={1.5}
              />
              <line x1={0} y1={-3} x2={0} y2={3} stroke="var(--ink)" strokeWidth={1.5} />
              <line
                x1={scaleBarPx}
                y1={-3}
                x2={scaleBarPx}
                y2={3}
                stroke="var(--ink)"
                strokeWidth={1.5}
              />
              <text
                x={scaleBarPx / 2}
                y={-6}
                textAnchor="middle"
                fill="var(--ink-dim)"
                fontFamily="var(--mono)"
                fontSize={9}
                letterSpacing="0.18em"
              >
                {scaleBarLabel}
              </text>
            </g>
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
