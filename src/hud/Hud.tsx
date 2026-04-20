import { useEffect, useMemo, useRef } from 'react';
import { usePlayback } from '../playback/store';
import { sampleAt } from '../data/telemetry';
import { Speedometer } from './Speedometer';
import { Minimap } from './Minimap';
import { TopLeftStatus } from './TopLeftStatus';
import { TopRightPosition } from './TopRightPosition';

const STAGE_W = 1920;
const STAGE_H = 1080;

export function Hud() {
  const telemetry = usePlayback(s => s.telemetry);
  const track = usePlayback(s => s.track);
  const currentTime = usePlayback(s => s.currentTime);
  const unit = usePlayback(s => s.unit);
  const profile = usePlayback(s => s.profile);

  const sample = useMemo(
    () => (telemetry ? sampleAt(telemetry, currentTime) : null),
    [telemetry, currentTime],
  );

  const rpmMax = telemetry?.rpmMax ?? 8000;

  const wrapRef = useRef<HTMLDivElement>(null);
  const scale = usePlayback(s => s.stageScale);
  const editMode = usePlayback(s => s.editMode);
  const exporterMode = usePlayback(s => s.exporterMode);

  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      usePlayback.getState().setStageScale(Math.min(width / STAGE_W, height / STAGE_H));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: editMode && !exporterMode ? 'auto' : 'none',
      }}
    >
      <div
        className="hud-root"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <TopLeftStatus sample={sample} currentTime={currentTime} />
        <TopRightPosition sample={sample} />
        <Minimap
          track={track}
          sample={sample}
          currentTime={currentTime}
          playerName={profile.name}
        />
        <Speedometer sample={sample} unit={unit} rpmMax={rpmMax} />
      </div>
    </div>
  );
}
