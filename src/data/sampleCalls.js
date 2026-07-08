import { CONFIDENCE, EVAL } from './defaultRubric.js';

export const TEAM_AVG = 74;

export const sampleCalls = [
  {
    id: 'strong',
    label: 'AC repair — strong call',
    agent: 'James T.',
    duration: '4:12',
    booked: true,
    excerpt:
      'CXR thanked the caller, introduced themselves, and confirmed the AC unit stopped cooling yesterday. Asked about system age (8 years), verified name, address, email, and callback. Offered tomorrow 9–11am, confirmed $89 diagnostic fee, explained tech will call 30 min before arrival. Closed professionally using customer name "Sarah."',
    evaluations: {
      greet: EVAL.MET,
      'issue-id': EVAL.MET,
      assurance: EVAL.MET,
      'issue-details': EVAL.MET,
      'verify-details': EVAL.MET,
      'verify-membership': EVAL.NOT_MET,
      availability: EVAL.MET,
      'service-charge': EVAL.MET,
      arrival: EVAL.MET,
      'proper-closing': EVAL.MET,
      'use-name': EVAL.MET,
    },
    confidence: {
      greet: CONFIDENCE.HIGH,
      'issue-id': CONFIDENCE.HIGH,
      assurance: CONFIDENCE.HIGH,
      'issue-details': CONFIDENCE.HIGH,
      'verify-details': CONFIDENCE.HIGH,
      'verify-membership': CONFIDENCE.MEDIUM,
      availability: CONFIDENCE.HIGH,
      'service-charge': CONFIDENCE.HIGH,
      arrival: CONFIDENCE.HIGH,
      'proper-closing': CONFIDENCE.HIGH,
      'use-name': CONFIDENCE.HIGH,
    },
    stageRatings: {
      'get-to-know': 5,
      verification: 4,
      inform: 5,
      closing: 5,
    },
    stageConfidence: {
      'get-to-know': CONFIDENCE.HIGH,
      verification: CONFIDENCE.MEDIUM,
      inform: CONFIDENCE.HIGH,
      closing: CONFIDENCE.HIGH,
    },
  },
  {
    id: 'weak-verification',
    label: 'AC repair — weak call',
    agent: 'Maria G.',
    duration: '3:48',
    booked: false,
    excerpt:
      'CXR greeted caller and identified AC not cooling. Skipped follow-up on system age. Verified name and callback but did not confirm email or service address. Did not ask about membership. Offered appointment and mentioned service charge. Closing was brief without using customer name.',
    evaluations: {
      greet: EVAL.MET,
      'issue-id': EVAL.MET,
      assurance: EVAL.NOT_MET,
      'issue-details': EVAL.NOT_MET,
      'verify-details': EVAL.NOT_MET,
      'verify-membership': EVAL.NOT_MET,
      availability: EVAL.MET,
      'service-charge': EVAL.NOT_MET,
      arrival: EVAL.NOT_MET,
      'proper-closing': EVAL.MET,
      'use-name': EVAL.NOT_MET,
    },
    confidence: {
      greet: CONFIDENCE.HIGH,
      'issue-id': CONFIDENCE.HIGH,
      assurance: CONFIDENCE.MEDIUM,
      'issue-details': CONFIDENCE.HIGH,
      'verify-details': CONFIDENCE.HIGH,
      'verify-membership': CONFIDENCE.HIGH,
      availability: CONFIDENCE.HIGH,
      'service-charge': CONFIDENCE.MEDIUM,
      arrival: CONFIDENCE.MEDIUM,
      'proper-closing': CONFIDENCE.HIGH,
      'use-name': CONFIDENCE.HIGH,
    },
    stageRatings: {
      'get-to-know': 3,
      verification: 2,
      inform: 3,
      closing: 2,
    },
    stageConfidence: {
      'get-to-know': CONFIDENCE.HIGH,
      verification: CONFIDENCE.HIGH,
      inform: CONFIDENCE.MEDIUM,
      closing: CONFIDENCE.HIGH,
    },
  },
  {
    id: 'critical-miss',
    label: 'Plumbing — stage failed call',
    agent: 'Dana R.',
    duration: '2:56',
    booked: false,
    excerpt:
      'CXR greeted warmly and identified a leaky faucet. Asked good follow-up questions about the issue and confirmed the caller is a returning member — but never verified the customer’s name, service address, or email. Offered a same-day slot, mentioned the service charge, and explained the arrival window before closing.',
    evaluations: {
      greet: EVAL.MET,
      'issue-id': EVAL.MET,
      assurance: EVAL.MET,
      'issue-details': EVAL.MET,
      'verify-details': EVAL.NOT_MET,
      'verify-membership': EVAL.MET,
      availability: EVAL.MET,
      'service-charge': EVAL.MET,
      arrival: EVAL.MET,
      'proper-closing': EVAL.MET,
      'use-name': EVAL.NOT_MET,
    },
    confidence: {
      'issue-details': CONFIDENCE.HIGH,
      'verify-details': CONFIDENCE.HIGH,
      'verify-membership': CONFIDENCE.HIGH,
    },
    stageRatings: {
      'get-to-know': 4,
      verification: 1,
      inform: 4,
      closing: 3,
    },
    stageConfidence: {
      'get-to-know': CONFIDENCE.HIGH,
      verification: CONFIDENCE.HIGH,
      inform: CONFIDENCE.MEDIUM,
      closing: CONFIDENCE.HIGH,
    },
  },
];

export const teamAgents = [
  {
    id: 'james',
    name: 'James T.',
    avgScore: 86,
    leadsConverted: 19,
    leadsLost: 5,
    needsCoaching: false,
    weakSection: 'Closing',
    weakSectionId: 'closing',
    calls: 24,
    sectionScores: {
      'get-to-know': 100,
      verification: 67,
      inform: 100,
      closing: 50,
    },
    attributes: [
      { id: 'greet', name: 'Greet the caller', section: 'Get to know', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'issue-id', name: 'Issue identification', section: 'Get to know', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'assurance', name: 'Assurance', section: 'Get to know', evalLevel: EVAL.MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'issue-details', name: 'Issue details', section: 'Verification', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'verify-details', name: 'Verify customer details', section: 'Verification', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'verify-membership', name: 'Verify membership', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'availability', name: 'Availability', section: 'Inform', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'service-charge', name: 'Service charge', section: 'Inform', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'arrival', name: 'Arrival & tech comm', section: 'Inform', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'proper-closing', name: 'Proper closing', section: 'Closing', evalLevel: EVAL.MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'use-name', name: 'Use customer name', section: 'Closing', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
    ],
  },
  {
    id: 'maria',
    name: 'Maria G.',
    avgScore: 68,
    leadsConverted: 12,
    leadsLost: 19,
    needsCoaching: true,
    weakSection: 'Verification',
    weakSectionId: 'verification',
    sectionFailed: true,
    calls: 31,
    sectionScores: {
      'get-to-know': 67,
      verification: 0,
      inform: 67,
      closing: 50,
    },
    attributes: [
      { id: 'greet', name: 'Greet the caller', section: 'Get to know', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'issue-id', name: 'Issue identification', section: 'Get to know', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'assurance', name: 'Assurance', section: 'Get to know', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'issue-details', name: 'Issue details', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.HIGH, requiredMiss: true },
      { id: 'verify-details', name: 'Verify customer details', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.HIGH, requiredMiss: true },
      { id: 'verify-membership', name: 'Verify membership', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'availability', name: 'Availability', section: 'Inform', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'service-charge', name: 'Service charge', section: 'Inform', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'arrival', name: 'Arrival & tech comm', section: 'Inform', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
      { id: 'proper-closing', name: 'Proper closing', section: 'Closing', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'use-name', name: 'Use customer name', section: 'Closing', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.HIGH },
    ],
  },
  {
    id: 'chris',
    name: 'Chris L.',
    avgScore: 79,
    leadsConverted: 14,
    leadsLost: 5,
    needsCoaching: false,
    weakSection: 'Inform and educate',
    weakSectionId: 'inform',
    calls: 19,
    sectionScores: {
      'get-to-know': 100,
      verification: 100,
      inform: 67,
      closing: 100,
    },
    attributes: [
      { id: 'availability', name: 'Availability', section: 'Inform', evalLevel: EVAL.MET, confidence: CONFIDENCE.HIGH },
      { id: 'service-charge', name: 'Service charge', section: 'Inform', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.HIGH },
      { id: 'arrival', name: 'Arrival & tech comm', section: 'Inform', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
    ],
  },
  {
    id: 'dana',
    name: 'Dana R.',
    avgScore: 72,
    leadsConverted: 15,
    leadsLost: 12,
    needsCoaching: true,
    weakSection: 'Verification',
    weakSectionId: 'verification',
    calls: 27,
    sectionScores: {
      'get-to-know': 100,
      verification: 33,
      inform: 100,
      closing: 50,
    },
    attributes: [
      { id: 'verify-details', name: 'Verify customer details', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.HIGH },
      { id: 'issue-details', name: 'Issue details', section: 'Verification', evalLevel: EVAL.NOT_MET, confidence: CONFIDENCE.MEDIUM },
    ],
  },
];

export const teamPerformance = {
  overallAvg: TEAM_AVG,
  sections: [
    { id: 'get-to-know', name: 'Get to know your customer', avg: 81 },
    { id: 'verification', name: 'Verification', avg: 52 },
    { id: 'inform', name: 'Inform and educate', avg: 78 },
    { id: 'closing', name: 'Closing', avg: 69 },
  ],
};

const evalTemplateById = Object.fromEntries(sampleCalls.map((c) => [c.id, c]));

const CALL_LOG_META = [
  { id: 'CALL-2087', date: 'Jul 7, 2026', agent: 'James T.', leadSource: 'Google Ads', type: 'lead', outcome: 'converted', template: 'strong', version: 3 },
  { id: 'CALL-2086', date: 'Jul 7, 2026', agent: 'Maria G.', leadSource: 'Website form', type: 'lead', outcome: 'lost', template: 'weak-verification', version: 3 },
  { id: 'CALL-2085', date: 'Jul 6, 2026', agent: 'Dana R.', leadSource: 'Referral', type: 'lead', outcome: 'lost', template: 'critical-miss', version: 2 },
  { id: 'CALL-2084', date: 'Jul 6, 2026', agent: 'Chris L.', leadSource: 'Yelp', type: 'non-lead', outcome: 'converted', template: 'strong', version: 2 },
  { id: 'CALL-2083', date: 'Jul 5, 2026', agent: 'James T.', leadSource: 'Facebook', type: 'lead', outcome: 'converted', template: 'weak-verification', version: 2 },
  { id: 'CALL-2082', date: 'Jul 5, 2026', agent: 'Maria G.', leadSource: 'Google Ads', type: 'non-lead', outcome: 'lost', template: 'critical-miss', version: 2 },
  { id: 'CALL-2081', date: 'Jul 5, 2026', agent: 'Dana R.', leadSource: 'Website form', type: 'lead', outcome: 'converted', template: 'strong', version: 2 },
  { id: 'CALL-2080', date: 'Jul 4, 2026', agent: 'Chris L.', leadSource: 'Referral', type: 'lead', outcome: 'lost', template: 'weak-verification', version: 1 },
  { id: 'CALL-2079', date: 'Jul 4, 2026', agent: 'James T.', leadSource: 'Yelp', type: 'non-lead', outcome: 'converted', template: 'strong', version: 1 },
  { id: 'CALL-2078', date: 'Jul 4, 2026', agent: 'Maria G.', leadSource: 'Facebook', type: 'lead', outcome: 'lost', template: 'critical-miss', version: 1 },
  { id: 'CALL-2077', date: 'Jul 3, 2026', agent: 'Dana R.', leadSource: 'Google Ads', type: 'lead', outcome: 'lost', template: 'weak-verification', version: 1 },
  { id: 'CALL-2076', date: 'Jul 3, 2026', agent: 'Chris L.', leadSource: 'Website form', type: 'non-lead', outcome: 'converted', template: 'strong', version: 1 },
];

/** Per-call recordings shown in the Call performance log. */
export const callLog = CALL_LOG_META.map((meta) => {
  const template = evalTemplateById[meta.template];
  return {
    id: meta.id,
    date: meta.date,
    agent: meta.agent,
    leadSource: meta.leadSource,
    type: meta.type,
    outcome: meta.outcome,
    version: meta.version,
    duration: template.duration,
    excerpt: template.excerpt,
    evaluations: template.evaluations,
    confidence: template.confidence,
    stageRatings: template.stageRatings,
    stageConfidence: template.stageConfidence,
  };
});

/** Aggregated team KPIs derived from the sample agents. */
export const teamSummary = (() => {
  const totalEmployees = teamAgents.length;
  const totalLeadCalls = teamAgents.reduce((sum, a) => sum + (a.calls ?? 0), 0);
  const totalConverted = teamAgents.reduce((sum, a) => sum + a.leadsConverted, 0);
  const totalLost = teamAgents.reduce((sum, a) => sum + a.leadsLost, 0);
  const totalLeads = totalConverted + totalLost;
  const leadsConvertedRate = totalLeads
    ? Math.round((totalConverted / totalLeads) * 100)
    : 0;
  // Won = converted appointments that closed to a booked job (subset of converted).
  const leadsWonRate = 42;

  // Lead conversion funnel: calls taken → lead calls → converted → won.
  // Lead calls are the leads that ultimately converted or were lost; total calls
  // taken includes non-lead calls handled by the team.
  const leadCalls = totalLeads; // 101 (converted + lost)
  const callsTaken = 128; // all inbound calls incl. non-lead
  const leadsWon = Math.round(totalConverted * (leadsWonRate / 100));
  const funnel = [
    { key: 'calls', label: 'Calls taken', value: callsTaken, caption: 'All inbound calls' },
    {
      key: 'leads',
      label: 'Lead calls',
      value: leadCalls,
      pct: Math.round((leadCalls / callsTaken) * 100),
      of: 'calls taken',
    },
    {
      key: 'converted',
      label: 'Converted',
      value: totalConverted,
      pct: Math.round((totalConverted / leadCalls) * 100),
      of: 'lead calls',
    },
    {
      key: 'won',
      label: 'Won',
      value: leadsWon,
      pct: Math.round((leadsWon / totalConverted) * 100),
      of: 'converted',
    },
  ];
  const coachingCount = teamAgents.filter((a) => a.needsCoaching).length;
  const weakestStage = teamPerformance.sections.reduce((min, s) =>
    s.avg < min.avg ? s : min,
  );

  // Reps flagged for coaching, sorted by lowest score first.
  const coachingAgents = teamAgents
    .filter((a) => a.needsCoaching)
    .map((a) => ({
      name: a.name,
      weakSection: a.weakSection,
      avgScore: a.avgScore,
    }))
    .sort((a, b) => a.avgScore - b.avgScore);

  // Attribute lost leads to each rep's weakest stage to find what drives losses.
  const lostByStage = {};
  teamAgents.forEach((a) => {
    lostByStage[a.weakSection] = (lostByStage[a.weakSection] ?? 0) + a.leadsLost;
  });
  const lostLeadDrivers = Object.entries(lostByStage)
    .map(([stage, lost]) => ({ stage, lost }))
    .sort((a, b) => b.lost - a.lost);
  const topDriver = lostLeadDrivers[0];
  const lostLeadDrivers2 = lostLeadDrivers.slice(1, 3);
  const lostLeadsSummary =
    `${topDriver.stage} is the biggest driver of lost leads — reps weak here account for ` +
    `${topDriver.lost} of ${totalLost} lost leads this period` +
    (lostLeadDrivers2.length
      ? `, followed by ${lostLeadDrivers2
          .map((d) => `${d.stage} (${d.lost})`)
          .join(' and ')}.`
      : '.');

  // Suggested coaching material for the stages that need attention.
  const COACHING_MATERIAL = {
    Verification: [
      'Share the “Verify before you advise” script — confirm customer and issue details before quoting.',
      'Run a 15-min role-play on membership and issue verification with the flagged reps.',
    ],
    Closing: [
      'Review the closing checklist — restate next steps and use the customer’s name before ending the call.',
    ],
    'Inform and educate': [
      'Walk through the service-charge and availability talk track so pricing is set clearly up front.',
    ],
  };
  const relevantStages = [
    ...new Set([weakestStage.name, ...coachingAgents.map((a) => a.weakSection)]),
  ];
  const recommendedMaterial = relevantStages.flatMap((stage) =>
    (COACHING_MATERIAL[stage] ?? []).map((tip) => ({ stage, tip })),
  );

  return {
    totalEmployees,
    totalLeadCalls,
    totalLostLeads: totalLost,
    callsTaken,
    leadCalls,
    leadsConverted: totalConverted,
    leadsWon,
    funnel,
    avgCallScore: TEAM_AVG,
    leadsConvertedRate,
    leadsWonRate,
    coachingCount,
    weakestStage,
    coachingAgents,
    lostLeadDrivers,
    lostLeadsSummary,
    recommendedMaterial,
    coachingSummary: `${weakestStage.name} is the weakest stage (${weakestStage.avg}). ${coachingCount} of ${totalEmployees} reps need coaching — focus on ${weakestStage.name.toLowerCase()}.`,
  };
})();
