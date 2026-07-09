import { useRef, useState } from 'react';
import { ATTR_MODE, EVAL, WEIGHT_MODE } from '../data/defaultRubric.js';
import { EDITOR_VERSIONS } from '../data/ratingGuideV2.js';
import { HoverTooltip } from './HoverTooltip.jsx';
import { IconInfo } from './HubUI.jsx';
import {
  attributeWeightBadgePercent,
  sectionUsesCustomWeights,
  sectionWeightPercent,
} from '../lib/scoring.js';

const LABELS = {
  [EVAL.MET]: 'Pass',
  [EVAL.PARTIAL]: 'Partial',
  [EVAL.NOT_MET]: 'Fail',
};

const CONFIDENCE_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function shouldShowPercentScore(attr) {
  return (
    attr.scoringMode === ATTR_MODE.GRANULAR ||
    attr.scoringMode === ATTR_MODE.NUMERIC
  );
}

function formatNumericRating(scoreValue, attr) {
  const min = attr.numericMin ?? 1;
  const max = attr.numericMax ?? 100;
  const value = min + (scoreValue / 100) * (max - min);
  const rounded = Math.round(value * 10) / 10;
  const display = Number.isInteger(rounded) ? rounded : rounded.toFixed(1);
  return `${display} / ${max}`;
}

export function EvalBadge({ level, scoreValue, attr }) {
  if (attr.scoringMode === ATTR_MODE.NUMERIC && typeof scoreValue === 'number') {
    return (
      <span className="eval-badge eval-numeric">
        {formatNumericRating(scoreValue, attr)}
      </span>
    );
  }
  if (shouldShowPercentScore(attr) && typeof scoreValue === 'number') {
    return <span className="eval-badge eval-granular">{scoreValue}%</span>;
  }
  return <span className={`eval-badge eval-${level}`}>{LABELS[level] ?? level}</span>;
}

function attrWeightBadgePercent(attr, section) {
  if (!section) return null;
  const isCustom = (attr.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM;
  return isCustom ? attributeWeightBadgePercent(attr, section) : null;
}

export function ConfidenceBadge({ level }) {
  if (!level) return null;
  const label = CONFIDENCE_LABELS[level] ?? level;
  return (
    <span
      className={`conf-badge conf-${level}`}
      title="How confident the AI is in this evaluation"
    >
      AI: {label}
    </span>
  );
}

export function RatingBadge({ rating, maxRating = 5, belowMinimum = false }) {
  return (
    <span className={`rating-result-badge ${belowMinimum ? 'below-min' : ''}`}>
      Rate {rating}/{maxRating}
    </span>
  );
}

function ratingStageScoreFormula(section, data) {
  const weight = sectionWeightPercent(section.weight);
  const points = Math.round(data.contribution);
  const stageScore = Math.round((data.rating / data.maxRating) * 100);
  return `Stage score = (rating ÷ max rating) × 100 × stage weight = ${stageScore}% × ${weight}% = ${points} pts`;
}

function RatingStageDetail({
  stageResult,
  confidence,
  showAiConfidence = false,
  showRecordingDetails = false,
}) {
  const hasMeta = (showAiConfidence && confidence) || showRecordingDetails;
  return (
    <div className="rating-stage-detail">
      <p className="rating-stage-definition">
        {stageResult.matchedLevel?.description ?? 'No rating definition matched.'}
      </p>
      {hasMeta && (
        <div className="attr-score-meta">
          {showAiConfidence && confidence && (
            <span className="attr-confidence-subtitle">{confidenceSubtitle(confidence)}</span>
          )}
          {showRecordingDetails && (
            <button type="button" className="link-btn attr-recording-link">
              View recording details
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function confidenceSubtitle(level) {
  const label = CONFIDENCE_LABELS[level] ?? level;
  return `${label} confidence`;
}

export function AttributeEvalRow({
  attr,
  attrData,
  confidence,
  showAiConfidence = false,
  showRecordingDetails = false,
  weightPercent = null,
}) {
  if (!attrData) return null;
  const hasMeta =
    (showAiConfidence && confidence) || showRecordingDetails;
  return (
    <div className={`attr-score-row ${hasMeta ? 'with-confidence' : ''}`}>
      <div className="attr-score-main">
        <span className="attr-score-name">
          {attr.name}
          {weightPercent != null && (
            <span className="mini-badge weight custom inline">{weightPercent}%</span>
          )}
          {attr.required && (
            <HoverTooltip
              label="If this is missed, the whole stage is capped below 60 and flagged for coaching — even if the other attributes pass."
              className="req-badge-tip"
            >
              <span className="mini-badge req inline">Required</span>
            </HoverTooltip>
          )}
        </span>
        {hasMeta && (
          <div className="attr-score-meta">
            {showAiConfidence && confidence && (
              <span className="attr-confidence-subtitle">{confidenceSubtitle(confidence)}</span>
            )}
            {showRecordingDetails && (
              <button type="button" className="link-btn attr-recording-link">
                View recording details
              </button>
            )}
          </div>
        )}
      </div>
      <EvalBadge
        level={attrData.evalLevel}
        scoreValue={attrData.scoreValue}
        attr={attr}
      />
    </div>
  );
}

function stageScoreHint(section) {
  const count = section.attributes.filter((a) => a.enabled !== false).length;
  if (sectionUsesCustomWeights(section)) {
    return `Attribute average = weighted average of ${count} attributes`;
  }
  return `Attribute average = average of ${count} attributes (equally weighted)`;
}

function contributionFormulaTooltip(section, data) {
  const enabled = section.attributes.filter((a) => a.enabled !== false);
  const totalWeight = enabled.reduce(
    (sum, a) => sum + (data.byAttribute[a.id]?.weight ?? 0),
    0,
  );
  const terms = enabled.map((a) => {
    const ad = data.byAttribute[a.id];
    const score = ad?.scoreValue ?? 0;
    const wtPct =
      totalWeight > 0 ? Math.round(((ad?.weight ?? 0) / totalWeight) * 100) : 0;
    return `${score}% × ${wtPct}%`;
  });
  const stageWeight = sectionWeightPercent(section.weight);
  const points = Math.round(data.contribution);
  const expansion = `(${terms.join(' + ')}) × ${stageWeight}%`;
  const base = 'Stage score = Σ (attribute score × attribute weight) × stage weight';
  if (data.failed) {
    return `${base} =\n${expansion} → capped below 60% (required miss) = ${points}`;
  }
  return `${base} =\n${expansion} = ${points}`;
}

function overallScoreFormula(rubric, result) {
  const parts = rubric.sections.map((section) =>
    Math.round(result.bySection[section.id]?.contribution ?? 0),
  );
  const sum = parts.reduce((total, value) => total + value, 0);
  const diff = result.overall - sum;
  if (diff !== 0 && parts.length > 0) {
    let maxIdx = 0;
    for (let i = 1; i < parts.length; i += 1) {
      if (parts[i] > parts[maxIdx]) maxIdx = i;
    }
    parts[maxIdx] += diff;
  }
  return `Call score = Σ (stage scores) = ${parts.join(' + ')} = ${result.overall}`;
}

export function StageEvalGroup({
  section,
  stageResult,
  expanded,
  onToggle,
  confidence,
  showAiConfidence = false,
  showRecordingDetails = false,
}) {
  if (!stageResult) return null;
  return (
    <div className={`eval-stage-group ${expanded ? 'expanded' : ''}`}>
      <button
        type="button"
        className="eval-stage-head"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="eval-stage-name">
          <span className="expand-chevron" aria-hidden="true">
            {expanded ? '▼' : '▶'}
          </span>
          {section.name}
        </span>
        <span className="eval-stage-score" title="Attribute average (0–100)">
          {stageResult.score}
        </span>
      </button>
      {stageResult.failed && expanded && (
        <div className="required-miss eval-stage-miss">
          Required attribute missed — stage capped below 60, coaching needed
        </div>
      )}
      {expanded && (
        <div className="eval-stage-body">
          <p className="stage-score-hint">{stageScoreHint(section)}</p>
          <div className="attr-rows">
            {section.attributes
              .filter((a) => a.enabled !== false)
              .map((attr) => (
                <AttributeEvalRow
                  key={attr.id}
                  attr={attr}
                  attrData={stageResult.byAttribute[attr.id]}
                  confidence={confidence?.[attr.id]}
                  showAiConfidence={showAiConfidence}
                  showRecordingDetails={showRecordingDetails}
                  weightPercent={attrWeightBadgePercent(attr, section)}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ScoreCircle({ score, size = 'lg', label = 'Overall', formula = null }) {
  const cls = score < 60 ? 'low' : score < 80 ? 'mid' : 'high';
  const circle = (
    <div className={`score-circle ${cls} ${size} ${formula ? 'has-formula' : ''}`}>
      <span className="score-num">{score}</span>
      <span className="score-lbl">{label}</span>
    </div>
  );
  if (!formula) return circle;
  return (
    <HoverTooltip label={formula} className="score-circle-tip">
      {circle}
    </HoverTooltip>
  );
}

export function ScoreBreakdown({
  result,
  rubric,
  expandedSections,
  onToggleSection,
  confidence,
  showAiConfidence = false,
  showRecordingDetails = false,
  isRatingGuide = false,
}) {
  return (
    <div className="score-breakdown">
      <ScoreCircle
        score={result.overall}
        formula={overallScoreFormula(rubric, result)}
      />
      {result.failedSections?.length > 0 && (
        <div className="coaching-flag section-fail-flag">
          {isRatingGuide
            ? 'Stage below minimum standard — coaching needed'
            : 'Required attribute missed — stage capped, coaching needed'}
        </div>
      )}
      {result.needsCoaching && !result.failedSections?.length && (
        <div className="coaching-flag">Below coaching threshold</div>
      )}
      <div className="section-bars">
        <div className="section-bars-header">
          <span className="section-name">Stage</span>
          {isRatingGuide ? (
            <>
              <span className="section-bars-header-rating">Rating</span>
              <span className="section-bars-header-score">Score</span>
            </>
          ) : (
            <span className="section-score section-bars-header-score">Stage score</span>
          )}
        </div>
        {rubric.sections.map((section) => {
          const data = result.bySection[section.id];
          const isFlagged = result.flaggedSections?.includes(section.id);
          const expanded = expandedSections.has(section.id);
          const formula = isRatingGuide
            ? ratingStageScoreFormula(section, data)
            : contributionFormulaTooltip(section, data);
          const stagePoints = Math.round(data.contribution);
          return (
            <div key={section.id} className={`section-block ${expanded ? 'expanded' : ''}`}>
              <div className={`section-bar-row ${isRatingGuide ? 'rating-guide-row' : ''}`}>
                <button
                  type="button"
                  className={`section-bar-row-toggle ${isRatingGuide ? 'rating-guide-row-toggle' : ''}`}
                  onClick={() => onToggleSection?.(section.id)}
                  aria-expanded={expanded}
                >
                  <span className="section-name">
                    <span className="expand-chevron" aria-hidden="true">
                      {expanded ? '▼' : '▶'}
                    </span>
                    {section.name}
                    <span className="section-weight-pct">
                      ({sectionWeightPercent(section.weight)}%)
                    </span>
                    {data.failed && isRatingGuide && (
                      <span className="mini-badge fail">Below min</span>
                    )}
                  </span>
                  {!isRatingGuide && (
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${data.failed || isFlagged ? 'flagged' : ''}`}
                        style={{ width: `${data.score}%` }}
                      />
                    </div>
                  )}
                </button>
                {isRatingGuide ? (
                  <>
                    <RatingBadge
                      rating={data.rating}
                      maxRating={data.maxRating}
                      belowMinimum={data.belowMinimum}
                    />
                    <span
                      className="section-contrib-points rating-guide-stage-score"
                      data-formula={formula}
                      tabIndex={0}
                      aria-label={formula}
                    >
                      {stagePoints}
                    </span>
                  </>
                ) : (
                  <span className="section-score-combined">
                    <span
                      className="section-contrib-points"
                      data-formula={formula}
                      tabIndex={0}
                      aria-label={formula}
                    >
                      {stagePoints}
                    </span>
                    <span className="section-score-pct"> ({data.score}%)</span>
                  </span>
                )}
              </div>
              {data.failed && !isRatingGuide && (
                <div className="required-miss">
                  Required attribute missed — stage capped below 60, coaching needed
                </div>
              )}
              {expanded &&
                (isRatingGuide ? (
                  <RatingStageDetail
                    stageResult={data}
                    confidence={confidence?.[section.id]}
                    showAiConfidence={showAiConfidence}
                    showRecordingDetails={showRecordingDetails}
                  />
                ) : (
                  <div className="eval-stage-body">
                    <p className="stage-score-hint">{stageScoreHint(section)}</p>
                    <div className="attr-rows">
                      {section.attributes
                        .filter((a) => a.enabled !== false)
                        .map((attr) => (
                          <AttributeEvalRow
                            key={attr.id}
                            attr={attr}
                            attrData={data.byAttribute[attr.id]}
                            confidence={confidence?.[attr.id]}
                            showAiConfidence={showAiConfidence}
                            showRecordingDetails={showRecordingDetails}
                            weightPercent={attrWeightBadgePercent(attr, section)}
                          />
                        ))}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeightSlider({ label, value, onChange, min = 5, max = 60, editable = false, invalid = false }) {
  if (editable) {
    return (
      <div className="weight-slider weight-slider-editable">
        <span className="weight-slider-label">{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="weight-slider-input-wrap">
          <input
            type="text"
            inputMode="numeric"
            className={`stage-weight-input ${invalid ? 'input-error' : ''}`}
            maxLength={3}
            value={value}
            aria-invalid={invalid}
            onChange={(e) => {
              const digits = String(e.target.value).replace(/\D/g, '');
              if (digits === '') {
                onChange(0);
                return;
              }
              const normalized = digits.replace(/^0+/, '') || '0';
              onChange(Math.min(max, parseInt(normalized, 10)));
            }}
            aria-label={`${label} percent`}
          />
          <span className="pct-suffix">%</span>
        </span>
      </div>
    );
  }

  return (
    <div className="weight-slider">
      <div className="weight-slider-head">
        <span>{label}</span>
        <span className="weight-val">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

const SCORING_SUMMARY_TITLE = 'How rubric scoring works';
const SCORING_SUMMARY_LEAD =
  'Each call has an overall call score, which is dictated by its call stages and the attributes within them.';

const V1_SCORING_SUMMARY = {
  title: SCORING_SUMMARY_TITLE,
  lead: SCORING_SUMMARY_LEAD,
  points: [
    {
      title: 'Overall call score',
      formula: 'Call score = Σ (stage scores)',
      body: 'Each stage score already includes its stage weight, so the call score is simply the sum of all stage scores (the stage weights you set in Details must total 100%). The result is the final call score shown in Preview.',
    },
    {
      title: 'Stage scores',
      formula: 'Stage score = Σ (attribute score × attribute weight) × stage weight',
      body: 'A stage’s attributes are first combined into a weighted average from 0–100 (Pass/Fail = 100 or 0; Percentage = the AI’s 0–100% result; Numeric = the AI’s value mapped across your min–max range). That average is then multiplied by the stage weight to give the stage score in points.',
    },
    {
      title: 'When coaching is flagged',
      formula: 'Coaching if call score < threshold OR any required attribute fails',
      body: 'A missed required attribute caps the whole stage below 60 and flags it for coaching, even if other attributes passed. Coaching can also trigger when the overall call score falls below your threshold.',
    },
  ],
};

const V2_SCORING_SUMMARY = {
  title: SCORING_SUMMARY_TITLE,
  lead: SCORING_SUMMARY_LEAD,
  points: [
    {
      title: 'Overall call score',
      formula: 'Call score = Σ (stage scores)',
      body: 'Each stage score already includes its stage weight, so the call score is simply the sum of all stage scores (the stage weights you set in Details must total 100%). The result is the final call score shown in Preview.',
    },
    {
      title: 'Stage scores',
      formula: 'Stage score = (rating ÷ max rating) × 100 × stage weight',
      body: 'Each stage is rated on a 1–5 scale defined in the rating guide (e.g. Rate 3/5 = 60%). That percentage is then multiplied by the stage weight to give the stage score in points.',
    },
    {
      title: 'When coaching is flagged',
      formula: 'Coaching if call score < threshold OR stage rated below minimum standard',
      body: 'The minimum standard is the level you mark in the rating guide. Coaching can also trigger when the overall call score falls below your threshold.',
    },
  ],
};

export function getScoringSummary(version) {
  return version === EDITOR_VERSIONS.V2 ? V2_SCORING_SUMMARY : V1_SCORING_SUMMARY;
}

function ScoringSummaryPoints({ summary }) {
  return (
    <>
      <p className="rubric-scoring-summary-lead">{summary.lead}</p>
      <div className="rubric-scoring-summary-points">
        {summary.points.map((point) => (
          <article key={point.title} className="rubric-scoring-point">
            <h3 className="rubric-scoring-point-title">{point.title}</h3>
            <p className="rubric-scoring-point-formula">{point.formula}</p>
            <p className="rubric-scoring-point-body">{point.body}</p>
          </article>
        ))}
      </div>
    </>
  );
}

export function RubricScoringInfoTip({ version }) {
  const summary = getScoringSummary(version);
  const wrapRef = useRef(null);
  const closeTimer = useRef(null);
  const [pos, setPos] = useState(null);

  const open = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(760, window.innerWidth - margin * 2);
    let left = Math.min(rect.left, window.innerWidth - width - margin);
    left = Math.max(margin, left);
    setPos({ left, top: rect.bottom + 6, width });
  };

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setPos(null), 120);
  };

  return (
    <span
      ref={wrapRef}
      className="rubric-scoring-info"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
      onFocus={open}
      onBlur={scheduleClose}
    >
      <button
        type="button"
        className="rubric-scoring-info-trigger"
        aria-label="How rubric scoring works"
      >
        <IconInfo />
      </button>
      {pos && (
        <div
          className="rubric-scoring-info-popover is-fixed"
          role="tooltip"
          style={{ left: pos.left, top: pos.top, width: pos.width }}
        >
          <p className="rubric-scoring-info-popover-title">{summary.title}</p>
          <ScoringSummaryPoints summary={summary} />
        </div>
      )}
    </span>
  );
}

function ScoringSummaryChevron({ open }) {
  return (
    <svg
      className={`rubric-scoring-summary-chevron ${open ? 'open' : ''}`}
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

const SCORING_SUMMARY_OPEN_KEY = 'netic:scoringSummaryOpen';

function readScoringSummaryOpen() {
  if (typeof window === 'undefined') return true;
  try {
    const stored = window.localStorage.getItem(SCORING_SUMMARY_OPEN_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function ScoringFormulaBar({ version }) {
  const [open, setOpen] = useState(readScoringSummaryOpen);
  const summary = getScoringSummary(version);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SCORING_SUMMARY_OPEN_KEY, String(next));
      } catch {
        // ignore storage failures (e.g. private mode)
      }
      return next;
    });
  };

  return (
    <section
      className={`rubric-scoring-summary ${open ? 'is-open' : 'is-collapsed'}`}
      aria-label="How rubric scoring works"
    >
      <button
        type="button"
        className="rubric-scoring-summary-toggle"
        aria-expanded={open}
        onClick={toggleOpen}
      >
        <h2 className="rubric-scoring-summary-title">{summary.title}</h2>
        <ScoringSummaryChevron open={open} />
      </button>
      {open && (
        <div className="rubric-scoring-summary-content">
          <ScoringSummaryPoints summary={summary} />
        </div>
      )}
    </section>
  );
}

export function DeltaBadge({ score, teamAvg }) {
  const delta = score - teamAvg;
  const cls = delta >= 0 ? 'pos' : 'neg';
  const sign = delta >= 0 ? '+' : '';
  return (
    <span className={`delta-badge ${cls}`}>
      {sign}
      {delta} vs team
    </span>
  );
}
