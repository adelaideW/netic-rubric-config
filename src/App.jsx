import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ATTR_MODE, ATTR_MODE_LABEL, cloneRubric, createEmptyAttribute, createEmptySection, defaultRubric, WEIGHT_MODE, CALL_TYPE_OPTIONS, normalizeCallType } from './data/defaultRubric.js';
import {
  createInitialRegistry,
  DEMO_RUBRIC_CREATE_PREFILL,
  generateRubricFromPrompt,
  registryToRow,
  suggestRubricMetaFromPrompt,
  usesLeadTemplateFromPrompt,
} from './data/rubricRegistry.js';
import { sampleCalls, callLog, teamPerformance, teamSummary } from './data/sampleCalls.js';
import {
  applyAttributeCustomWeight,
  attributeWeightBadgePercent,
  attributeWeightPercentInSection,
  attributeWeightSumPercent,
  attributeWeightsValid,
  clampSectionCoachingThreshold,
  coachingThresholdUnitSuffix,
  convertSectionToCustomWeights,
  defaultSectionCoachingThresholds,
  getCoachingThresholdUnit,
  getSectionCoachingThreshold,
  normalizeSectionWeights,
  resetSectionToEqualWeights,
  scoreCall,
  sectionThresholdDisplayToPoints,
  sectionThresholdPointsToDisplay,
  sectionWeightPercent,
  sectionWeightSum,
  sectionUsesCustomWeights,
  syncAttributeWeightsAfterListChange,
} from './lib/scoring.js';
import {
  ScoreBreakdown,
  ScoreCircle,
  RubricScoringInfoTip,
  ScoringFormulaBar,
  WeightSlider,
} from './components/ScoringUI.jsx';
import { CollapsibleSection } from './components/CollapsibleSection.jsx';
import { HoverTooltip } from './components/HoverTooltip.jsx';
import { ResizableEditorLayout } from './components/ResizableEditorLayout.jsx';
import {
  RatingGuidePanel,
  VersionDropdown,
} from './components/RatingGuideUI.jsx';
import {
  EDITOR_VERSIONS,
  createRatingLevel,
  defaultRatingGuideForSection,
  ensureSectionRatingGuide,
  generateRatingGuideWithAI,
  renumberRatingLevels,
  scoreCallV2,
} from './data/ratingGuideV2.js';
import { SelectField } from './components/SelectField.jsx';
import {
  AdoptToggle,
  IconButton,
  IconDuplicate,
  IconEdit,
  IconGrip,
  IconPlus,
  IconShare,
  IconTrash,
} from './components/HubUI.jsx';

const VIEWS = ['hub', 'edit', 'scoring', 'preview', 'dashboard'];
const STAGE_NAME_MAX_LENGTH = 60;

const EDITOR_TABS = [
  ['preview', 'Preview'],
  ['edit', 'Details'],
  ['scoring', 'Coaching'],
];

function EditorTabs({ activeTab, onTab }) {
  return (
    <div className="tabs">
      {EDITOR_TABS.map(([tab, label]) => (
        <button
          key={tab}
          type="button"
          className={`tab ${activeTab === tab ? 'active' : ''}`}
          onClick={() => onTab(tab)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function parseView() {
  const v = new URLSearchParams(window.location.search).get('view');
  return VIEWS.includes(v) ? v : 'hub';
}

function parseSection() {
  return (
    new URLSearchParams(window.location.search).get('section') ||
    defaultRubric.sections[0].id
  );
}

function firstAttributeId(section) {
  return section?.attributes[0]?.id ?? null;
}

function parseStageWeightPercent(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits === '') return 0;
  const normalized = digits.replace(/^0+/, '') || '0';
  return Math.min(100, parseInt(normalized, 10));
}

function StageWeightInput({ value, onChange }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className="stage-weight-input"
      maxLength={3}
      value={value}
      onChange={(e) => onChange(parseStageWeightPercent(e.target.value))}
      aria-label="Stage weight percent"
    />
  );
}

function StageNameField({ name, autoEdit, onCommit, onAutoEditDone }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const limitId = useId();

  useEffect(() => {
    setDraft(name);
  }, [name]);

  useEffect(() => {
    if (autoEdit) setEditing(true);
  }, [autoEdit]);

  const exitEdit = () => {
    setEditing(false);
    onAutoEditDone?.();
  };

  const save = () => {
    const trimmed = draft.trim().slice(0, STAGE_NAME_MAX_LENGTH);
    if (!trimmed) {
      setDraft(name);
      exitEdit();
      return;
    }
    if (trimmed !== name) onCommit(trimmed);
    exitEdit();
  };

  const cancel = () => {
    setDraft(name);
    exitEdit();
  };

  if (editing) {
    return (
      <div
        className="section-card-name-edit"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          className="section-card-name-input"
          value={draft}
          maxLength={STAGE_NAME_MAX_LENGTH}
          autoFocus
          aria-label="Stage name"
          aria-describedby={limitId}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              save();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
          }}
        />
        <span className="section-card-name-limit" id={limitId}>
          {draft.length}/{STAGE_NAME_MAX_LENGTH}
        </span>
      </div>
    );
  }

  return (
    <div
      className="section-card-name"
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          setEditing(true);
        }
      }}
    >
      {name}
    </div>
  );
}

function setUrl(view, section) {
  const p = new URLSearchParams();
  p.set('view', view);
  if (section) p.set('section', section);
  window.history.replaceState(null, '', `?${p}`);
}

function AppShell({
  view,
  rubricName,
  onNavigate,
  children,
  dirty,
  onPublish,
  onSaveAndExit,
  onEditRubricMeta,
  editorVersion,
  onEditorVersionChange,
  onEditorTab,
  publishDisabled = false,
}) {
  const isEditing = ['edit', 'scoring', 'preview'].includes(view);
  const editorTab =
    view === 'scoring' ? 'scoring' : view === 'preview' ? 'preview' : 'edit';
  const nav = [
    { id: 'hub', label: 'Rubrics' },
    { id: 'dashboard', label: 'Team performance' },
  ];

  return (
    <div className={`app ${isEditing ? 'editing' : ''}`}>
      {!isEditing && (
        <aside className="sidebar">
          <div className="brand">Netic</div>
          <p className="sidebar-sub">Weighted stages · attribute modes · Required gates</p>
          <nav>
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${view === item.id ? 'active' : ''}`}
                onClick={() => onNavigate(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
      )}
      <div className={`main ${isEditing ? 'main-editing' : ''}`}>
        {isEditing ? (
          <div className="editing-header">
            <header className="topbar">
              <div className="breadcrumb">
                <button
                  type="button"
                  className="breadcrumb-back icon-only"
                  onClick={onSaveAndExit}
                  aria-label="Back to rubrics"
                >
                  ←
                </button>
                <div className="topbar-rubric-heading">
                  <span className="topbar-rubric-title">{rubricName}</span>
                  <button
                    type="button"
                    className="topbar-edit-btn"
                    onClick={onEditRubricMeta}
                    aria-label="Edit rubric name and call type"
                  >
                    <IconEdit />
                  </button>
                </div>
              </div>
              <div className="topbar-actions">
                {editorVersion != null && onEditorVersionChange && (
                  <VersionDropdown version={editorVersion} onChange={onEditorVersionChange} />
                )}
                {dirty && <span className="unsaved">Unsaved changes</span>}
                <button type="button" className="btn btn-ghost" onClick={onSaveAndExit}>
                  Save and exit
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onPublish}
                  disabled={publishDisabled}
                  title={
                    publishDisabled
                      ? 'Stage weights must total 100% before publishing'
                      : undefined
                  }
                >
                  Publish
                </button>
              </div>
            </header>
            {editorVersion != null && <ScoringFormulaBar version={editorVersion} />}
            <EditorTabs activeTab={editorTab} onTab={onEditorTab} />
          </div>
        ) : (
          <header className="topbar">
            <div className="breadcrumb">
              {view === 'hub' && 'Rubrics'}
              {view === 'dashboard' && 'Team performance'}
            </div>
          </header>
        )}
        <div className={isEditing ? 'editing-scroll' : undefined}>{children}</div>
      </div>
    </div>
  );
}

function PublishModal({ onClose, onConfirm }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Publish rubric changes?</h2>
        <p>Applies to all future lead calls. Past scores are not recalculated.</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function RubricMetaModal({
  mode,
  initialName = '',
  initialCallType = '',
  initialDescription = '',
  onClose,
  onSubmit,
}) {
  const isCreate = mode === 'create';
  const [name, setName] = useState(initialName);
  const [callType, setCallType] = useState(() => normalizeCallType(initialCallType) || '');
  const [description, setDescription] = useState(initialDescription);
  const [nameTouched, setNameTouched] = useState(false);
  const [callTypeTouched, setCallTypeTouched] = useState(false);

  useEffect(() => {
    if (!isCreate || !description.trim()) return;
    const suggested = suggestRubricMetaFromPrompt(description);
    if (!nameTouched && suggested.name) setName(suggested.name);
    if (!callTypeTouched && suggested.callType) setCallType(suggested.callType);
  }, [description, nameTouched, callTypeTouched, isCreate]);

  const handleSubmit = () => {
    onSubmit({
      name: name.trim(),
      callType,
      ...(isCreate ? { description: description.trim() } : {}),
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-rubric-meta" onClick={(e) => e.stopPropagation()}>
        <h2>{isCreate ? 'New scoring rubric' : 'Edit rubric'}</h2>
        <p>
          {isCreate
            ? 'Describe the call type and AI will draft stages and attributes. You can edit the name and call type before creating.'
            : 'Update the rubric name and call type shown in the rubrics list.'}
        </p>
        <div className="modal-fields">
          <label>
            Rubric name
            <input
              type="text"
              placeholder="e.g. Product Return Calls Rubric"
              value={name}
              onChange={(e) => {
                setNameTouched(true);
                setName(e.target.value);
              }}
              autoFocus
            />
          </label>
          <fieldset className="call-type-field">
            <legend className="call-type-label">Call type</legend>
            <div className="radio-group">
              {CALL_TYPE_OPTIONS.map((option) => (
                <label key={option.value} className="radio-row">
                  <input
                    type="radio"
                    name="rubric-call-type"
                    value={option.value}
                    checked={callType === option.value}
                    onChange={() => {
                      setCallTypeTouched(true);
                      setCallType(option.value);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
          {isCreate && (
            <label>
              Describe what to generate
              <textarea
                rows={4}
                placeholder="e.g. Create a rubric to understand my CXR's performance on supporting customers to return products"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {usesLeadTemplateFromPrompt(description) && (
                <span className="label-hint">
                  Using Lead Calls template as starting point.
                </span>
              )}
            </label>
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!name.trim() || !callType}
            onClick={handleSubmit}
          >
            {isCreate ? 'Create rubric' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareRubricModal({ rubricName, onClose }) {
  const link = `https://app.netic.ai/rubrics/share/demo-${encodeURIComponent(rubricName)}`;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share rubric</h2>
        <p>Anyone with this link can view <strong>{rubricName}</strong> (read-only).</p>
        <div className="share-link-box">
          <code>{link}</code>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteRubricModal({ rubricName, onClose, onConfirm }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Delete rubric?</h2>
        <p>
          <strong>{rubricName}</strong> will be permanently removed. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function HubView({
  items,
  onAdd,
  onEdit,
  onPreview,
  onDuplicate,
  onShare,
  onDelete,
  onToggleAdopt,
}) {
  return (
    <div className="page hub-page">
      <div className="page-header hub-header">
        <div>
          <h1>Scoring rubrics</h1>
          <p>Configure how AI evaluates CXR performance on inbound lead calls.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          <IconPlus />
          Add rubric
        </button>
      </div>
      <table className="data-table rubric-table">
        <thead>
          <tr>
            <th title="Adopted rubrics are used to score live calls.">Adopted</th>
            <th>Name</th>
            <th>Call type</th>
            <th>Attributes</th>
            <th>Last updated</th>
            <th className="col-actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr
              key={row.id}
              className="rubric-row-clickable"
              onClick={() => onPreview(row.id)}
              title="View rubric"
            >
              <td onClick={(e) => e.stopPropagation()}>
                <AdoptToggle
                  id={`adopt-${row.id}`}
                  checked={row.status === 'active'}
                  disabled={row.status === 'draft'}
                  onChange={(adopted) => onToggleAdopt(row.id, adopted)}
                />
              </td>
              <td className="strong rubric-name-cell">
                <span className="rubric-name-row">
                  <span className="rubric-name">{row.name}</span>
                  {row.status === 'draft' && (
                    <span className="pill pill-status pill-draft">Draft</span>
                  )}
                </span>
                <span onClick={(e) => e.stopPropagation()}>
                  <RubricScoringInfoTip version={row.editorVersion} />
                </span>
              </td>
              <td>
                <span className="pill pill-type">{row.callType}</span>
              </td>
              <td>{row.attributeCount}</td>
              <td>
                <span className="last-updated">{row.lastUpdatedLabel}</span>
                {row.lastUpdatedHint && (
                  <span className="last-updated-hint">{row.lastUpdatedHint}</span>
                )}
              </td>
              <td onClick={(e) => e.stopPropagation()}>
                <div className="row-actions">
                  <IconButton label="Edit rubric" onClick={() => onEdit(row.id)}>
                    <IconEdit />
                  </IconButton>
                  <IconButton label="Duplicate rubric" onClick={() => onDuplicate(row.id)}>
                    <IconDuplicate />
                  </IconButton>
                  <IconButton label="Share rubric" onClick={() => onShare(row.id)}>
                    <IconShare />
                  </IconButton>
                  <IconButton
                    label="Delete rubric"
                    variant="danger"
                    disabled={row.isSystemDefault}
                    onClick={() => onDelete(row.id)}
                  >
                    <IconTrash />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatAttributeScoringSummary(attr, section) {
  const mode = ATTR_MODE_LABEL[attr.scoringMode] ?? 'Pass/Fail';
  const parts = [mode];
  if (attr.required) parts.push('Required');
  if (sectionUsesCustomWeights(section)) {
    parts.push(`${attributeWeightBadgePercent(attr, section)}% of stage`);
  } else {
    parts.push('Equally weighted');
  }
  return `Scores as: ${parts.join(' · ')}`;
}

function rubricUsesGranularScoring(rubric) {
  return rubric.sections.some((s) =>
    s.attributes.some(
      (a) =>
        a.enabled !== false &&
        (a.scoringMode === ATTR_MODE.GRANULAR ||
          a.scoringMode === ATTR_MODE.NUMERIC),
    ),
  );
}

function AttributeDetailPanel({
  section,
  attr,
  onUpdateAttr,
  onAttrWeightChange,
  onAttrWeightModeChange,
}) {
  const [advancedOpen, setAdvancedOpen] = useState(
    () => (attr.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM,
  );
  const attrWeightSum = attributeWeightSumPercent(section);
  const attrWeightSumOk = attributeWeightsValid(section);

  useEffect(() => {
    if ((attr.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM) {
      setAdvancedOpen(true);
    }
  }, [attr.id, attr.weightMode]);

  return (
    <div className="attr-detail">
      <h3>Attribute detail</h3>
      <label>
        Name
        <input
          type="text"
          value={attr.name}
          onChange={(e) => onUpdateAttr(section.id, attr.id, { name: e.target.value })}
        />
      </label>
      <label>
        Instruction
        <span className="label-hint">
          Tell the AI how to calibrate whether this behavior was met.
        </span>
        <textarea
          rows={4}
          placeholder="e.g. Thanked the customer for calling and gave their name."
          value={attr.description}
          onChange={(e) =>
            onUpdateAttr(section.id, attr.id, { description: e.target.value })
          }
        />
        <span className="scoring-summary">{formatAttributeScoringSummary(attr, section)}</span>
      </label>
      <label className="toggle-row block">
        <input
          type="checkbox"
          checked={attr.required}
          onChange={(e) =>
            onUpdateAttr(section.id, attr.id, { required: e.target.checked })
          }
        />
        <span className="toggle-copy">
          <span className="toggle-label">Required</span>
          <span className="toggle-hint">
            A missed required attribute caps the whole stage below 60 and flags it
            for coaching, even if other attributes passed.
          </span>
        </span>
      </label>
      <CollapsibleSection
        title="Advanced settings"
        open={advancedOpen}
        onToggle={setAdvancedOpen}
      >
          <label>
            Scoring mode
            <span className="label-hint">
              Pass/Fail for single behaviors. Percentage when the AI scores partial completion
              (e.g. verified 3 of 4 customer fields). Numeric when the AI rates on a custom
              value range you define.
            </span>
            <SelectField
              value={attr.scoringMode}
              onChange={(v) => onUpdateAttr(section.id, attr.id, { scoringMode: v })}
              ariaLabel="Scoring mode"
              options={[
                { value: ATTR_MODE.BINARY, label: 'Pass/Fail' },
                { value: ATTR_MODE.GRANULAR, label: 'Percentage' },
                { value: ATTR_MODE.NUMERIC, label: 'Numeric' },
              ]}
            />
          </label>
          {attr.scoringMode === ATTR_MODE.GRANULAR && (
            <div className="percent-range">
              <p className="label-hint percent-range-hint">
                Optional score range for partial credit (e.g. min 0%, max 100%).
              </p>
              <div className="percent-range-fields">
                <label>
                  Minimum score (%)
                  <input
                    type="number"
                    min={0}
                    max={attr.percentRangeMax ?? 100}
                    value={attr.percentRangeMin ?? 0}
                    onChange={(e) =>
                      onUpdateAttr(section.id, attr.id, {
                        percentRangeMin: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Maximum score (%)
                  <input
                    type="number"
                    min={attr.percentRangeMin ?? 0}
                    max={100}
                    value={attr.percentRangeMax ?? 100}
                    onChange={(e) =>
                      onUpdateAttr(section.id, attr.id, {
                        percentRangeMax: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}
          {attr.scoringMode === ATTR_MODE.NUMERIC && (
            <div className="percent-range">
              <p className="label-hint percent-range-hint">
                The AI returns a value in this range, then converts it to a 0–100 score
                (min = 0, max = 100).
              </p>
              <div className="percent-range-fields">
                <label>
                  Minimum value
                  <input
                    type="number"
                    max={attr.numericMax ?? 5}
                    value={attr.numericMin ?? 0}
                    onChange={(e) =>
                      onUpdateAttr(section.id, attr.id, {
                        numericMin: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Maximum value
                  <input
                    type="number"
                    min={attr.numericMin ?? 0}
                    value={attr.numericMax ?? 5}
                    onChange={(e) =>
                      onUpdateAttr(section.id, attr.id, {
                        numericMax: Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}
          <label>
            Weight within stage
            <SelectField
              value={attr.weightMode ?? WEIGHT_MODE.EQUAL}
              onChange={(v) => onAttrWeightModeChange(section.id, attr.id, v)}
              ariaLabel="Weight within stage"
              options={[
                { value: WEIGHT_MODE.EQUAL, label: 'Equally weighted' },
                { value: WEIGHT_MODE.CUSTOM, label: 'Custom weight' },
              ]}
            />
          </label>
          {(attr.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM && (
            <>
              <p className="hint custom-weight-hint">
                Unlocked attributes share the remaining % automatically to total 100%.
              </p>
              <WeightSlider
                label="Custom weight"
                value={attributeWeightPercentInSection(attr, section)}
                min={0}
                max={100}
                editable
                invalid={attributeWeightPercentInSection(attr, section) <= 0}
                onChange={(pct) => onAttrWeightChange(section.id, attr.id, pct)}
              />
              {attributeWeightPercentInSection(attr, section) <= 0 && (
                <p className="weight-sum-hint">
                  Weight must be greater than 0%.
                </p>
              )}
              {attributeWeightPercentInSection(attr, section) > 0 && !attrWeightSumOk && (
                <p className="weight-sum-hint">
                  Attribute weights total {attrWeightSum}% — adjust weights to{' '}
                  {attributeWeightPercentInSection(attr, section) + (100 - attrWeightSum)}%
                  {' '}so they total 100%
                </p>
              )}
            </>
          )}
      </CollapsibleSection>
    </div>
  );
}

function EditorView({
  rubric,
  selectedSectionId,
  selectedAttrId,
  selectedRatingLevelId,
  editingSectionId,
  onSelectSection,
  onSelectAttr,
  onSelectRatingLevel,
  onUpdateAttr,
  onUpdateRatingLevel,
  onAddRatingLevel,
  onRemoveRatingLevel,
  onSetRatingMinimumStandard,
  onGenerateRatingGuideAI,
  onResetRatingGuide,
  onUpdateSectionName,
  onEditingSectionDone,
  onSectionWeightChange,
  onAddSection,
  onRemoveSection,
  onReorderSections,
  onAddAttribute,
  onRemoveAttribute,
  onDuplicateAttribute,
  onAttrWeightChange,
  onAttrWeightModeChange,
}) {
  const editorVersion = rubric.editorVersion ?? EDITOR_VERSIONS.V1;
  const isV2 = editorVersion === EDITOR_VERSIONS.V2;
  const section = rubric.sections.find((s) => s.id === selectedSectionId);
  const attr = section?.attributes.find((a) => a.id === selectedAttrId);
  const sectionSum = sectionWeightSum(rubric.sections);
  const sectionSumOk = Math.abs(sectionSum - 1) < 0.01;
  const attrSumPercent = section ? attributeWeightSumPercent(section) : 100;
  const attrSumOk = section ? attributeWeightsValid(section) : true;
  const showAttrWeightSum = section && sectionUsesCustomWeights(section);
  const [draggingSectionId, setDraggingSectionId] = useState(null);
  const [dropInsertIndex, setDropInsertIndex] = useState(null);
  const stageListRef = useRef(null);
  const draggingSectionIdRef = useRef(null);

  const insertIndexFromPointer = (clientY, cardIndex, cardEl) => {
    const rect = cardEl.getBoundingClientRect();
    return clientY < rect.top + rect.height / 2 ? cardIndex : cardIndex + 1;
  };

  const setInsertIndex = (insertIndex) => {
    setDropInsertIndex((prev) => (prev === insertIndex ? prev : insertIndex));
  };

  const getIndicatorTop = () => {
    if (dropInsertIndex === null || !stageListRef.current) return null;
    const listRect = stageListRef.current.getBoundingClientRect();
    const sections = rubric.sections;
    if (sections.length === 0) return 0;

    if (dropInsertIndex === 0) {
      const first = stageListRef.current.querySelector('.section-card-wrap');
      if (!first) return 0;
      return first.getBoundingClientRect().top - listRect.top;
    }

    if (dropInsertIndex >= sections.length) {
      const cards = stageListRef.current.querySelectorAll('.section-card-wrap');
      const last = cards[cards.length - 1];
      if (!last) return 0;
      return last.getBoundingClientRect().bottom - listRect.top;
    }

    const cards = stageListRef.current.querySelectorAll('.section-card-wrap');
    const target = cards[dropInsertIndex];
    if (!target) return 0;
    return target.getBoundingClientRect().top - listRect.top;
  };

  const handleStageDragStart = (e, sectionId) => {
    draggingSectionIdRef.current = sectionId;
    setDraggingSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sectionId);
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 14, 14);
    }
  };

  const handleCardDragOver = (e, cardIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!(e.currentTarget instanceof HTMLElement)) return;
    setInsertIndex(insertIndexFromPointer(e.clientY, cardIndex, e.currentTarget));
  };

  const handleListDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!stageListRef.current) return;
    const cards = stageListRef.current.querySelectorAll('.section-card-wrap');
    if (cards.length === 0) {
      setInsertIndex(0);
      return;
    }
    const clientY = e.clientY;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        setInsertIndex(i);
        return;
      }
    }
    setInsertIndex(cards.length);
  };

  const handleDropAtIndex = (insertIndex) => {
    const sourceId = draggingSectionIdRef.current;
    if (sourceId != null) onReorderSections(sourceId, insertIndex);
    draggingSectionIdRef.current = null;
    setDraggingSectionId(null);
    setDropInsertIndex(null);
  };

  const handleCardDrop = (e, cardIndex) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(e.currentTarget instanceof HTMLElement)) return;
    handleDropAtIndex(insertIndexFromPointer(e.clientY, cardIndex, e.currentTarget));
  };

  const handleListDrop = (e) => {
    e.preventDefault();
    if (!stageListRef.current) return;
    const cards = stageListRef.current.querySelectorAll('.section-card-wrap');
    let insertIndex = cards.length;
    const clientY = e.clientY;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) {
        insertIndex = i;
        break;
      }
    }
    handleDropAtIndex(insertIndex);
  };

  const handleStageDragEnd = () => {
    draggingSectionIdRef.current = null;
    setDraggingSectionId(null);
    setDropInsertIndex(null);
  };

  const indicatorTop = getIndicatorTop();

  const stagesPanel = (
    <div className="section-list panel-fill">
      <div className="panel-head">
        <h3>Stages</h3>
        <div className="panel-head-actions">
          <span className={`weight-sum inline ${sectionSumOk ? 'ok' : 'warn'}`}>
            {Math.round(sectionSum * 100)}%
          </span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onAddSection}>
            <IconPlus /> Add stage
          </button>
        </div>
      </div>
      {!sectionSumOk && (
        <p className="weight-sum-hint">Stage weights must total 100%</p>
      )}
      <div
        className={`stage-list ${draggingSectionId ? 'is-dragging' : ''}`}
        ref={stageListRef}
        onDragOver={handleListDragOver}
        onDrop={handleListDrop}
      >
        {dropInsertIndex !== null && indicatorTop !== null && (
          <div className="stage-drop-indicator" style={{ top: `${indicatorTop}px` }} />
        )}
        {rubric.sections.map((s, index) => (
          <div
            key={s.id}
            className={`section-card-wrap ${s.id === selectedSectionId ? 'selected' : ''} ${draggingSectionId === s.id ? 'dragging' : ''}`}
            onDragOver={(e) => handleCardDragOver(e, index)}
            onDrop={(e) => handleCardDrop(e, index)}
          >
            <button
              type="button"
              className="stage-drag-handle"
              draggable
              aria-label={`Reorder ${s.name}`}
              onDragStart={(e) => handleStageDragStart(e, s.id)}
              onDragEnd={handleStageDragEnd}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <IconGrip />
            </button>
            <div className="section-card-body">
              <button
                type="button"
                className="section-card"
                onClick={() => onSelectSection(s.id)}
              >
                <div>
                  <StageNameField
                    name={s.name}
                    autoEdit={editingSectionId === s.id}
                    onCommit={(name) => onUpdateSectionName(s.id, name)}
                    onAutoEditDone={onEditingSectionDone}
                  />
                  <div className="section-card-meta">
                    {isV2
                      ? `${s.ratingGuide?.levels?.length ?? 0} ratings`
                      : `${s.attributes.length} attributes`}
                  </div>
                </div>
              </button>
              <div className="section-card-foot">
                <label className="section-weight-field">
                  <span>Weight</span>
                  <StageWeightInput
                    value={sectionWeightPercent(s.weight)}
                    onChange={(pct) => onSectionWeightChange(s.id, pct / 100)}
                  />
                  <span className="pct-suffix">%</span>
                </label>
                {rubric.sections.length > 1 && (
                  <IconButton
                    label="Remove stage"
                    variant="danger"
                    onClick={() => onRemoveSection(s.id)}
                  >
                    <IconTrash />
                  </IconButton>
                )}
              </div>
            </div>
          </div>
        ))}
        <div className="stage-list-tail" aria-hidden="true" />
      </div>
    </div>
  );

  const attributesPanel = (
    <div className="attr-list panel-fill">
      <div className="panel-head">
        <div>
          <h3>Attributes</h3>
          <span className="panel-sub">{section?.name}</span>
        </div>
        <div className="panel-head-actions">
          {showAttrWeightSum && (
            <span className={`weight-sum inline ${attrSumOk ? 'ok' : 'warn'}`}>
              {attrSumPercent}%
            </span>
          )}
          <button type="button" className="btn btn-ghost btn-sm" onClick={onAddAttribute}>
            <IconPlus /> Add attribute
          </button>
        </div>
      </div>
      {showAttrWeightSum && !attrSumOk && (
        <p className="weight-sum-hint">Attribute weights must total 100%</p>
      )}
      {section?.attributes.map((a) => {
        const weightPct = attributeWeightBadgePercent(a, section);
        const isCustom = (a.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM;
        return (
          <div
            key={a.id}
            className={`attr-row-wrap ${a.id === selectedAttrId ? 'selected' : ''}`}
          >
            <button
              type="button"
              className="attr-row"
              onClick={() => onSelectAttr(a.id)}
            >
              <span className="attr-row-title">
                <span className="attr-row-name">{a.name}</span>
                {a.required && <span className="mini-badge req">Required</span>}
                {isCustom && (
                  <span className={`mini-badge weight ${attrSumOk ? 'custom' : 'warn'}`}>
                    {weightPct}%
                  </span>
                )}
              </span>
            </button>
            <div className="attr-row-actions-inline">
              <IconButton
                label="Duplicate attribute"
                onClick={() => onDuplicateAttribute(a.id)}
              >
                <IconDuplicate />
              </IconButton>
              {section.attributes.length > 1 && (
                <IconButton
                  label="Remove attribute"
                  variant="danger"
                  onClick={() => onRemoveAttribute(a.id)}
                >
                  <IconTrash />
                </IconButton>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const ratingGuidePanel = section ? (
    <RatingGuidePanel
      section={section}
      selectedLevelId={selectedRatingLevelId}
      onSelectLevel={onSelectRatingLevel}
      onAddLevel={() => onAddRatingLevel(section.id)}
      onRemoveLevel={(levelId) => onRemoveRatingLevel(section.id, levelId)}
      onUpdateLevel={(levelId, patch) => onUpdateRatingLevel(section.id, levelId, patch)}
      onSetMinimumStandard={(levelId, enabled) =>
        onSetRatingMinimumStandard(section.id, levelId, enabled)
      }
      onGenerateWithAI={() => onGenerateRatingGuideAI(section.id)}
      onResetGuide={() => onResetRatingGuide(section.id)}
    />
  ) : (
    <div className="attr-list panel-fill">
      <h3>Rating guide</h3>
      <p className="hint">Select a stage to edit its rating guide.</p>
    </div>
  );

  return (
    <div className="page editor-page">
      <ResizableEditorLayout
        stages={stagesPanel}
        attributes={isV2 ? ratingGuidePanel : attributesPanel}
        minPanelWidth={400}
        className={isV2 ? 'resizable-editor-v2' : ''}
        detail={
          isV2
            ? null
            : attr
              ? (
                <AttributeDetailPanel
                  key={attr.id}
                  section={section}
                  attr={attr}
                  onUpdateAttr={onUpdateAttr}
                  onAttrWeightChange={onAttrWeightChange}
                  onAttrWeightModeChange={onAttrWeightModeChange}
                />
              )
              : (
                <div className="attr-detail attr-detail-empty panel-fill">
                  <h3>Attribute detail</h3>
                  <p className="hint">Select an attribute to edit its settings.</p>
                </div>
              )
        }
      />
    </div>
  );
}

function createCoachingMaterial(overrides = {}) {
  return {
    id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: '',
    type: 'link',
    url: '',
    fileName: '',
    ...overrides,
  };
}

function isCoachingMaterialValid(material) {
  if (!material.title.trim()) return false;
  if (material.type === 'link') return Boolean(material.url.trim());
  return Boolean(material.fileName);
}

function CoachingMaterialModal({ material, onClose, onSave }) {
  const [draft, setDraft] = useState(() => createCoachingMaterial(material));

  const setType = (type) => {
    setDraft((prev) => ({
      ...prev,
      type,
      url: type === 'link' ? prev.url : '',
      fileName: type === 'attachment' ? prev.fileName : '',
    }));
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal coaching-material-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{material ? 'Edit coaching material' : 'Add coaching material'}</h2>
        <p>Sent to CXRs when their score falls below the coaching threshold.</p>
        <label>
          Title
          <input
            type="text"
            placeholder="e.g. Verification best practices"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            autoFocus
          />
        </label>
        <label>
          Type
          <SelectField
            value={draft.type}
            onChange={setType}
            ariaLabel="Material type"
            options={[
              { value: 'link', label: 'Link' },
              { value: 'attachment', label: 'Attachment' },
            ]}
          />
        </label>
        {draft.type === 'link' ? (
          <label>
            Link URL
            <input
              type="url"
              placeholder="https://…"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
          </label>
        ) : (
          <div className="coaching-material-upload-field">
            <span className="coaching-material-upload-label">Attachment</span>
            <label className="file-uploader">
              <input
                type="file"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setDraft({ ...draft, fileName: file?.name ?? '' });
                }}
              />
              {draft.fileName ? (
                <span className="file-uploader-content file-uploader-has-file">
                  <span className="file-uploader-name">{draft.fileName}</span>
                  <span className="file-uploader-hint">Click to replace file</span>
                </span>
              ) : (
                <span className="file-uploader-content">
                  <span className="file-uploader-icon" aria-hidden="true">
                    ↑
                  </span>
                  <span className="file-uploader-text">Click to upload or drag and drop</span>
                  <span className="file-uploader-hint">PDF, DOC, or video</span>
                </span>
              )}
            </label>
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!isCoachingMaterialValid(draft)}
            onClick={() => onSave(draft)}
          >
            {material ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CoachingMaterialSummaryRow({ material, onEdit, onRemove }) {
  const detail =
    material.type === 'link'
      ? material.url
      : material.fileName;

  return (
    <div className="coaching-material-summary-row">
      <button type="button" className="coaching-material-summary-main" onClick={onEdit}>
        <span className="coaching-material-summary-title">{material.title}</span>
        <span className={`mini-badge coaching-material-type ${material.type}`}>
          {material.type === 'link' ? 'Link' : 'Attachment'}
        </span>
        <span className="coaching-material-summary-detail">{detail}</span>
      </button>
      <IconButton label="Remove material" onClick={onRemove}>
        <IconTrash />
      </IconButton>
    </div>
  );
}

function ThresholdUnitToggle({ unit, onChange }) {
  return (
    <div className="threshold-unit-toggle" role="group" aria-label="Coaching threshold unit">
      <button
        type="button"
        className={unit === 'points' ? 'active' : ''}
        onClick={() => onChange('points')}
        aria-pressed={unit === 'points'}
      >
        pts
      </button>
      <button
        type="button"
        className={unit === 'percent' ? 'active' : ''}
        onClick={() => onChange('percent')}
        aria-pressed={unit === 'percent'}
      >
        %
      </button>
    </div>
  );
}

function ScoringView({ rubric, onSettingsChange }) {
  const hasGranular = rubricUsesGranularScoring(rubric);
  const settings = rubric.settings;
  const thresholdUnit = getCoachingThresholdUnit(settings);
  const thresholdSuffix = coachingThresholdUnitSuffix(thresholdUnit);
  const materials = settings.coachingMaterials ?? [];
  const [materialModal, setMaterialModal] = useState(null);

  const saveMaterials = (nextMaterials) => {
    onSettingsChange({ coachingMaterials: nextMaterials });
  };

  const removeMaterial = (id) => {
    saveMaterials(materials.filter((m) => m.id !== id));
  };

  const handleSaveMaterial = (draft) => {
    const existing = materials.some((m) => m.id === draft.id);
    saveMaterials(
      existing
        ? materials.map((m) => (m.id === draft.id ? draft : m))
        : [...materials, draft],
    );
    setMaterialModal(null);
  };

  const openAddMaterial = () => {
    setMaterialModal({ mode: 'add' });
  };

  const openEditMaterial = (material) => {
    setMaterialModal({ mode: 'edit', material });
  };

  const updateSectionThreshold = (sectionId, rawValue) => {
    const section = rubric.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const value = sectionThresholdDisplayToPoints(rawValue, section.weight, thresholdUnit);
    onSettingsChange({
      sectionCoachingThresholds: {
        ...settings.sectionCoachingThresholds,
        [sectionId]: value,
      },
    });
  };

  const toggleDetailedThreshold = (enabled) => {
    const patch = { detailedCoachingThresholdEnabled: enabled };
    if (enabled) {
      const existing = settings.sectionCoachingThresholds ?? {};
      const merged = { ...defaultSectionCoachingThresholds(rubric.sections), ...existing };
      rubric.sections.forEach((s) => {
        merged[s.id] = clampSectionCoachingThreshold(merged[s.id], s.weight);
      });
      patch.sectionCoachingThresholds = merged;
    }
    onSettingsChange(patch);
  };

  return (
    <div className="page scoring-page">
      <div className="coaching-layout">
        <div className="coaching-main">
          <section className="coaching-section">
            <h2>Rules for coaching</h2>
            <p className="sub">
              CXRs are flagged for coaching when the overall score or a stage contribution falls
              below these thresholds, or when a Required attribute is missed.
            </p>
            <div className="coaching-settings-stack">
              <div className="coaching-threshold-row">
                <span className="coaching-threshold-label">
                  Coaching threshold (overall score)
                </span>
                <div className="coaching-threshold-controls">
                  <ThresholdUnitToggle
                    unit={thresholdUnit}
                    onChange={(unit) => onSettingsChange({ coachingThresholdUnit: unit })}
                  />
                  <div className="threshold-input-with-suffix">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={settings.coachingThreshold}
                      onChange={(e) =>
                        onSettingsChange({ coachingThreshold: Number(e.target.value) })
                      }
                      aria-label="Coaching threshold overall score"
                    />
                    <span className="threshold-suffix">{thresholdSuffix}</span>
                  </div>
                </div>
              </div>
              <label className="toggle-row block coaching-setting">
              <input
                type="checkbox"
                checked={settings.detailedCoachingThresholdEnabled}
                onChange={(e) => toggleDetailedThreshold(e.target.checked)}
              />
              <span className="toggle-copy">
                <strong>Detailed coaching threshold</strong>
                <span className="label-hint">
                  Set a minimum contribution per stage. Each stage&apos;s max equals its weight
                  from Details (e.g. 20% weight → max 20 points).
                </span>
              </span>
            </label>
            {settings.detailedCoachingThresholdEnabled && (
              <div className="section-coaching-thresholds">
                <p className="hint section-threshold-intro">
                  Contribution = stage score × stage weight. Coaching triggers when contribution
                  is below the threshold. Max per stage matches its weight % in Details.
                </p>
                {rubric.sections.map((section) => {
                  const max = sectionWeightPercent(section.weight);
                  const pointsValue = getSectionCoachingThreshold(section, settings);
                  const displayValue = sectionThresholdPointsToDisplay(
                    pointsValue,
                    section.weight,
                    thresholdUnit,
                  );
                  const displayMax =
                    thresholdUnit === 'percent' ? 100 : max;
                  const maxLabel =
                    thresholdUnit === 'percent' ? '100%' : `${max} pts`;
                  return (
                    <div key={section.id} className="section-threshold-row">
                      <div className="section-threshold-label">
                        <span className="section-threshold-name">{section.name}</span>
                        <span className="label-hint">
                          Weight {max}% · max threshold {maxLabel}
                        </span>
                      </div>
                      <div className="section-threshold-input-wrap">
                        <input
                          type="number"
                          min={0}
                          max={displayMax}
                          value={displayValue}
                          onChange={(e) =>
                            updateSectionThreshold(section.id, Number(e.target.value))
                          }
                          aria-label={`${section.name} coaching threshold`}
                        />
                        <span className="section-threshold-suffix">{thresholdSuffix}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="hint coaching-setting-hint">
              Required miss on any attribute fails the stage and flags coaching.
            </p>
            </div>
          </section>

          <section className="coaching-section">
            <h2>Coaching material</h2>
            <p className="sub">
              Resources sent when a CXR&apos;s score is below the coaching threshold.
            </p>
            {materials.length > 0 && (
              <div className="coaching-material-list">
                {materials.map((material) => (
                  <CoachingMaterialSummaryRow
                    key={material.id}
                    material={material}
                    onEdit={() => openEditMaterial(material)}
                    onRemove={() => removeMaterial(material.id)}
                  />
                ))}
              </div>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={openAddMaterial}>
              <IconPlus /> Add coaching material
            </button>
            {materialModal && (
              <CoachingMaterialModal
                material={materialModal.mode === 'edit' ? materialModal.material : null}
                onClose={() => setMaterialModal(null)}
                onSave={handleSaveMaterial}
              />
            )}
          </section>

          <section className="coaching-section">
            <h2>Coaching material notifications</h2>
            <div className="coaching-settings-stack">
            <label className="toggle-row block coaching-setting">
              <input
                type="checkbox"
                checked={settings.coachingNotifyEmail ?? true}
                onChange={(e) =>
                  onSettingsChange({ coachingNotifyEmail: e.target.checked })
                }
              />
              <span>Email coaching material to the CXR when below threshold</span>
            </label>
            <label className="toggle-row block">
              <input
                type="checkbox"
                checked={settings.coachingEscalateEnabled ?? true}
                onChange={(e) =>
                  onSettingsChange({ coachingEscalateEnabled: e.target.checked })
                }
              />
              <span className="toggle-copy">
                <strong>Escalate to manager for personal training</strong>
                <span className="label-hint">
                  When the same CXR hits the coaching threshold{' '}
                  <input
                    type="number"
                    min={2}
                    max={20}
                    className="inline-num"
                    value={settings.coachingEscalateConsecutiveCount ?? 5}
                    onChange={(e) =>
                      onSettingsChange({
                        coachingEscalateConsecutiveCount: Number(e.target.value),
                      })
                    }
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Consecutive coaching triggers"
                  />{' '}
                  times in a row within{' '}
                  <input
                    type="number"
                    min={7}
                    max={90}
                    className="inline-num"
                    value={settings.coachingEscalateWithinDays ?? 30}
                    onChange={(e) =>
                      onSettingsChange({
                        coachingEscalateWithinDays: Number(e.target.value),
                      })
                    }
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Days within month"
                  />{' '}
                  days
                </span>
              </span>
            </label>
            </div>
          </section>

          {hasGranular && (
            <section className="coaching-section coaching-section-secondary">
              <h2>Other scoring rules</h2>
              <label>
                Score pass threshold (Required)
                <span className="label-hint">
                  Required Percentage and Numeric attributes must meet this score or the
                  stage fails.
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={settings.granularPassThreshold}
                  onChange={(e) =>
                    onSettingsChange({ granularPassThreshold: Number(e.target.value) })
                  }
                />
              </label>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function parseDurationLabel(label) {
  const [minutes, seconds] = label.split(':').map((part) => parseInt(part, 10));
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return 0;
  return minutes * 60 + seconds;
}

function formatPlaybackTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function RecordingPlayer({ durationLabel }) {
  const totalSeconds = parseDurationLabel(durationLabel);
  const [currentSeconds, setCurrentSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing || totalSeconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setCurrentSeconds((prev) => {
        if (prev >= totalSeconds) {
          setPlaying(false);
          return totalSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, totalSeconds]);

  const handleSeek = (value) => {
    const next = Number(value);
    setCurrentSeconds(next);
    if (next >= totalSeconds) setPlaying(false);
  };

  return (
    <div className="recording-player">
      <button
        type="button"
        className="recording-play-btn"
        onClick={() => {
          if (currentSeconds >= totalSeconds) setCurrentSeconds(0);
          setPlaying((prev) => !prev);
        }}
        aria-label={playing ? 'Pause recording' : 'Play recording'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <input
        type="range"
        className="recording-slider"
        min={0}
        max={totalSeconds || 1}
        value={Math.min(currentSeconds, totalSeconds || 0)}
        onChange={(e) => handleSeek(e.target.value)}
        aria-label="Recording progress"
      />
      <span className="recording-time">
        {formatPlaybackTime(currentSeconds)} / {durationLabel}
      </span>
    </div>
  );
}

function PreviewView({ rubric, sampleCallId, onSampleChange, result, isRatingGuide, onEdit }) {
  const call = sampleCalls.find((c) => c.id === sampleCallId);
  const [expandedSections, setExpandedSections] = useState(
    () => new Set(rubric.sections.map((s) => s.id)),
  );
  const [showAiConfidence, setShowAiConfidence] = useState(false);
  const [showRecordingDetails, setShowRecordingDetails] = useState(false);

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      rubric.sections.forEach((s) => {
        if (!prev.has(s.id)) next.add(s.id);
      });
      for (const id of next) {
        if (!rubric.sections.some((s) => s.id === id)) next.delete(id);
      }
      return next;
    });
  }, [rubric.sections]);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const sectionIds = rubric.sections.map((s) => s.id);
  const allExpanded =
    sectionIds.length > 0 && sectionIds.every((id) => expandedSections.has(id));

  const expandAll = () => setExpandedSections(new Set(sectionIds));
  const collapseAll = () => setExpandedSections(new Set());

  return (
    <div className="page preview-page">
      <div className="preview-page-head">
        <div>
          <h2>Preview</h2>
          <p className="hint">
            See how this rubric scores a sample call. Switch to editing to change the setup.
          </p>
        </div>
        <button type="button" className="btn btn-primary preview-edit-btn" onClick={onEdit}>
          <IconEdit />
          Edit rubric
        </button>
      </div>
      <div className="preview-layout">
        <div className="transcript-panel">
          <label>
            Sample call
            <SelectField
              value={sampleCallId}
              onChange={onSampleChange}
              ariaLabel="Sample call"
              options={sampleCalls.map((c) => ({ value: c.id, label: c.label }))}
            />
          </label>
          <div className="call-meta">
            {call.agent} · {call.duration} · {call.booked ? 'Lead converted' : 'Lead lost'}
          </div>
          <p className="transcript">{call.excerpt}</p>
          <RecordingPlayer durationLabel={call.duration} />
          <div className="preview-display-options">
            <label className="toggle-row block preview-option">
              <input
                type="checkbox"
                checked={showAiConfidence}
                onChange={(e) => setShowAiConfidence(e.target.checked)}
              />
              <span>Show AI confidence</span>
            </label>
            <label className="toggle-row block preview-option">
              <input
                type="checkbox"
                checked={showRecordingDetails}
                onChange={(e) => setShowRecordingDetails(e.target.checked)}
              />
              <span>
                {isRatingGuide
                  ? 'Show recording details for each stage'
                  : 'Show recording details for each attribute'}
              </span>
            </label>
          </div>
        </div>
        <div className="breakdown-panel">
          <div className="breakdown-panel-header">
            <div>
              <h3>Call score</h3>
              <p className="sub">{result.formula}</p>
            </div>
            <button
              type="button"
              className="link-btn"
              onClick={allExpanded ? collapseAll : expandAll}
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
          <ScoreBreakdown
            result={result}
            rubric={rubric}
            expandedSections={expandedSections}
            onToggleSection={toggleSection}
            confidence={isRatingGuide ? call.stageConfidence : call.confidence}
            showAiConfidence={showAiConfidence}
            showRecordingDetails={showRecordingDetails}
            isRatingGuide={isRatingGuide}
          />
        </div>
      </div>
    </div>
  );
}

function CallOutcomePill({ outcome }) {
  if (outcome === 'converted') {
    return <span className="pill pill-ok">Converted</span>;
  }
  return <span className="pill pill-lost">Lost</span>;
}

const CALL_TYPE_LABEL = { lead: 'Lead call', 'non-lead': 'Non-lead call' };

const STAGE_DONUT_COLORS = ['#2f5bff', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981'];

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last quarter' },
  { value: 'custom', label: 'Custom range' },
];

function parseCallDate(label) {
  if (!label) return null;
  const d = new Date(label);
  return Number.isNaN(d.getTime()) ? null : d;
}

const DASHBOARD_PREFS_KEY = 'netic.dashboard.prefs';

function readDashboardPrefs() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(DASHBOARD_PREFS_KEY)) || {};
  } catch {
    return {};
  }
}

function writeDashboardPrefs(prefs) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore write failures (e.g. storage disabled)
  }
}

function inDateRange(callDate, range, anchor, custom) {
  if (!callDate) return true;
  if (range === 'custom') {
    const from = custom.from ? new Date(custom.from) : null;
    const to = custom.to ? new Date(custom.to) : null;
    if (from && callDate < from) return false;
    if (to && callDate > to) return false;
    return true;
  }
  if (range === 'today') {
    return callDate.toDateString() === anchor.toDateString();
  }
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const cutoff = new Date(anchor);
  cutoff.setDate(cutoff.getDate() - days);
  return callDate >= cutoff && callDate <= anchor;
}

function AvgScoreDonut({ overall, stages }) {
  const size = 168;
  const stroke = 20;
  const cx = size / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let cursor = 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="avg-donut-svg"
      role="img"
      aria-label={`Average call score ${overall}`}
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="var(--surface-muted, #eef1f5)"
        strokeWidth={stroke}
      />
      {stages.map((s, i) => {
        const len = (s.contribution / 100) * c;
        const seg = (
          <circle
            key={s.id}
            cx={cx}
            cy={cx}
            r={r}
            fill="none"
            stroke={STAGE_DONUT_COLORS[i % STAGE_DONUT_COLORS.length]}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-cursor}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        );
        cursor += len;
        return seg;
      })}
      <text x={cx} y={cx - 2} textAnchor="middle" className="avg-donut-num">
        {overall}
      </text>
      <text x={cx} y={cx + 18} textAnchor="middle" className="avg-donut-lbl">
        Avg call score
      </text>
    </svg>
  );
}

function LeadFunnel({ steps }) {
  const max = steps[0]?.value || 1;
  return (
    <div className="lead-funnel">
      {steps.map((step, i) => {
        const heightPct = Math.max((step.value / max) * 100, 6);
        const color = STAGE_DONUT_COLORS[i % STAGE_DONUT_COLORS.length];
        return (
          <div className="funnel-col" key={step.key}>
            <div className="funnel-col-plot">
              <div
                className="funnel-col-bar"
                style={{ height: `${heightPct}%`, background: color }}
                title={step.pct != null ? `${step.pct}% of ${step.of}` : step.caption}
              />
            </div>
            <span className="funnel-col-label">{step.label}</span>
            <div className="funnel-col-value">
              <span className="funnel-col-num">{step.value.toLocaleString()}</span>
              <span className="funnel-col-pct">({step.pct != null ? step.pct : 100}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function callCoachingNote(result, rubric) {
  if (!result.needsCoaching) return null;
  const ids = result.flaggedSections?.length
    ? result.flaggedSections
    : result.failedSections ?? [];
  const names = ids
    .map((id) => rubric.sections.find((s) => s.id === id)?.name)
    .filter(Boolean);
  return names.length > 0 ? names.join(', ') : 'Below coaching threshold';
}

function CallScoreCard({ rubric, result, isRatingGuide, call }) {
  const [expandedSections, setExpandedSections] = useState(() => new Set());

  const sectionIds = rubric.sections.map((s) => s.id);
  const allExpanded =
    sectionIds.length > 0 && sectionIds.every((id) => expandedSections.has(id));

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const expandAll = () => setExpandedSections(new Set(sectionIds));
  const collapseAll = () => setExpandedSections(new Set());

  return (
    <div className="breakdown-panel call-score-panel">
      <div className="breakdown-panel-header">
        <div>
          <h3>Call score</h3>
          <p className="sub">{result.formula}</p>
          <p className="call-score-meta">
            {call.id} · {call.agent} · {call.date}
          </p>
        </div>
        <button
          type="button"
          className="link-btn"
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      <ScoreBreakdown
        result={result}
        rubric={rubric}
        expandedSections={expandedSections}
        onToggleSection={toggleSection}
        confidence={isRatingGuide ? call.stageConfidence : call.confidence}
        isRatingGuide={isRatingGuide}
      />
    </div>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span className="stat-card-label">{label}</span>
      <span className="stat-card-value">{value}</span>
      {hint && <span className="stat-card-hint">{hint}</span>}
    </div>
  );
}

function DashboardView({ rubric }) {
  const threshold = rubric.settings.sectionFlagThreshold;
  const isRatingGuide =
    (rubric.editorVersion ?? EDITOR_VERSIONS.V1) === EDITOR_VERSIONS.V2;

  const scoredCalls = useMemo(
    () =>
      callLog.map((call) => {
        const result = isRatingGuide
          ? scoreCallV2(rubric, call.stageRatings ?? {}, rubric.settings)
          : scoreCall(rubric, call.evaluations, rubric.settings, call.percents ?? {});
        return { call, result };
      }),
    [rubric, isRatingGuide],
  );

  const savedPrefs = useRef(readDashboardPrefs()).current;
  const [filters, setFilters] = useState(
    () => savedPrefs.filters ?? { date: '', agent: '', type: '' },
  );
  const [search, setSearch] = useState(() => savedPrefs.search ?? '');
  const [dateRange, setDateRange] = useState(() => savedPrefs.dateRange ?? '30d');
  const [customRange, setCustomRange] = useState(
    () => savedPrefs.customRange ?? { from: '', to: '' },
  );

  const anchorDate = useMemo(() => {
    const times = callLog
      .map((c) => parseCallDate(c.date)?.getTime())
      .filter((t) => typeof t === 'number');
    return times.length ? new Date(Math.max(...times)) : new Date();
  }, []);

  const dateOptions = useMemo(
    () => [
      { value: '', label: 'All dates' },
      ...[...new Set(callLog.map((c) => c.date))].map((d) => ({ value: d, label: d })),
    ],
    [],
  );
  const agentOptions = useMemo(
    () => [
      { value: '', label: 'All agents' },
      ...[...new Set(callLog.map((c) => c.agent))].map((a) => ({ value: a, label: a })),
    ],
    [],
  );
  const typeOptions = [
    { value: '', label: 'All types' },
    { value: 'lead', label: 'Lead call' },
    { value: 'non-lead', label: 'Non-lead call' },
  ];

  const filteredCalls = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoredCalls.filter(({ call, result }) => {
      if (filters.agent && call.agent !== filters.agent) return false;
      if (filters.type && call.type !== filters.type) return false;
      if (filters.date && call.date !== filters.date) return false;
      if (!inDateRange(parseCallDate(call.date), dateRange, anchorDate, customRange))
        return false;
      if (term) {
        const haystack = [
          call.id,
          call.agent,
          call.date,
          call.outcome,
          CALL_TYPE_LABEL[call.type] ?? call.type,
          String(result.overall),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [scoredCalls, filters, search, dateRange, anchorDate, customRange]);

  const hasFilters = Boolean(filters.date || filters.agent || filters.type);
  const clearFilters = () => setFilters({ date: '', agent: '', type: '' });
  const toggleFilter = (key, value) =>
    setFilters((f) => ({ ...f, [key]: f[key] === value ? '' : value }));

  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const filterMenuRef = useRef(null);
  useEffect(() => {
    if (!filterMenuOpen) return undefined;
    const onDown = (e) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) {
        setFilterMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [filterMenuOpen]);

  const activeFilterChips = [
    filters.date && { key: 'date', label: 'Date', value: filters.date },
    filters.agent && { key: 'agent', label: 'Agent', value: filters.agent },
    filters.type && {
      key: 'type',
      label: 'Type',
      value: CALL_TYPE_LABEL[filters.type] ?? filters.type,
    },
  ].filter(Boolean);
  const activeFilterCount = activeFilterChips.length;

  const stageContribs = useMemo(
    () =>
      teamPerformance.sections.map((s) => {
        const weight = rubric.sections.find((rs) => rs.id === s.id)?.weight ?? 0;
        return {
          id: s.id,
          name: s.name,
          avg: s.avg,
          weightPct: Math.round(weight * 100),
          contribution: s.avg * weight,
        };
      }),
    [rubric.sections],
  );
  const overallAvg = useMemo(
    () => Math.round(stageContribs.reduce((sum, s) => sum + s.contribution, 0)),
    [stageContribs],
  );
  const dateRangeLabel =
    DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? 'Last 30 days';

  const [selectedCallId, setSelectedCallId] = useState(callLog[0]?.id ?? null);
  const selected =
    filteredCalls.find((s) => s.call.id === selectedCallId) ?? filteredCalls[0];

  const MIN_PANEL = 400;
  const layoutRef = useRef(null);
  const draggingRef = useRef(false);
  const [leftPct, setLeftPct] = useState(58);
  const [aiOpen, setAiOpen] = useState(() => savedPrefs.aiOpen ?? true);

  useEffect(() => {
    writeDashboardPrefs({ filters, search, dateRange, customRange, aiOpen });
  }, [filters, search, dateRange, customRange, aiOpen]);
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth <= 1100,
  );

  const startResize = (e) => {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const clampPct = (pct, width) => {
      const minPct = (MIN_PANEL / width) * 100;
      return Math.max(minPct, Math.min(pct, 100 - minPct));
    };

    const onMove = (e) => {
      if (!draggingRef.current || !layoutRef.current) return;
      const rect = layoutRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftPct(clampPct(pct, rect.width));
    };
    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    const onResize = () => {
      setIsNarrow(window.innerWidth <= 1100);
      if (layoutRef.current) {
        const rect = layoutRef.current.getBoundingClientRect();
        setLeftPct((prev) => clampPct(prev, rect.width));
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="page dashboard-page">
      <div className="page-header dashboard-header">
        <div>
          <h1>Team performance</h1>
          <p>{dateRangeLabel} · Select a call to see its score breakdown</p>
        </div>
        <div className="dashboard-date-filter">
          <span className="dashboard-date-label">Date range</span>
          <SelectField
            value={dateRange}
            onChange={setDateRange}
            options={DATE_RANGE_OPTIONS}
            ariaLabel="Date range"
          />
          {dateRange === 'custom' && (
            <div className="dashboard-custom-range">
              <input
                type="date"
                value={customRange.from}
                onChange={(e) =>
                  setCustomRange((r) => ({ ...r, from: e.target.value }))
                }
                aria-label="From date"
              />
              <span>to</span>
              <input
                type="date"
                value={customRange.to}
                onChange={(e) => setCustomRange((r) => ({ ...r, to: e.target.value }))}
                aria-label="To date"
              />
            </div>
          )}
        </div>
      </div>

      <div className={`chart-card ai-summary-card ${aiOpen ? '' : 'collapsed'}`}>
        <button
          type="button"
          className="ai-summary-head"
          aria-expanded={aiOpen}
          onClick={() => setAiOpen((v) => !v)}
        >
          <span className="ai-summary-badge">AI summary</span>
          <svg
            className={`ai-summary-chevron ${aiOpen ? 'open' : ''}`}
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
        </button>

        {aiOpen && (
          <div className="ai-summary-body">
            <div className="ai-summary-col">
              <div className="ai-summary-block">
                <h4>What’s driving lost leads</h4>
                <p>{teamSummary.lostLeadsSummary}</p>
              </div>

              <div className="ai-summary-block">
                <h4>Where coaching is needed</h4>
                <p className="coaching-summary-text">{teamSummary.coachingSummary}</p>
                <div className="coaching-summary-meta">
                  <span className="pill pill-coach">
                    {teamSummary.coachingCount} of {teamSummary.totalEmployees} need coaching
                  </span>
                </div>
                <ul className="ai-coach-list">
                  {teamSummary.coachingAgents.map((a) => (
                    <li key={a.name}>
                      <span className="ai-coach-name">{a.name}</span>
                      <span className="ai-coach-detail">
                        weakest in {a.weakSection} · avg {a.avgScore}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="ai-summary-col">
              <div className="ai-summary-block">
                <h4>Suggested coaching material</h4>
                <ul className="ai-tip-list">
                  {teamSummary.recommendedMaterial.map((m, i) => (
                    <li key={i}>
                      <span className="ai-tip-stage">{m.stage}</span>
                      <span className="ai-tip-text">{m.tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="stat-card-grid stat-card-grid-4">
        <StatCard label="Total employees" value={teamSummary.totalEmployees} />
        <StatCard
          label="Lead calls"
          value={teamSummary.totalLeadCalls}
          hint={`among all ${teamSummary.callsTaken} total calls`}
        />
        <StatCard
          label="Leads converted"
          value={`${teamSummary.leadsConvertedRate}%`}
          hint="Appointments booked"
        />
        <StatCard
          label="Leads won"
          value={`${teamSummary.leadsWonRate}%`}
          hint="Closed to a job"
        />
      </div>

      <div className="dashboard-metrics-row">
        <div className="chart-card avg-score-card">
          <h3>Avg call score</h3>
          <div className="avg-score-layout">
            <AvgScoreDonut overall={overallAvg} stages={stageContribs} />
            <ul className="avg-score-legend">
              {stageContribs.map((s, i) => {
                const flagged = s.avg < threshold;
                const points = Math.round(s.contribution);
                const formula = `${s.weightPct}% (stage weight) × ${s.avg}% (stage score) = ${points} pts`;
                return (
                  <li key={s.id} className="avg-legend-row">
                    <span
                      className="avg-legend-dot"
                      style={{
                        background: STAGE_DONUT_COLORS[i % STAGE_DONUT_COLORS.length],
                      }}
                    />
                    <span className="avg-legend-name" title={s.name}>
                      {s.name}
                    </span>
                    <HoverTooltip label={formula} className="avg-legend-score">
                      {points}
                      <span className={`avg-legend-pct ${flagged ? 'flagged' : ''}`}>
                        ({s.avg}%)
                      </span>
                    </HoverTooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="chart-card lead-funnel-card">
          <div className="lead-funnel-head">
            <h3>Lead funnel</h3>
            <span className="lead-funnel-sub">
              {teamSummary.totalEmployees} employees · {dateRangeLabel}
            </span>
          </div>
          <LeadFunnel steps={teamSummary.funnel} />
        </div>
      </div>

      <div className="call-log-split" ref={layoutRef}>
        <div
          className="call-log-pane"
          style={isNarrow ? undefined : { width: `${leftPct}%` }}
        >
          <div className="call-log-pane-inner">
          <div className="call-log-head">
            <h3>Call performance</h3>
            <div className="call-log-search-row">
              <input
                type="search"
                className="call-log-search"
                placeholder="Search calls by ID, agent, outcome…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search calls"
              />
              <div className="call-log-filter-menu" ref={filterMenuRef}>
                <button
                  type="button"
                  className={`call-log-filter-btn ${activeFilterCount ? 'active' : ''}`}
                  aria-label="Filters"
                  aria-expanded={filterMenuOpen}
                  onClick={() => setFilterMenuOpen((v) => !v)}
                >
                  <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M2 4h12M4 8h8M6.5 12h3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="call-log-filter-count">{activeFilterCount}</span>
                  )}
                </button>
                {filterMenuOpen && (
                  <div className="call-log-filter-pop" role="menu">
                    <label className="call-log-filter-field">
                      <span>Date</span>
                      <SelectField
                        value={filters.date}
                        onChange={(v) => setFilters((f) => ({ ...f, date: v }))}
                        options={dateOptions}
                        ariaLabel="Filter by date"
                      />
                    </label>
                    <label className="call-log-filter-field">
                      <span>Agent</span>
                      <SelectField
                        value={filters.agent}
                        onChange={(v) => setFilters((f) => ({ ...f, agent: v }))}
                        options={agentOptions}
                        ariaLabel="Filter by agent"
                      />
                    </label>
                    <label className="call-log-filter-field">
                      <span>Call type</span>
                      <SelectField
                        value={filters.type}
                        onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
                        options={typeOptions}
                        ariaLabel="Filter by call type"
                      />
                    </label>
                    {hasFilters && (
                      <button
                        type="button"
                        className="call-log-filter-pop-clear"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            {hasFilters && (
              <div className="call-log-active-filters">
                {activeFilterChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="call-log-chip"
                    onClick={() => setFilters((f) => ({ ...f, [chip.key]: '' }))}
                    title="Remove filter"
                  >
                    <span className="call-log-chip-label">{chip.label}:</span>{' '}
                    {chip.value}
                    <span className="call-log-chip-x" aria-hidden>
                      ×
                    </span>
                  </button>
                ))}
                <button
                  type="button"
                  className="call-log-filter-clear"
                  onClick={clearFilters}
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="call-log-table-scroll">
            <table className="data-table performance-table call-log-table">
              <thead>
                <tr>
                  <th>Call ID</th>
                  <th>Date</th>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Call score</th>
                  <th>Lead outcome</th>
                </tr>
              </thead>
              <tbody>
                {filteredCalls.map(({ call, result }) => {
                  const coachingNote = callCoachingNote(result, rubric);
                  const isSelected = selected?.call.id === call.id;
                  return (
                    <tr
                      key={call.id}
                      className={`call-log-row ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedCallId(call.id)}
                    >
                      <td className="strong">{call.id}</td>
                      <td className="call-log-date">
                        <button
                          type="button"
                          className="call-log-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFilter('date', call.date);
                          }}
                        >
                          {call.date}
                        </button>
                      </td>
                      <td>
                        <span className="call-log-agent-cell">
                          <button
                            type="button"
                            className="call-log-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFilter('agent', call.agent);
                            }}
                          >
                            {call.agent}
                          </button>
                          {result.needsCoaching && (
                            <HoverTooltip
                              label={`Needs coaching: ${coachingNote}`}
                              className="call-log-coach-anchor"
                            >
                              <span className="pill pill-coach call-log-coach">
                                Coaching
                              </span>
                            </HoverTooltip>
                          )}
                        </span>
                      </td>
                      <td className="call-log-type">
                        <button
                          type="button"
                          className="call-log-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFilter('type', call.type);
                          }}
                        >
                          {CALL_TYPE_LABEL[call.type] ?? call.type}
                        </button>
                      </td>
                      <td>
                        <span className="call-log-score-cell">
                          <span
                            className={`call-log-score ${result.needsCoaching ? 'weak' : ''}`}
                          >
                            {result.overall}
                          </span>
                          {(() => {
                            const delta = result.overall - overallAvg;
                            return (
                              <span
                                className={`delta-badge ${delta >= 0 ? 'pos' : 'neg'} call-log-delta`}
                              >
                                {delta >= 0 ? '+' : ''}
                                {delta}
                              </span>
                            );
                          })()}
                        </span>
                      </td>
                      <td>
                        <CallOutcomePill outcome={call.outcome} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
          {!isNarrow && (
            <div
              className="call-log-resize-handle"
              role="separator"
              aria-orientation="vertical"
              onMouseDown={startResize}
            />
          )}
        </div>

        {selected && (
          <div
            className="call-log-pane"
            style={isNarrow ? undefined : { width: `${100 - leftPct}%` }}
          >
            <div className="call-log-pane-inner">
              <CallScoreCard
                rubric={rubric}
                result={selected.result}
                isRatingGuide={isRatingGuide}
                call={selected.call}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState(parseView);
  const [registry, setRegistry] = useState(createInitialRegistry);
  const [activeRubricId, setActiveRubricId] = useState('lead-calls-default');
  const [rubric, setRubric] = useState(() => cloneRubric(defaultRubric));
  const [dirty, setDirty] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showAddRubric, setShowAddRubric] = useState(false);
  const [showEditRubricMeta, setShowEditRubricMeta] = useState(false);
  const [shareRubricId, setShareRubricId] = useState(null);
  const [deleteRubricId, setDeleteRubricId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(parseSection);
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [selectedAttrId, setSelectedAttrId] = useState(() => {
    const sectionId = parseSection();
    const section =
      defaultRubric.sections.find((s) => s.id === sectionId) || defaultRubric.sections[0];
    return firstAttributeId(section);
  });
  const [selectedRatingLevelId, setSelectedRatingLevelId] = useState(null);
  const [sampleCallId, setSampleCallId] = useState('strong');

  const editorVersion = rubric.editorVersion ?? EDITOR_VERSIONS.V1;

  const hubRows = useMemo(() => registry.map(registryToRow), [registry]);

  const publishDisabled = useMemo(() => {
    return Math.abs(sectionWeightSum(rubric.sections) - 1) >= 0.01;
  }, [rubric.sections]);

  const sampleCall = sampleCalls.find((c) => c.id === sampleCallId);
  const isRatingGuide = editorVersion === EDITOR_VERSIONS.V2;

  const previewResult = useMemo(() => {
    if (!sampleCall) return null;
    if (isRatingGuide) {
      return scoreCallV2(rubric, sampleCall.stageRatings ?? {}, rubric.settings);
    }
    return scoreCall(
      rubric,
      sampleCall.evaluations,
      rubric.settings,
      sampleCall.percents ?? {},
    );
  }, [rubric, sampleCall, isRatingGuide]);

  const navigate = (nextView, section) => {
    setView(nextView);
    setUrl(nextView, section || selectedSectionId);
  };

  const markDirty = () => setDirty(true);

  const touchRubric = (updater) => {
    const now = new Date().toISOString();
    setRubric((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      setRegistry((reg) =>
        reg.map((item) =>
          item.id !== activeRubricId
            ? item
            : { ...item, rubric: cloneRubric(next), lastUpdatedAt: now },
        ),
      );
      return next;
    });
    markDirty();
  };

  const openRubric = (id, targetView) => {
    const item = registry.find((r) => r.id === id);
    if (!item) return;
    let nextRubric = cloneRubric(item.rubric);
    if ((nextRubric.editorVersion ?? EDITOR_VERSIONS.V1) === EDITOR_VERSIONS.V2) {
      nextRubric = {
        ...nextRubric,
        sections: nextRubric.sections.map(ensureSectionRatingGuide),
      };
    }
    const firstSection = nextRubric.sections[0];
    setActiveRubricId(id);
    setRubric(nextRubric);
    setDirty(false);
    setSelectedSectionId(firstSection.id);
    setSelectedAttrId(firstAttributeId(firstSection));
    setSelectedRatingLevelId(null);
    navigate(targetView, firstSection.id);
  };

  const openPreview = (id) => openRubric(id, 'preview');
  const openEdit = (id) => openRubric(id, 'edit');

  const handleAddRubric = ({ name, callType, description }) => {
    const now = new Date().toISOString();
    const newRubric = generateRubricFromPrompt(name, callType, description);
    const firstSection = newRubric.sections[0];
    const id = `rubric-${Date.now()}`;
    setRegistry((prev) => [
      ...prev,
      {
        id,
        rubric: newRubric,
        status: 'draft',
        isSystemDefault: false,
        onboardedAt: null,
        lastUpdatedAt: now,
      },
    ]);
    setShowAddRubric(false);
    setActiveRubricId(id);
    setRubric(cloneRubric(newRubric));
    setDirty(false);
    setSelectedSectionId(firstSection.id);
    setSelectedAttrId(firstAttributeId(firstSection));
    setSelectedRatingLevelId(null);
    navigate('edit', firstSection.id);
  };

  const handleDuplicate = (id) => {
    const item = registry.find((r) => r.id === id);
    if (!item) return;
    const now = new Date().toISOString();
    const copy = cloneRubric(item.rubric);
    copy.name = `${item.rubric.name} (copy)`;
    const newId = `rubric-${Date.now()}`;
    setRegistry((prev) => [
      ...prev,
      {
        id: newId,
        rubric: copy,
        status: 'draft',
        isSystemDefault: false,
        onboardedAt: null,
        lastUpdatedAt: now,
      },
    ]);
  };

  const handleToggleAdopt = (id, adopted) => {
    setRegistry((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        if (item.status === 'draft') return item;
        return { ...item, status: adopted ? 'active' : 'deactivated' };
      }),
    );
  };

  const handleDelete = (id) => {
    setRegistry((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (activeRubricId === id && next.length > 0) {
        setActiveRubricId(next[0].id);
        setRubric(cloneRubric(next[0].rubric));
      }
      return next;
    });
    setDeleteRubricId(null);
  };

  const updateAttr = (sectionId, attrId, patch) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId
          ? s
          : {
              ...s,
              attributes: s.attributes.map((a) =>
                a.id !== attrId ? a : { ...a, ...patch },
              ),
            },
      ),
    }));
  };

  const updateAttrWeight = (sectionId, attrId, percent) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId
          ? s
          : applyAttributeCustomWeight(s, attrId, percent / 100),
      ),
    }));
  };

  const updateSectionName = (sectionId, name) => {
    const trimmed = name.trim().slice(0, STAGE_NAME_MAX_LENGTH);
    if (!trimmed) return;
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, name: trimmed },
      ),
    }));
  };

  const updateRubricMeta = (patch) => {
    touchRubric((prev) => ({
      ...prev,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.callType !== undefined ? { callType: patch.callType } : {}),
    }));
  };

  const updateWeight = (sectionId, weight) => {
    touchRubric((prev) => {
      const sections = normalizeSectionWeights(prev.sections, sectionId, weight);
      const thresholds = { ...(prev.settings.sectionCoachingThresholds ?? {}) };
      if (thresholds[sectionId] != null) {
        const updatedSection = sections.find((s) => s.id === sectionId);
        if (updatedSection) {
          thresholds[sectionId] = clampSectionCoachingThreshold(
            thresholds[sectionId],
            updatedSection.weight,
          );
        }
      }
      return {
        ...prev,
        sections,
        settings: { ...prev.settings, sectionCoachingThresholds: thresholds },
      };
    });
  };

  const updateSettings = (patch) => {
    touchRubric((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }));
  };

  const handleSaveAndExit = () => {
    const now = new Date().toISOString();
    setRegistry((prev) =>
      prev.map((item) =>
        item.id !== activeRubricId
          ? item
          : {
              ...item,
              rubric: cloneRubric(rubric),
              status: item.status === 'active' ? 'active' : 'draft',
              lastUpdatedAt: now,
            },
      ),
    );
    setDirty(false);
    navigate('hub');
  };

  const addSection = () => {
    const newSection = createEmptySection('New stage');
    touchRubric((prev) => {
      const sections = normalizeSectionWeights(
        [...prev.sections, newSection],
        newSection.id,
        0.1,
      );
      return { ...prev, sections };
    });
    setSelectedSectionId(newSection.id);
    setSelectedAttrId(firstAttributeId(newSection));
    setEditingSectionId(newSection.id);
  };

  const reorderSectionsToIndex = (sourceId, insertIndex) => {
    touchRubric((prev) => {
      const sections = [...prev.sections];
      const fromIndex = sections.findIndex((s) => s.id === sourceId);
      if (fromIndex < 0) return prev;
      let targetIndex = insertIndex;
      if (fromIndex < targetIndex) targetIndex -= 1;
      if (targetIndex === fromIndex) return prev;
      const [moved] = sections.splice(fromIndex, 1);
      sections.splice(targetIndex, 0, moved);
      return { ...prev, sections };
    });
  };

  const removeSection = (sectionId) => {
    touchRubric((prev) => {
      const remaining = prev.sections.filter((s) => s.id !== sectionId);
      const sum = remaining.reduce((t, s) => t + s.weight, 0);
      const sections = remaining.map((s) => ({ ...s, weight: s.weight / sum }));
      return { ...prev, sections };
    });
    if (selectedSectionId === sectionId) {
      const next = rubric.sections.find((s) => s.id !== sectionId);
      if (next) {
        setSelectedSectionId(next.id);
        setSelectedAttrId(firstAttributeId(next));
      }
    }
  };

  const addAttribute = () => {
    const section = rubric.sections.find((s) => s.id === selectedSectionId);
    const usesCustom = section ? sectionUsesCustomWeights(section) : false;
    const newAttr = {
      ...createEmptyAttribute(),
      weightMode: usesCustom ? WEIGHT_MODE.CUSTOM : WEIGHT_MODE.EQUAL,
      weightLocked: false,
    };
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== selectedSectionId
          ? s
          : syncAttributeWeightsAfterListChange({
              ...s,
              attributes: [...s.attributes, newAttr],
            }),
      ),
    }));
    setSelectedAttrId(newAttr.id);
  };

  const removeAttribute = (attrId) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== selectedSectionId
          ? s
          : syncAttributeWeightsAfterListChange({
              ...s,
              attributes: s.attributes.filter((a) => a.id !== attrId),
            }),
      ),
    }));
    if (selectedAttrId === attrId) {
      const section = rubric.sections.find((s) => s.id === selectedSectionId);
      const remaining = section?.attributes.filter((a) => a.id !== attrId);
      setSelectedAttrId(firstAttributeId({ attributes: remaining ?? [] }));
    }
  };

  const duplicateAttribute = (attrId) => {
    const section = rubric.sections.find((s) => s.id === selectedSectionId);
    const source = section?.attributes.find((a) => a.id === attrId);
    if (!source) return;
    const copy = {
      ...cloneRubric({ item: source }).item,
      id: `attr-${Date.now()}`,
      name: `${source.name} (copy)`,
      weightLocked: false,
    };
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== selectedSectionId
          ? s
          : syncAttributeWeightsAfterListChange({
              ...s,
              attributes: [...s.attributes, copy],
            }),
      ),
    }));
    setSelectedAttrId(copy.id);
  };

  const updateAttrWeightMode = (sectionId, attrId, weightMode) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        if (weightMode === WEIGHT_MODE.CUSTOM) {
          return convertSectionToCustomWeights(s);
        }
        return resetSectionToEqualWeights(s);
      }),
    }));
  };

  const setEditorVersion = (version) => {
    if (version === editorVersion) return;
    touchRubric((prev) => {
      const next = { ...prev, editorVersion: version };
      if (version === EDITOR_VERSIONS.V2) {
        next.sections = next.sections.map(ensureSectionRatingGuide);
      }
      return next;
    });
    if (version === EDITOR_VERSIONS.V2) {
      setSelectedRatingLevelId(null);
    }
  };

  const updateRatingLevel = (sectionId, levelId, patch) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const guide = ensureSectionRatingGuide(s).ratingGuide;
        return {
          ...s,
          ratingGuide: {
            ...guide,
            levels: guide.levels.map((l) => (l.id === levelId ? { ...l, ...patch } : l)),
          },
        };
      }),
    }));
  };

  const addRatingLevel = (sectionId) => {
    const newLevel = createRatingLevel(0, 'Describe behavior at this rating level.');
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const guide = ensureSectionRatingGuide(s).ratingGuide;
        const nextScore = guide.levels.length + 1;
        return {
          ...s,
          ratingGuide: {
            ...guide,
            levels: [...guide.levels, { ...newLevel, score: nextScore }],
          },
        };
      }),
    }));
    if (sectionId === selectedSectionId) {
      setSelectedRatingLevelId(newLevel.id);
    }
  };

  const removeRatingLevel = (sectionId, levelId) => {
    const section = rubric.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const guide = ensureSectionRatingGuide(section).ratingGuide;
    const filtered = guide.levels.filter((l) => l.id !== levelId);
    if (filtered.length < 2) return;
    const levels = renumberRatingLevels(filtered);
    if (levelId === selectedRatingLevelId) {
      setSelectedRatingLevelId(null);
    }
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, ratingGuide: { ...guide, levels } },
      ),
    }));
  };

  const setRatingMinimumStandard = (sectionId, levelId, enabled) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const guide = ensureSectionRatingGuide(s).ratingGuide;
        return {
          ...s,
          ratingGuide: {
            ...guide,
            levels: guide.levels.map((l) => ({
              ...l,
              minimumStandard: l.id === levelId ? enabled : enabled ? false : l.minimumStandard,
            })),
          },
        };
      }),
    }));
  };

  const generateRatingGuideAI = (sectionId) => {
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const generated = generateRatingGuideWithAI(s);
        return { ...s, ratingGuide: generated };
      }),
    }));
  };

  const resetRatingGuide = (sectionId) => {
    const section = rubric.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const defaultGuide = defaultRatingGuideForSection(section);
    touchRubric((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id !== sectionId ? s : { ...s, ratingGuide: defaultGuide },
      ),
    }));
    if (sectionId === selectedSectionId) {
      setSelectedRatingLevelId(null);
    }
  };

  return (
    <AppShell
      view={view}
      rubricName={rubric.name}
      onNavigate={navigate}
      dirty={dirty}
      onPublish={() => setShowPublish(true)}
      onSaveAndExit={handleSaveAndExit}
      onEditRubricMeta={() => setShowEditRubricMeta(true)}
      editorVersion={['edit', 'scoring', 'preview'].includes(view) ? editorVersion : undefined}
      onEditorVersionChange={setEditorVersion}
      onEditorTab={navigate}
      publishDisabled={publishDisabled}
    >
      {view === 'hub' && (
        <HubView
          items={hubRows}
          onAdd={() => setShowAddRubric(true)}
          onEdit={openEdit}
          onPreview={openPreview}
          onDuplicate={handleDuplicate}
          onShare={(id) => setShareRubricId(id)}
          onDelete={(id) => setDeleteRubricId(id)}
          onToggleAdopt={handleToggleAdopt}
        />
      )}
      {view === 'edit' && (
        <EditorView
          rubric={rubric}
          selectedSectionId={selectedSectionId}
          selectedAttrId={selectedAttrId}
          selectedRatingLevelId={selectedRatingLevelId}
          editingSectionId={editingSectionId}
          onSelectSection={(id) => {
            setSelectedSectionId(id);
            setUrl('edit', id);
            const nextSection = rubric.sections.find((s) => s.id === id);
            setSelectedAttrId(firstAttributeId(nextSection));
            setSelectedRatingLevelId(null);
          }}
          onSelectAttr={setSelectedAttrId}
          onSelectRatingLevel={setSelectedRatingLevelId}
          onUpdateAttr={updateAttr}
          onUpdateRatingLevel={updateRatingLevel}
          onAddRatingLevel={addRatingLevel}
          onRemoveRatingLevel={removeRatingLevel}
          onSetRatingMinimumStandard={setRatingMinimumStandard}
          onGenerateRatingGuideAI={generateRatingGuideAI}
          onResetRatingGuide={resetRatingGuide}
          onUpdateSectionName={updateSectionName}
          onEditingSectionDone={() => setEditingSectionId(null)}
          onSectionWeightChange={updateWeight}
          onAddSection={addSection}
          onRemoveSection={removeSection}
          onReorderSections={reorderSectionsToIndex}
          onAddAttribute={addAttribute}
          onRemoveAttribute={removeAttribute}
          onDuplicateAttribute={duplicateAttribute}
          onAttrWeightChange={updateAttrWeight}
          onAttrWeightModeChange={updateAttrWeightMode}
        />
      )}
      {view === 'scoring' && (
        <ScoringView
          rubric={rubric}
          onSettingsChange={updateSettings}
        />
      )}
      {view === 'preview' && previewResult && (
        <PreviewView
          rubric={rubric}
          sampleCallId={sampleCallId}
          onSampleChange={setSampleCallId}
          result={previewResult}
          isRatingGuide={isRatingGuide}
          onEdit={() => navigate('edit', selectedSectionId)}
        />
      )}
      {view === 'dashboard' && (
        <DashboardView rubric={rubric} />
      )}
      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          onConfirm={() => {
            const now = new Date().toISOString();
            setRegistry((prev) =>
              prev.map((item) =>
                item.id !== activeRubricId
                  ? item
                  : {
                      ...item,
                      rubric: cloneRubric(rubric),
                      status: item.status === 'draft' ? 'active' : item.status,
                      lastUpdatedAt: now,
                    },
              ),
            );
            setDirty(false);
            setShowPublish(false);
            navigate('hub');
          }}
        />
      )}
      {showAddRubric && (
        <RubricMetaModal
          mode="create"
          initialName={DEMO_RUBRIC_CREATE_PREFILL.name}
          initialCallType={DEMO_RUBRIC_CREATE_PREFILL.callType}
          initialDescription={DEMO_RUBRIC_CREATE_PREFILL.description}
          onClose={() => setShowAddRubric(false)}
          onSubmit={(payload) => {
            handleAddRubric(payload);
            setShowAddRubric(false);
          }}
        />
      )}
      {showEditRubricMeta && (
        <RubricMetaModal
          mode="edit"
          initialName={rubric.name}
          initialCallType={rubric.callType}
          onClose={() => setShowEditRubricMeta(false)}
          onSubmit={({ name, callType }) => {
            updateRubricMeta({ name, callType });
            setShowEditRubricMeta(false);
          }}
        />
      )}
      {shareRubricId && (
        <ShareRubricModal
          rubricName={registry.find((r) => r.id === shareRubricId)?.rubric.name ?? 'Rubric'}
          onClose={() => setShareRubricId(null)}
        />
      )}
      {deleteRubricId && (
        <DeleteRubricModal
          rubricName={registry.find((r) => r.id === deleteRubricId)?.rubric.name ?? 'Rubric'}
          onClose={() => setDeleteRubricId(null)}
          onConfirm={() => handleDelete(deleteRubricId)}
        />
      )}
    </AppShell>
  );
}
