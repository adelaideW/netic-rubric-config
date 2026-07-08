function SectionChevron({ open }) {
  return (
    <svg
      className={`collapsible-chevron ${open ? 'open' : ''}`}
      width={20}
      height={20}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CollapsibleSection({ title, open, onToggle, children, className = '' }) {
  return (
    <div className={`collapsible-section ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-section-trigger"
        aria-expanded={open}
        onClick={() => onToggle(!open)}
      >
        <span>{title}</span>
        <SectionChevron open={open} />
      </button>
      {open && <div className="collapsible-section-body">{children}</div>}
    </div>
  );
}
