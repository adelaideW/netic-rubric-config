import { cloneRubric, defaultRubric, ATTR_MODE } from './defaultRubric.js';

/**
 * Fake version history for the rubric (demo only).
 * In a real product each publish would snapshot the rubric and create a new,
 * immutable version. Here we keep a small static list so the Versions tab and
 * the title-bar version indicator can tell the draft -> publish -> rollback story.
 *
 * Each version carries a `rubric` snapshot so an earlier version can be viewed
 * read-only. v3 mirrors the live default; v2 and v1 are lightweight variants so
 * the differences are visible when viewing.
 */

// v3 (active/current) mirrors the live rubric so viewing it matches the editor.
const v3Rubric = cloneRubric(defaultRubric);

// v2 introduced a numeric-scored attribute and used slightly different weights.
const v2Rubric = (() => {
  const r = cloneRubric(defaultRubric);
  const verification = r.sections.find((s) => s.id === 'verification');
  if (verification) {
    const attr = verification.attributes.find((a) => a.id === 'issue-details');
    if (attr) {
      attr.scoringMode = ATTR_MODE.NUMERIC;
      attr.numericMin = 0;
      attr.numericMax = 5;
    }
  }
  const weights = [0.25, 0.25, 0.3, 0.2];
  r.sections.forEach((s, i) => {
    if (weights[i] != null) s.weight = weights[i];
  });
  return r;
})();

// v1 was the initial published rubric: all pass/fail, equal stage weights.
const v1Rubric = (() => {
  const r = cloneRubric(defaultRubric);
  const equal = 1 / r.sections.length;
  r.sections.forEach((s) => {
    s.weight = equal;
    s.attributes.forEach((a) => {
      a.scoringMode = ATTR_MODE.BINARY;
    });
  });
  return r;
})();

export const rubricVersions = [
  {
    id: 3,
    label: 'v3',
    createdAt: 'Jul 7, 2026 · 2:39 PM',
    publishedAt: 'Jul 7, 2026',
    summary: 'Adjusted stage weights and refined required-miss handling.',
    rubric: v3Rubric,
  },
  {
    id: 2,
    label: 'v2',
    createdAt: 'Jul 5, 2026 · 11:26 AM',
    publishedAt: 'Jul 5, 2026',
    summary: 'Added numeric scoring mode for attributes.',
    rubric: v2Rubric,
  },
  {
    id: 1,
    label: 'v1',
    createdAt: 'Jun 28, 2026 · 9:02 AM',
    publishedAt: 'Jun 28, 2026',
    summary: 'Initial published rubric.',
    rubric: v1Rubric,
  },
];

/** The version that is live by default when a rubric is opened. */
export const DEFAULT_ACTIVE_VERSION_ID = 3;
