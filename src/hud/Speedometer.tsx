import type { CSSProperties } from 'react';
import type { TelemetrySample } from '../data/schema';
import { convertSpeed, speedUnitLabel, clamp } from '../util/units';
import type { SpeedUnit } from '../util/units';
import { Draggable } from './Draggable';

interface Props {
  sample: TelemetrySample | null;
  unit: SpeedUnit;
  rpmMax: number;
}

const W = 300;
const H = 280;
const CX = 140;
const CY = 140;
const R = 185;

const START_DEG = 150;
const END_DEG = 330;
const SPAN_DEG = END_DEG - START_DEG;

const TICK_COUNT = 8;
const REDLINE_TICK = 7;

// The arc is 180° sweeping from 150° (lower-left) over the top (270°) to
// 330° (upper-right). Its visible bounding box is y∈[-45, 232.5], which is
// centered around y≈94, not y=140. We place the inner ring + text overlays
// at this visual center so they sit inside the arc instead of below it.
const INNER_CY = 120;

const ARC_CX = 1920 - W + CX; // 1760
const INNER_CY_STAGE = 1080 - H + INNER_CY; // 894

const FONT: CSSProperties = { fontFamily: "'Barlow Condensed', sans-serif" };

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} ${sweep} ${end.x} ${end.y}`;
}

function stageBox(cx: number, cy: number, w: number, h: number): CSSProperties {
  return {
    position: 'absolute',
    left: cx - w / 2,
    top: cy - h / 2,
    width: w,
    height: h,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

export function Speedometer({ sample, unit, rpmMax }: Props) {
  const speedKmh = sample?.speedKmh ?? 0;
  const speed = convertSpeed(speedKmh, unit);
  const speedDisplay = Math.max(0, Math.round(speed)).toString().padStart(3, '0');
  const gear = sample?.gear ?? 'N';
  const abs = sample?.abs ?? false;
  const tcs = sample?.tcs ?? false;
  const rpm = sample?.rpm ?? 0;
  const rpmFrac = clamp(rpm / (sample?.rpmMax ?? rpmMax), 0, 1);
  const rpmEnd = START_DEG + SPAN_DEG * rpmFrac;
  const overRedline = rpmFrac > REDLINE_TICK / (TICK_COUNT - 1);

  const redlineStartDeg = START_DEG + (SPAN_DEG * REDLINE_TICK) / (TICK_COUNT - 1);
  const rpmNeedleInner = polar(CX, CY, R - 6, rpmEnd);
  const rpmNeedleOuter = polar(CX, CY, R + 10, rpmEnd);

  const ticks = Array.from({ length: TICK_COUNT }, (_, i) => {
    const deg = START_DEG + (SPAN_DEG * i) / (TICK_COUNT - 1);
    const inner = polar(CX, CY, R - 9, deg);
    const outer = polar(CX, CY, R + 1, deg);
    const label = polar(CX, CY, R - 26, deg);
    return { i, deg, inner, outer, label };
  });

  return (
    <>
      <Draggable
        id="speedo.arc"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: W,
          height: H,
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <path
            d={describeArc(CX, CY, R, START_DEG, END_DEG)}
            fill="none"
            stroke="rgba(255,255,255,0.38)"
            strokeWidth={1.5}
          />
          <path
            d={describeArc(CX, CY, R, redlineStartDeg, END_DEG)}
            fill="none"
            stroke="var(--hud-accent)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
          {rpmFrac > 0.001 && (
            <path
              d={describeArc(CX, CY, R, START_DEG, rpmEnd)}
              fill="none"
              stroke={overRedline ? 'var(--hud-accent)' : '#ffffff'}
              strokeWidth={3}
              strokeLinecap="round"
            />
          )}
          {rpmFrac > 0.001 && (
            <line
              x1={rpmNeedleInner.x}
              y1={rpmNeedleInner.y}
              x2={rpmNeedleOuter.x}
              y2={rpmNeedleOuter.y}
              stroke={overRedline ? 'var(--hud-accent)' : '#ffffff'}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          )}
          {ticks.map(t => (
            <g key={t.i}>
              <line
                x1={t.inner.x}
                y1={t.inner.y}
                x2={t.outer.x}
                y2={t.outer.y}
                stroke={t.i >= REDLINE_TICK ? 'var(--hud-accent)' : 'rgba(255,255,255,0.55)'}
                strokeWidth={1.25}
              />
              <text
                x={t.label.x}
                y={t.label.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill={t.i >= REDLINE_TICK ? 'var(--hud-accent)' : 'rgba(255,255,255,0.75)'}
                fontSize={13}
                fontWeight={500}
                style={FONT}
              >
                {t.i}
              </text>
            </g>
          ))}
          <circle
            cx={CX}
            cy={INNER_CY}
            r={30}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1}
          />
        </svg>
      </Draggable>

      <Draggable id="speedo.gear" style={stageBox(ARC_CX, INNER_CY_STAGE, 60, 50)}>
        <div style={{ ...FONT, fontSize: 40, color: '#fff', lineHeight: 1 }}>{gear}</div>
      </Draggable>

      <Draggable id="speedo.abs" style={stageBox(ARC_CX - 62, INNER_CY_STAGE - 6, 44, 16)}>
        <div
          style={{
            ...FONT,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '1.6px',
            color: '#fff',
            opacity: abs ? 1 : 0.35,
          }}
        >
          ABS
        </div>
      </Draggable>

      <Draggable id="speedo.tcr" style={stageBox(ARC_CX - 62, INNER_CY_STAGE + 8, 44, 16)}>
        <div
          style={{
            ...FONT,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '1.6px',
            color: '#fff',
            opacity: tcs ? 1 : 0.35,
          }}
        >
          TCR
        </div>
      </Draggable>

      <Draggable id="speedo.unit" style={stageBox(ARC_CX + 62, INNER_CY_STAGE + 1, 44, 16)}>
        <div
          style={{
            ...FONT,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: '1.1px',
            color: '#fff',
            opacity: 0.85,
          }}
        >
          {speedUnitLabel(unit)}
        </div>
      </Draggable>

      <Draggable id="speedo.speed" style={stageBox(ARC_CX, INNER_CY_STAGE + 90, 200, 80)}>
        <div
          style={{
            ...FONT,
            fontSize: 78,
            fontWeight: 300,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          {speedDisplay}
        </div>
      </Draggable>
    </>
  );
}
