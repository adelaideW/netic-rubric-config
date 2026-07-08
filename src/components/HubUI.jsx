const ICON = 16;

export function IconEdit() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M11.5 2.5a1.4 1.4 0 0 1 2 2L5.5 12.5 2 13.5l1-3.5L11.5 2.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDuplicate() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5" y="5" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M3 11V3a1 1 0 0 1 1-1h8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconShare() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="12" cy="4" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.25" />
      <path d="M6 7l4-2M6 9l4 2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 4.5h10M6 4.5V3.5h4v1M5 4.5v8a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPlus() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M8 3.5v9M3.5 8h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconInfo() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M8 7.25V11"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="5.25" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function IconGrip() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="5.5" cy="4" r="1" fill="currentColor" />
      <circle cx="10.5" cy="4" r="1" fill="currentColor" />
      <circle cx="5.5" cy="8" r="1" fill="currentColor" />
      <circle cx="10.5" cy="8" r="1" fill="currentColor" />
      <circle cx="5.5" cy="12" r="1" fill="currentColor" />
      <circle cx="10.5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconReset() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8a4.5 4.5 0 0 1 7.6-3.2M12.5 8A4.5 4.5 0 0 1 4.9 11.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 4.5v3.5h3.5"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSparkles() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2.5v2M8 11.5v2M2.5 8h2M11.5 8h2M4.4 4.4l1.4 1.4M10.2 10.2l1.4 1.4M4.4 11.6l1.4-1.4M10.2 5.8l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.25" />
    </svg>
  );
}

export function IconCheck() {
  return (
    <svg width={ICON} height={ICON} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconButton({ label, onClick, disabled, children, variant }) {
  return (
    <button
      type="button"
      className={`icon-btn ${variant === 'danger' ? 'icon-btn-danger' : ''}`}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function AdoptToggle({ checked, disabled, onChange, id }) {
  return (
    <label className={`adopt-toggle ${disabled ? 'disabled' : ''}`} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="adopt-toggle-track">
        <span className="adopt-toggle-thumb" />
      </span>
    </label>
  );
}

export function StatusPill({ status }) {
  const labels = {
    active: 'Active',
    draft: 'Draft',
    deactivated: 'Inactive',
  };
  return <span className={`pill pill-status pill-${status}`}>{labels[status]}</span>;
}
