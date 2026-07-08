import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function SelectChevron() {
  return (
    <svg
      className="select-field-chevron"
      width={16}
      height={16}
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

export function SelectField({
  value,
  onChange,
  options,
  ariaLabel,
  className = '',
  placement = 'auto',
}) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState(null);
  const rootRef = useRef(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? options[0];

  const close = useCallback(() => {
    setOpen(false);
    setHighlightIndex(-1);
    setMenuStyle(null);
  }, []);

  const selectOption = useCallback(
    (option) => {
      onChange(option.value);
      close();
    },
    [onChange, close],
  );

  const updateMenuPosition = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const estimatedHeight = Math.min(220, options.length * 36 + 8);
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    let openUp = placement === 'top';
    if (placement === 'auto') {
      openUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    }

    if (openUp) {
      setMenuStyle({
        placement: 'top',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(220, Math.max(spaceAbove, 80)),
      });
    } else {
      setMenuStyle({
        placement: 'bottom',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(220, Math.max(spaceBelow, 80)),
      });
    }
  }, [options.length, placement]);

  useEffect(() => {
    if (!open) return undefined;

    updateMenuPosition();

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);

    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      const root = rootRef.current;
      const menu = document.getElementById(listId);
      if (root?.contains(e.target) || menu?.contains(e.target)) return;
      close();
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % options.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
      } else if (e.key === 'Enter' && highlightIndex >= 0) {
        e.preventDefault();
        selectOption(options[highlightIndex]);
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close, options, highlightIndex, selectOption, listId]);

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setHighlightIndex(idx >= 0 ? idx : 0);
    }
  }, [open, options, value]);

  const menu =
    open && menuStyle
      ? createPortal(
          <ul
            id={listId}
            className="select-field-menu"
            role="listbox"
            style={{
              position: 'fixed',
              left: menuStyle.left,
              width: menuStyle.width,
              maxHeight: menuStyle.maxHeight,
              ...(menuStyle.placement === 'top'
                ? { bottom: menuStyle.bottom, top: 'auto' }
                : { top: menuStyle.top, bottom: 'auto' }),
            }}
          >
            {options.map((option, i) => (
              <li key={option.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`select-field-option ${
                    option.value === value ? 'selected' : ''
                  } ${i === highlightIndex ? 'highlighted' : ''} ${
                    option.description ? 'has-description' : ''
                  }`}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onClick={() => selectOption(option)}
                >
                  <span className="select-field-option-label">{option.label}</span>
                  {option.description && (
                    <span className="select-field-option-description">
                      {option.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={`select-field ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="select-field-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{selected?.label}</span>
        <SelectChevron />
      </button>
      {menu}
    </div>
  );
}
