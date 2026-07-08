import { useRef, useState } from 'react';

export function HoverTooltip({ label, children, className = '' }) {
  const [coords, setCoords] = useState(null);
  const anchorRef = useRef(null);

  const show = () => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ x: rect.left + rect.width / 2, y: rect.top });
  };
  const hide = () => setCoords(null);

  return (
    <span
      ref={anchorRef}
      className={`hover-tooltip-anchor ${className}`}
      tabIndex={0}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords && (
        <span
          className="hover-tooltip-bubble"
          style={{ left: coords.x, top: coords.y }}
          role="tooltip"
        >
          {label}
        </span>
      )}
    </span>
  );
}
