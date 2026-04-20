import { useRef } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { usePlayback, type WidgetId } from '../playback/store';

interface Props {
  id: WidgetId;
  children: ReactNode;
  style?: CSSProperties;
}

export function Draggable({ id, children, style }: Props) {
  const offset = usePlayback(s => s.layout[id]);
  const editMode = usePlayback(s => s.editMode);
  const exporterMode = usePlayback(s => s.exporterMode);
  const stageScale = usePlayback(s => s.stageScale);

  const startRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const active = editMode && !exporterMode;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    e.stopPropagation();
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    startRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !startRef.current || startRef.current.pointerId !== e.pointerId) return;
    const scale = stageScale || 1;
    const dx = (e.clientX - startRef.current.startX) / scale;
    const dy = (e.clientY - startRef.current.startY) / scale;
    usePlayback.getState().setWidgetOffset(
      id,
      Math.round(startRef.current.baseX + dx),
      Math.round(startRef.current.baseY + dy),
    );
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startRef.current?.pointerId === e.pointerId) {
      startRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      style={{
        ...style,
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        outline: active ? '1px dashed rgba(108, 204, 255, 0.7)' : 'none',
        outlineOffset: active ? 4 : 0,
        cursor: active ? 'move' : 'default',
        pointerEvents: active ? 'auto' : 'none',
        touchAction: active ? 'none' : 'auto',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {children}
      {active && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -20,
            fontSize: 11,
            fontFamily: 'system-ui, sans-serif',
            background: 'rgba(108, 204, 255, 0.85)',
            color: '#001',
            padding: '2px 6px',
            borderRadius: 3,
            letterSpacing: 0,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {id} · {offset.x}, {offset.y}
        </div>
      )}
    </div>
  );
}
