import { useCallback, useEffect, useRef, useState } from 'react';

function evenWidths(count) {
  const share = 100 / count;
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? 100 - share * (count - 1) : share,
  );
}

function minWidthPercent(minPanelWidth, containerWidth) {
  if (!minPanelWidth || !containerWidth) return 18;
  return (minPanelWidth / containerWidth) * 100;
}

export function ResizableEditorLayout({
  stages,
  attributes,
  detail,
  minPanelWidth,
  className = '',
}) {
  const panelCount = detail != null ? 3 : 2;
  const [widths, setWidths] = useState(() => evenWidths(panelCount));
  const dragging = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setWidths(evenWidths(panelCount));
  }, [panelCount]);

  const onPointerDown = useCallback(
    (index, e) => {
      e.preventDefault();
      dragging.current = { index, startX: e.clientX, startWidths: [...widths] };

      const onMove = (ev) => {
        if (!dragging.current || !containerRef.current) return;
        const { index: i, startX, startWidths } = dragging.current;
        const rect = containerRef.current.getBoundingClientRect();
        const deltaPct = ((ev.clientX - startX) / rect.width) * 100;
        const next = [...startWidths];
        const min = minWidthPercent(minPanelWidth, rect.width);

        const before = next.slice(0, i).reduce((s, w) => s + w, 0);
        const after = next.slice(i + 2).reduce((s, w) => s + w, 0);
        const remaining = 100 - before - after;

        let left = next[i] + deltaPct;
        left = Math.max(min, Math.min(left, remaining - min));
        const right = remaining - left;

        next[i] = left;
        next[i + 1] = right;
        setWidths(next);
      };

      const onUp = () => {
        dragging.current = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [widths, minPanelWidth],
  );

  const panels = [
    { key: 'stages', node: stages },
    { key: 'attributes', node: attributes },
    ...(detail != null ? [{ key: 'detail', node: detail }] : []),
  ];

  const rootClass = ['resizable-editor', className].filter(Boolean).join(' ');

  return (
    <div className={rootClass} ref={containerRef}>
      {panels.map((panel, i) => (
        <div
          key={panel.key}
          className="resizable-panel"
          style={{
            width: `${widths[i]}%`,
            ...(minPanelWidth ? { minWidth: minPanelWidth } : {}),
          }}
        >
          <div className="resizable-panel-inner">{panel.node}</div>
          {i < panels.length - 1 && (
            <div
              className="resize-handle"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={(e) => onPointerDown(i, e)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
