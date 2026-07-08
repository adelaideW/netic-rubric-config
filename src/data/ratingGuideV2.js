export const EDITOR_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
};

function level(id, score, description, extras = {}) {
  return {
    id,
    score,
    description,
    instruction: extras.instruction ?? '',
    minimumStandard: extras.minimumStandard ?? false,
  };
}

export const DEFAULT_RATING_GUIDES = {
  'get-to-know': {
    instruction:
      'Rate how well the CXR greeted the caller and established rapport at the start of the call.',
    levels: [
      level('gtk-1', 1, 'No greeting standard, no name confirmed'),
      level('gtk-2', 2, 'Standard greeting, no name confirmed'),
      level('gtk-3', 3, 'Standard greeting, name confirmed', { minimumStandard: true }),
      level('gtk-4', 4, 'Warm greeting, name confirmed'),
      level('gtk-5', 5, 'Warm, personalized greeting; energy matched caller'),
    ],
  },
  verification: {
    instruction:
      'Rate how thoroughly the CXR verified the customer, issue details, and membership status.',
    levels: [
      level('ver-1', 1, 'No verification attempted; customer or issue details not confirmed'),
      level('ver-2', 2, 'Minimal verification; only one of issue or identity confirmed'),
      level('ver-3', 3, 'Standard verification; issue and name confirmed, membership status unclear', {
        minimumStandard: true,
      }),
      level('ver-4', 4, 'Thorough verification; name, service address, and issue details confirmed'),
      level('ver-5', 5, 'Complete verification; all fields confirmed including membership and follow-up questions'),
    ],
  },
  inform: {
    instruction:
      'Rate how clearly the CXR informed the customer about availability, pricing, and arrival expectations.',
    levels: [
      level('inf-1', 1, 'No appointment, pricing, or arrival information provided'),
      level('inf-2', 2, 'Appointment mentioned only; no service charge or arrival details'),
      level('inf-3', 3, 'Standard disclosure; availability and service charge stated, basic arrival window', {
        minimumStandard: true,
      }),
      level('inf-4', 4, 'Clear education; options offered, pricing and payment terms, arrival window explained'),
      level('inf-5', 5, 'Proactive education; alternatives offered, full payment terms, tech callback and arrival confirmed'),
    ],
  },
  closing: {
    instruction:
      'Rate the quality of the call close, including proper sign-off and use of the customer name.',
    levels: [
      level('clo-1', 1, 'Abrupt end; no closing standard or customer name used'),
      level('clo-2', 2, 'Basic closing script; customer name not used'),
      level('clo-3', 3, 'Standard closing; proper sign-off with customer name once', {
        minimumStandard: true,
      }),
      level('clo-4', 4, 'Warm closing; name used and key next steps summarized'),
      level('clo-5', 5, 'Excellent close; personalized farewell, confirmed understanding, professional tone'),
    ],
  },
};

export function createRatingLevel(score, description = '') {
  return {
    id: `level-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    score,
    description,
    instruction: '',
    minimumStandard: false,
  };
}

export function defaultRatingGuideForSection(section) {
  const preset = DEFAULT_RATING_GUIDES[section.id];
  if (preset) {
    return JSON.parse(JSON.stringify(preset));
  }
  return {
    instruction: `Tell the AI how to score ${section.name} on a 1–5 scale.`,
    levels: [1, 2, 3, 4, 5].map((n) =>
      createRatingLevel(n, `Rating ${n} — describe expected behavior at this level.`),
    ),
  };
}

export function ensureSectionRatingGuide(section) {
  if (section.ratingGuide?.levels?.length) {
    return {
      ...section,
      ratingGuide: {
        ...section.ratingGuide,
        levels: section.ratingGuide.levels.map((l, i) => ({
          ...createRatingLevel(i + 1),
          ...l,
          score: l.score ?? i + 1,
        })),
      },
    };
  }
  return { ...section, ratingGuide: defaultRatingGuideForSection(section) };
}

export function renumberRatingLevels(levels) {
  return levels.map((l, i) => ({ ...l, score: i + 1 }));
}

export function generateRatingGuideWithAI(section) {
  return defaultRatingGuideForSection(section);
}

function matchedRatingLevel(guide, rating) {
  const levels = guide?.levels ?? [];
  return (
    levels.find((l) => l.score === rating) ??
    levels[Math.min(levels.length, Math.max(1, rating)) - 1] ??
    null
  );
}

export function scoreCallV2(rubric, stageRatings = {}, settings = rubric.settings) {
  const bySection = {};
  let overall = 0;
  const failedSections = [];
  const flaggedSections = [];

  for (const section of rubric.sections) {
    const withGuide = ensureSectionRatingGuide(section);
    const guide = withGuide.ratingGuide;
    const maxRating = guide.levels.length || 5;
    const rating = Math.min(
      maxRating,
      Math.max(1, Math.round(Number(stageRatings[section.id]) || 3)),
    );
    const matchedLevel = matchedRatingLevel(guide, rating);
    const minLevel = guide.levels.find((l) => l.minimumStandard);
    const belowMinimum = minLevel ? rating < minLevel.score : false;
    const score = Math.round((rating / maxRating) * 100);
    const contribution = score * section.weight;

    bySection[section.id] = {
      section,
      rating,
      maxRating,
      matchedLevel,
      score,
      contribution,
      failed: belowMinimum,
      belowMinimum,
      minLevel,
    };

    overall += contribution;
    if (belowMinimum) {
      failedSections.push(section.id);
      flaggedSections.push(section.id);
    } else if (score < settings.sectionFlagThreshold) {
      flaggedSections.push(section.id);
    }
  }

  const rounded = Math.round(overall);
  const sectionsBelowDetailedThreshold = settings.detailedCoachingThresholdEnabled
    ? rubric.sections.filter((s) => {
        const data = bySection[s.id];
        if (!data) return false;
        const threshold = settings.sectionCoachingThresholds?.[s.id];
        if (typeof threshold === 'number') {
          return data.contribution < threshold;
        }
        return false;
      })
    : [];

  const needsCoaching =
    rounded < settings.coachingThreshold ||
    failedSections.length > 0 ||
    sectionsBelowDetailedThreshold.length > 0;

  return {
    overall: rounded,
    needsCoaching,
    failedSections,
    flaggedSections,
    bySection,
    formula: 'Call score = Σ (stage scores)',
  };
}
