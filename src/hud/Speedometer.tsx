import type { TelemetrySample } from '../data/schema';
import { convertSpeed, speedUnitLabel, clamp } from '../util/units';
import type { SpeedUnit } from '../util/units';
import { Draggable } from './Draggable';

interface Props {
  sample: TelemetrySample | null;
  unit: SpeedUnit;
  rpmMax: number;
}

const GAUGE = 340;
const CX = GAUGE / 2;
const CY = GAUGE / 2;
const R = 146;
const START_DEG = 135;
const END_DEG = 405;
const SWEEP = END_DEG - START_DEG;
const BLUE_FRAC = 5500 / 8000;
const RED_FRAC = 7000 / 8000;

function polar(deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [CX + Math.cos(r) * R, CY + Math.sin(r) * R];
}

function makeArc(d1: number, d2: number): string {
  const [x1, y1] = polar(d1);
  const [x2, y2] = polar(d2);
  const large = d2 - d1 > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
}

export function Speedometer({ sample, unit, rpmMax }: Props) {
  const speedKmh = sample?.speedKmh ?? 0;
  const speed = convertSpeed(speedKmh, unit);
  const speedDisplay = Math.max(0, Math.round(speed)).toString();
  const gear = sample?.gear ?? 'N';
  const abs = sample?.abs ?? false;
  const tcs = sample?.tcs ?? false;
  const rpm = sample?.rpm ?? 0;
  const maxRpm = sample?.rpmMax ?? rpmMax;
  const rpmFrac = clamp(rpm / maxRpm, 0, 1);

  const blueDeg = START_DEG + SWEEP * BLUE_FRAC;
  const redDeg = START_DEG + SWEEP * RED_FRAC;
  const curDeg = START_DEG + SWEEP * rpmFrac;
  const whiteEnd = Math.min(curDeg, blueDeg);
  const [dotX, dotY] = polar(curDeg);

  return (
    <Draggable
      id="speedo.gauge"
      style={{
        position: 'absolute',
        right: 48,
        bottom: 48,
        width: GAUGE,
        height: GAUGE,
        fontFamily: 'var(--mono)',
        filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.7))',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: GAUGE,
          height: GAUGE,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(10,12,14,0.88) 0%, rgba(10,12,14,0.5) 55%, rgba(10,12,14,0) 72%)',
        }}
      >
        <svg
          viewBox={`0 0 ${GAUGE} ${GAUGE}`}
          width={GAUGE}
          height={GAUGE}
          style={{ position: 'absolute', inset: 0 }}
        >
          <circle cx={CX} cy={CY} r={R + 16} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
          <circle cx={CX} cy={CY} r={R - 22} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

          {/* RPM background track */}
          <path
            d={makeArc(START_DEG, END_DEG)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={8}
          />
          {/* Blue zone */}
          <path
            d={makeArc(blueDeg, redDeg)}
            fill="none"
            stroke="oklch(0.65 0.15 240)"
            strokeWidth={8}
            opacity={0.7}
          />
          {/* Red zone */}
          <path
            d={makeArc(redDeg, END_DEG)}
            fill="none"
            stroke="oklch(0.55 0.22 25)"
            strokeWidth={8}
            opacity={0.85}
          />
          {/* Active white arc */}
          {whiteEnd > START_DEG + 1 && (
            <path
              d={makeArc(START_DEG, whiteEnd)}
              fill="none"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={8}
              style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' }}
            />
          )}
          {/* Marker dot */}
          {rpmFrac > 0.001 && (
            <circle
              cx={dotX}
              cy={dotY}
              r={5}
              fill="white"
              style={{ filter: 'drop-shadow(0 0 6px white)' }}
            />
          )}
        </svg>

        {/* Center stack */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            className="tnum"
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 32,
              color: 'var(--ink)',
              lineHeight: 1,
            }}
          >
            {speedDisplay}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.25em',
              color: 'var(--ink-dim)',
              marginTop: 3,
            }}
          >
            {speedUnitLabel(unit)}
          </div>
          <div
            className="tnum"
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 900,
              fontSize: 100,
              lineHeight: 0.85,
              color: 'var(--ink)',
              marginTop: 6,
              textShadow: '0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            {gear}
          </div>
          <div
            className="tnum"
            style={{
              fontFamily: 'var(--sans)',
              fontWeight: 700,
              fontSize: 30,
              color: 'var(--ink)',
              lineHeight: 1,
              marginTop: 8,
            }}
          >
            {Math.round(rpm)}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: '0.25em',
              color: 'var(--ink-dim)',
              marginTop: 3,
            }}
          >
            RPM
          </div>
        </div>

        {/* Assist badges */}
        <div
          style={{
            position: 'absolute',
            bottom: 58,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 14,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: abs ? 'var(--teal)' : 'var(--ink-faint)' }}>ABS</span>
          <span style={{ color: tcs ? 'var(--teal)' : 'var(--ink-faint)' }}>TCR</span>
          <span style={{ color: 'var(--ink-faint)' }}>ESP</span>
        </div>
      </div>
    </Draggable>
  );
}
