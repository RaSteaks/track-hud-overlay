import type { TelemetrySample } from '../data/schema';
import { Draggable } from './Draggable';

interface Props {
  sample: TelemetrySample | null;
}

export function TopRightPosition({ sample }: Props) {
  const cur = sample?.positionCurrent ?? 1;
  const tot = sample?.positionTotal ?? 12;
  return (
    <Draggable
      id="topRight"
      style={{
        position: 'absolute',
        right: '2.5%',
        top: '4%',
        display: 'flex',
        alignItems: 'baseline',
        gap: 10,
      }}
    >
      <span style={{ fontSize: 14, letterSpacing: '0.22em', opacity: 0.75 }}>POSITION</span>
      <span style={{ fontSize: 44, fontWeight: 400, lineHeight: 1 }}>
        {cur}
        <span style={{ opacity: 0.6, margin: '0 2px' }}>/</span>
        {tot}
      </span>
    </Draggable>
  );
}
