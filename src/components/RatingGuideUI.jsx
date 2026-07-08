import { useEffect, useRef, useState } from 'react';
import {
  IconButton,
  IconCheck,
  IconEdit,
  IconPlus,
  IconReset,
  IconSparkles,
  IconTrash,
} from './HubUI.jsx';
import { SelectField } from './SelectField.jsx';

const SNACKBAR_DURATION_MS = 4000;
const EDIT_MODE_SNACKBAR = 'Save or cancel your changes before leaving edit mode.';

export function VersionDropdown({ version, onChange }) {
  return (
    <div className="version-dropdown-wrap">
      <SelectField
        value={version}
        onChange={onChange}
        ariaLabel="Scoring model"
        className="version-dropdown-select"
        placement="bottom"
        options={[
          {
            value: 'v1',
            label: 'Attribute checklist',
            description: 'Score each behavior Pass/Fail or Percentage. Default.',
          },
          {
            value: 'v2',
            label: 'Stage rating guide',
            description: 'Rate each call stage on a 1–5 scale for holistic scoring.',
          },
        ]}
      />
    </div>
  );
}

function levelSnapshot(level) {
  return {
    description: level.description,
    minimumStandard: level.minimumStandard,
  };
}

function draftsEqual(a, b) {
  return (
    a.description === b.description && a.minimumStandard === b.minimumStandard
  );
}

export function RatingGuidePanel({
  section,
  selectedLevelId,
  onSelectLevel,
  onAddLevel,
  onRemoveLevel,
  onUpdateLevel,
  onSetMinimumStandard,
  onGenerateWithAI,
  onResetGuide,
}) {
  const [generating, setGenerating] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [snackbar, setSnackbar] = useState(null);
  const editingCardRef = useRef(null);
  const snackbarTimerRef = useRef(null);

  const guide = section.ratingGuide;
  const levels = guide?.levels ?? [];
  const canRemove = levels.length > 2;
  const selectedLevel = levels.find((l) => l.id === selectedLevelId);
  const isDirty =
    editDraft != null &&
    editSnapshot != null &&
    !draftsEqual(editDraft, editSnapshot);

  const showSnackbar = (message) => {
    setSnackbar(message);
    if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    snackbarTimerRef.current = setTimeout(() => {
      setSnackbar(null);
      snackbarTimerRef.current = null;
    }, SNACKBAR_DURATION_MS);
  };

  useEffect(() => {
    if (!selectedLevelId) {
      setEditDraft(null);
      setEditSnapshot(null);
      return;
    }
    const level = levels.find((l) => l.id === selectedLevelId);
    if (!level) return;
    const snap = levelSnapshot(level);
    setEditSnapshot(snap);
    setEditDraft(snap);
  }, [selectedLevelId, section.id, levels]);

  useEffect(
    () => () => {
      if (snackbarTimerRef.current) clearTimeout(snackbarTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!selectedLevelId) return undefined;

    const onPointerDown = (e) => {
      const card = editingCardRef.current;
      if (!card || card.contains(e.target)) return;
      if (isDirty) {
        showSnackbar(EDIT_MODE_SNACKBAR);
        return;
      }
      onSelectLevel(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [selectedLevelId, isDirty, onSelectLevel]);

  const handleGenerate = async () => {
    if (selectedLevelId && isDirty) {
      showSnackbar(EDIT_MODE_SNACKBAR);
      return;
    }
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 600));
    onGenerateWithAI();
    setGenerating(false);
    showSnackbar('Draft generated from template — review and edit before publishing.');
  };

  const startEditing = (levelId) => {
    if (selectedLevelId && selectedLevelId !== levelId) {
      if (isDirty) {
        showSnackbar(EDIT_MODE_SNACKBAR);
        return;
      }
    }
    onSelectLevel(levelId);
  };

  const handleCancel = () => {
    onSelectLevel(null);
  };

  const handleSave = () => {
    if (!selectedLevelId || !editDraft) return;
    onUpdateLevel(selectedLevelId, { description: editDraft.description });
    onSetMinimumStandard(selectedLevelId, editDraft.minimumStandard);
    onSelectLevel(null);
  };

  const handleReset = () => {
    if (selectedLevelId && isDirty) {
      showSnackbar(EDIT_MODE_SNACKBAR);
      return;
    }
    onResetGuide();
  };

  const handleAddLevel = () => {
    if (selectedLevelId && isDirty) {
      showSnackbar(EDIT_MODE_SNACKBAR);
      return;
    }
    onAddLevel();
  };

  const cardActions = (level, editing) => (
    <div className="rating-level-card-actions">
      {editing ? (
        <>
          <button type="button" className="rating-level-cancel" onClick={handleCancel}>
            Cancel
          </button>
          <IconButton label="Save rating" onClick={handleSave}>
            <IconCheck />
          </IconButton>
        </>
      ) : (
        <IconButton label="Edit rating" onClick={() => startEditing(level.id)}>
          <IconEdit />
        </IconButton>
      )}
      {canRemove && (
        <IconButton
          label="Remove rating"
          variant="danger"
          onClick={() => onRemoveLevel(level.id)}
        >
          <IconTrash />
        </IconButton>
      )}
    </div>
  );

  return (
    <div className="attr-list panel-fill rating-guide-panel">
      <div className="panel-head">
        <div>
          <h3>Rating guide</h3>
          <span className="panel-sub">{section.name}</span>
        </div>
        <div className="panel-head-actions rating-guide-head-actions">
          <IconButton
            label="Generate draft"
            onClick={handleGenerate}
            disabled={generating}
          >
            <IconSparkles />
          </IconButton>
          <IconButton label="Reset to default" onClick={handleReset}>
            <IconReset />
          </IconButton>
          <IconButton label="Add rating" onClick={handleAddLevel}>
            <IconPlus />
          </IconButton>
        </div>
      </div>

      <div className="rating-guide-levels">
        {levels.map((level) => {
          const isEditing = level.id === selectedLevelId;

          if (isEditing && editDraft) {
            return (
              <div
                key={level.id}
                ref={editingCardRef}
                className="rating-level-card rating-level-card-editing"
              >
                <div className="rating-level-settings-head">
                  <span className="rating-level-score rating-level-score-lg">
                    Rate {level.score}
                  </span>
                  {cardActions(level, true)}
                </div>
                <label>
                  Rating definition
                  <textarea
                    rows={3}
                    value={editDraft.description}
                    onChange={(e) =>
                      setEditDraft((prev) => ({ ...prev, description: e.target.value }))
                    }
                    autoFocus
                  />
                </label>
                <label className="toggle-row block">
                  <input
                    type="checkbox"
                    checked={editDraft.minimumStandard}
                    onChange={(e) =>
                      setEditDraft((prev) => ({
                        ...prev,
                        minimumStandard: e.target.checked,
                      }))
                    }
                  />
                  <span className="toggle-copy">
                    <span className="toggle-label">Minimum standard</span>
                    <span className="toggle-hint">
                      Below this rating flags the stage for coaching.
                    </span>
                  </span>
                </label>
              </div>
            );
          }

          return (
            <div key={level.id} className="rating-level-card rating-level-card-preview">
              <div className="rating-level-preview-content">
                <span className="rating-level-score">Rate {level.score}</span>
                <span className="rating-level-preview-text">{level.description}</span>
                {level.minimumStandard && (
                  <span className="mini-badge req">Min standard</span>
                )}
              </div>
              {cardActions(level, false)}
            </div>
          );
        })}
      </div>

      {snackbar && (
        <div className="rating-guide-snackbar" role="status">
          {snackbar}
        </div>
      )}
    </div>
  );
}
