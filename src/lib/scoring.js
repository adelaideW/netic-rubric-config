import { ATTR_MODE, EVAL, WEIGHT_MODE } from '../data/defaultRubric.js';

function effectiveWeight(attr) {
  return attr.weight ?? 1;
}

function binaryScore(evalLevel, settings) {
  if (evalLevel === EVAL.MET) return 100;
  if (evalLevel === EVAL.PARTIAL) {
    return settings.partialCreditEnabled
      ? Math.round(settings.partialCreditMultiplier * 100)
      : 0;
  }
  return 0;
}

function granularScore(evalLevel, percent, settings) {
  if (typeof percent === 'number') return Math.max(0, Math.min(100, percent));
  if (evalLevel === EVAL.MET) return 100;
  if (evalLevel === EVAL.PARTIAL) return 50;
  return 0;
}

// Numeric mode: AI returns a raw value in [min, max]; normalize to a 0–100 score.
function numericScore(evalLevel, value, attr) {
  const min = attr.numericMin ?? 0;
  const max = attr.numericMax ?? 100;
  if (typeof value === 'number' && max > min) {
    const pct = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  }
  if (evalLevel === EVAL.MET) return 100;
  if (evalLevel === EVAL.PARTIAL) return 50;
  return 0;
}

export function attributeScoreValue(attr, evalLevel, settings, percent) {
  if (attr.scoringMode === ATTR_MODE.NUMERIC) {
    return numericScore(evalLevel, percent, attr);
  }
  if (attr.scoringMode === ATTR_MODE.GRANULAR) {
    return granularScore(evalLevel, percent, settings);
  }
  return binaryScore(evalLevel, settings);
}

export function isRequiredMiss(attr, evalLevel, scoreValue, settings) {
  if (!attr.required) return false;
  if (
    attr.scoringMode === ATTR_MODE.GRANULAR ||
    attr.scoringMode === ATTR_MODE.NUMERIC
  ) {
    return scoreValue < (settings.granularPassThreshold ?? 70);
  }
  if (evalLevel === EVAL.NOT_MET) return true;
  if (evalLevel === EVAL.PARTIAL && !settings.partialCreditEnabled) return true;
  return false;
}

export function scoreAttribute(attr, evalLevel, settings, percent) {
  const scoreValue = attributeScoreValue(attr, evalLevel, settings, percent);
  const weight = effectiveWeight(attr);
  return {
    scoreValue,
    weight,
    points: (scoreValue / 100) * weight,
    evalLevel,
    percent,
    requiredMiss: isRequiredMiss(attr, evalLevel, scoreValue, settings),
  };
}

// When a Required attribute is missed, the whole stage is capped below this
// ceiling so a single critical miss can't leave the stage looking passable.
export const REQUIRED_MISS_STAGE_CAP = 59;

export function scoreSection(section, evaluations, settings, percents = {}) {
  const enabled = section.attributes.filter((a) => a.enabled !== false);
  let totalPoints = 0;
  let totalWeight = 0;
  let hasRequiredMiss = false;
  const byAttribute = {};

  for (const attr of enabled) {
    const evalLevel = evaluations[attr.id] ?? EVAL.NOT_MET;
    const percent = percents[attr.id];
    const result = scoreAttribute(attr, evalLevel, settings, percent);
    totalPoints += result.points;
    totalWeight += result.weight;
    byAttribute[attr.id] = { ...result, attr };
    if (result.requiredMiss) hasRequiredMiss = true;
  }

  const rawScore = totalWeight > 0 ? Math.round((totalPoints / totalWeight) * 100) : 0;
  const score = hasRequiredMiss
    ? Math.min(rawScore, REQUIRED_MISS_STAGE_CAP)
    : rawScore;

  return {
    score,
    rawScore,
    failed: hasRequiredMiss,
    hasRequiredMiss,
    byAttribute,
  };
}

export function scoreCall(rubric, evaluations, settings = rubric.settings, percents = {}) {
  const bySection = {};
  let overall = 0;
  const failedSections = [];

  for (const section of rubric.sections) {
    const result = scoreSection(section, evaluations, settings, percents);
    bySection[section.id] = {
      ...result,
      section,
      contribution: result.score * section.weight,
    };
    overall += result.score * section.weight;
    if (result.failed) failedSections.push(section.id);
  }

  const rounded = Math.round(overall);
  const sectionsBelowDetailedThreshold = settings.detailedCoachingThresholdEnabled
    ? rubric.sections.filter((s) =>
        sectionBelowCoachingContributionThreshold(s, bySection[s.id], settings),
      )
    : [];

  const needsCoaching =
    rounded < settings.coachingThreshold ||
    failedSections.length > 0 ||
    sectionsBelowDetailedThreshold.length > 0;

  const flaggedSections = rubric.sections
    .filter((s) => {
      const data = bySection[s.id];
      if (data.failed) return true;
      if (settings.detailedCoachingThresholdEnabled) {
        return sectionBelowCoachingContributionThreshold(s, data, settings);
      }
      return data.score < settings.sectionFlagThreshold;
    })
    .map((s) => s.id);

  return {
    overall: rounded,
    needsCoaching,
    failedSections,
    flaggedSections,
    bySection,
    formula: 'Call score = Σ (stage scores)',
  };
}

export function normalizeSectionWeights(sections, changedId, newWeight) {
  const others = sections.filter((s) => s.id !== changedId);
  const remaining = Math.max(0, 1 - newWeight);
  const otherSum = others.reduce((sum, s) => sum + s.weight, 0);

  return sections.map((s) => {
    if (s.id === changedId) return { ...s, weight: newWeight };
    if (otherSum === 0) {
      return { ...s, weight: remaining / others.length };
    }
    return { ...s, weight: (s.weight / otherSum) * remaining };
  });
}

export function normalizeAttributeWeights(section, changedId, newWeight) {
  const enabled = section.attributes.filter((a) => a.enabled !== false);
  const others = enabled.filter((a) => a.id !== changedId);
  const remaining = Math.max(0, 1 - newWeight);
  const otherSum = others.reduce((sum, a) => sum + (a.weight ?? 1), 0);

  return {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false) return a;
      if (a.id === changedId) return { ...a, weight: newWeight };
      if (otherSum === 0) return { ...a, weight: remaining / others.length };
      return { ...a, weight: ((a.weight ?? 1) / otherSum) * remaining };
    }),
  };
}

function enabledAttributes(section) {
  return section.attributes.filter((a) => a.enabled !== false);
}

function isCustomWeight(attr) {
  return (attr.weightMode ?? WEIGHT_MODE.EQUAL) === WEIGHT_MODE.CUSTOM;
}

export function rebalanceUnlockedWeights(section) {
  const enabled = enabledAttributes(section).filter(isCustomWeight);
  const locked = enabled.filter((a) => a.weightLocked);
  const unlocked = enabled.filter((a) => !a.weightLocked);
  const lockedSum = locked.reduce((sum, a) => sum + (a.weight ?? 0), 0);
  const remaining = Math.max(0, 1 - lockedSum);
  const share = unlocked.length > 0 ? remaining / unlocked.length : 0;

  return {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false || !isCustomWeight(a) || a.weightLocked) return a;
      return { ...a, weight: share };
    }),
  };
}

export function sectionUsesCustomWeights(section) {
  return enabledAttributes(section).some(isCustomWeight);
}

// Stage weights mirror attribute custom weights: editing a stage locks it, and
// the remaining unlocked stages share what's left equally. When locked stages
// exceed 100% the totals warn instead of auto-shrinking.
export function rebalanceUnlockedSectionWeights(sections) {
  const locked = sections.filter((s) => s.weightLocked);
  const unlocked = sections.filter((s) => !s.weightLocked);
  const lockedSum = locked.reduce((sum, s) => sum + (s.weight ?? 0), 0);
  const remaining = Math.max(0, 1 - lockedSum);
  const share = unlocked.length > 0 ? remaining / unlocked.length : 0;
  return sections.map((s) => (s.weightLocked ? s : { ...s, weight: share }));
}

export function applySectionCustomWeight(sections, changedId, newWeight) {
  const withLock = sections.map((s) =>
    s.id === changedId ? { ...s, weight: newWeight, weightLocked: true } : s,
  );
  return rebalanceUnlockedSectionWeights(withLock);
}

export function convertSectionToCustomWeights(section) {
  const enabled = enabledAttributes(section);
  const share = enabled.length ? 1 / enabled.length : 1;
  return {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false) return a;
      return {
        ...a,
        weightMode: WEIGHT_MODE.CUSTOM,
        weight: share,
        weightLocked: false,
      };
    }),
  };
}

export function resetSectionToEqualWeights(section) {
  const enabled = enabledAttributes(section);
  const share = enabled.length ? 1 / enabled.length : 1;
  return {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false) return a;
      return {
        ...a,
        weightMode: WEIGHT_MODE.EQUAL,
        weight: share,
        weightLocked: false,
      };
    }),
  };
}

export function applyAttributeCustomWeight(section, changedId, newWeight) {
  const withLockedChange = {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false) return a;
      if (a.id === changedId) {
        return {
          ...a,
          weightMode: WEIGHT_MODE.CUSTOM,
          weight: newWeight,
          weightLocked: true,
        };
      }
      if (!isCustomWeight(a)) {
        return { ...a, weightMode: WEIGHT_MODE.CUSTOM, weightLocked: false };
      }
      return a;
    }),
  };

  return rebalanceUnlockedWeights(withLockedChange);
}

export function syncAttributeWeightsAfterListChange(section) {
  if (sectionUsesCustomWeights(section)) {
    return rebalanceUnlockedWeights(section);
  }
  return resetSectionToEqualWeights(section);
}

export function attributeWeightSumPercent(section) {
  const enabled = enabledAttributes(section);
  if (!enabled.some(isCustomWeight)) return 100;
  return Math.round(enabled.reduce((sum, a) => sum + (a.weight ?? 0), 0) * 100);
}

export function attributeWeightsValid(section) {
  if (!sectionUsesCustomWeights(section)) return true;
  return attributeWeightSumPercent(section) === 100;
}

export function sectionWeightPercent(weight) {
  return Math.round(weight * 100);
}

export function clampSectionCoachingThreshold(value, weight) {
  const max = sectionWeightPercent(weight);
  const n = Math.round(Number(value)) || 0;
  return Math.min(max, Math.max(0, n));
}

export function getCoachingThresholdUnit(settings) {
  return settings?.coachingThresholdUnit === 'points' ? 'points' : 'percent';
}

export function coachingThresholdUnitSuffix(unit) {
  return unit === 'percent' ? '%' : 'pts';
}

export function sectionThresholdPointsToDisplay(points, weight, unit) {
  if (unit === 'points') return points;
  const max = sectionWeightPercent(weight);
  if (max === 0) return 0;
  return Math.round((points / max) * 100);
}

export function sectionThresholdDisplayToPoints(display, weight, unit) {
  if (unit === 'points') {
    return clampSectionCoachingThreshold(display, weight);
  }
  const max = sectionWeightPercent(weight);
  const points = Math.round((display / 100) * max);
  return clampSectionCoachingThreshold(points, weight);
}

export function clampSectionCoachingThresholdDisplay(display, weight, unit) {
  if (unit === 'points') {
    return clampSectionCoachingThreshold(display, weight);
  }
  return Math.min(100, Math.max(0, Math.round(Number(display)) || 0));
}

export function getSectionCoachingThreshold(section, settings) {
  const max = sectionWeightPercent(section.weight);
  const stored = settings.sectionCoachingThresholds?.[section.id];
  if (typeof stored === 'number') {
    return clampSectionCoachingThreshold(stored, section.weight);
  }
  return Math.round(max * 0.6);
}

export function defaultSectionCoachingThresholds(sections) {
  return Object.fromEntries(
    sections.map((s) => [s.id, getSectionCoachingThreshold(s, { sectionCoachingThresholds: {} })]),
  );
}

export function sectionBelowCoachingContributionThreshold(section, stageData, settings) {
  if (!settings.detailedCoachingThresholdEnabled || !stageData) return false;
  const threshold = getSectionCoachingThreshold(section, settings);
  return stageData.contribution < threshold;
}

export function sectionWeightSum(sections) {
  return sections.reduce((sum, s) => sum + s.weight, 0);
}

export function attributeWeightPercentInSection(attr, section) {
  const enabled = enabledAttributes(section);
  if (!isCustomWeight(attr)) {
    return enabled.length ? Math.round(100 / enabled.length) : 0;
  }
  return Math.round((attr.weight ?? 0) * 100);
}

export function attributeWeightBadgePercent(attr, section) {
  return attributeWeightPercentInSection(attr, section);
}
