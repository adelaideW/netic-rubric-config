export const EVAL = {
  MET: 'met',
  PARTIAL: 'partial',
  NOT_MET: 'not_met',
};

export const ATTR_MODE = {
  BINARY: 'binary',
  GRANULAR: 'granular',
  NUMERIC: 'numeric',
};

export const ATTR_MODE_LABEL = {
  [ATTR_MODE.BINARY]: 'Pass/Fail',
  [ATTR_MODE.GRANULAR]: 'Percentage',
  [ATTR_MODE.NUMERIC]: 'Numeric',
};

export const WEIGHT_MODE = {
  EQUAL: 'equal',
  CUSTOM: 'custom',
};

export const CALL_TYPE = {
  LEAD: 'Lead Call',
  NON_LEAD: 'Non-lead calls',
};

export const CALL_TYPE_OPTIONS = [
  { value: CALL_TYPE.LEAD, label: 'Lead Call' },
  { value: CALL_TYPE.NON_LEAD, label: 'Non-lead calls' },
];

export function normalizeCallType(value) {
  if (!value) return '';
  const v = String(value).trim().toLowerCase();
  if (v === 'lead call' || v === 'lead') return CALL_TYPE.LEAD;
  return CALL_TYPE.NON_LEAD;
}

export const CONFIDENCE = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

function withDefaults(attr, sectionSize = 3) {
  return {
    enabled: true,
    required: false,
    scoringMode: ATTR_MODE.BINARY,
    weightMode: WEIGHT_MODE.EQUAL,
    weight: 1 / sectionSize,
    weightLocked: false,
    percentRangeMin: 0,
    percentRangeMax: 100,
    numericMin: 0,
    numericMax: 5,
    ...attr,
    critical: undefined,
  };
}

function sectionAttrs(items) {
  const size = items.length;
  return items.map((item) => withDefaults(item, size));
}

export const defaultRubric = {
  id: 'lead-calls',
  name: 'Lead calls',
  callType: CALL_TYPE.LEAD,
  status: 'active',
  lastUpdated: 'Netic template',
  sections: [
    {
      id: 'get-to-know',
      name: 'Get to know your customer',
      weight: 0.15,
      attributes: sectionAttrs([
        {
          id: 'greet',
          name: 'Greet the caller',
          description:
            'Used the appropriate greeting — thanked the customer for calling and gave their name.',
        },
        {
          id: 'issue-id',
          name: 'Issue identification',
          description: "Gathered the customer's issue or request.",
          required: true,
        },
        {
          id: 'assurance',
          name: 'Assurance',
          description:
            'Expressed empathy and provided assurance after confirming the issue.',
        },
      ]),
    },
    {
      id: 'verification',
      name: 'Verification',
      weight: 0.4,
      attributes: sectionAttrs([
        {
          id: 'issue-details',
          name: 'Issue details',
          description:
            'Asked follow-up questions — system age, duration of issue, number of systems, anything the tech should know.',
        },
        {
          id: 'verify-details',
          name: 'Verify customer details',
          description:
            'Verified name, service address, email, and callback number.',
          required: true,
        },
        {
          id: 'verify-membership',
          name: 'Verify membership',
          description:
            'Confirmed whether the customer is a returning customer or member.',
        },
      ]),
    },
    {
      id: 'inform',
      name: 'Inform and educate',
      weight: 0.35,
      attributes: sectionAttrs([
        {
          id: 'availability',
          name: 'Availability',
          description:
            'Offered the next available appointment. If declined, offered an alternative.',
          required: true,
        },
        {
          id: 'service-charge',
          name: 'Service charge & payment terms',
          description:
            'Confirmed the service charge and that payment is due at time of service.',
        },
        {
          id: 'arrival',
          name: 'Arrival & tech communication',
          description:
            'Explained the arrival window, noted that the tech will call before arriving, and verified the callback number.',
        },
      ]),
    },
    {
      id: 'closing',
      name: 'Closing',
      weight: 0.1,
      attributes: sectionAttrs([
        {
          id: 'proper-closing',
          name: 'Proper closing',
          description: 'Used the proper closing.',
        },
        {
          id: 'use-name',
          name: 'Use customer name',
          description: "Used the caller's name at least once during the call.",
          required: true,
        },
      ]),
    },
  ],
  settings: {
    partialCreditEnabled: false,
    partialCreditMultiplier: 0.5,
    coachingThreshold: 60,
    coachingThresholdUnit: 'percent',
    sectionFlagThreshold: 60,
    granularPassThreshold: 60,
    detailedCoachingThresholdEnabled: false,
    sectionCoachingThresholds: {},
    coachingMaterials: [],
    coachingNotifyEmail: true,
    coachingEscalateEnabled: true,
    coachingEscalateConsecutiveCount: 5,
    coachingEscalateWithinDays: 30,
  },
};

export function equalizeAttributeWeightsInSection(section) {
  const enabled = section.attributes.filter((a) => a.enabled !== false);
  const share = enabled.length ? 1 / enabled.length : 1;
  return {
    ...section,
    attributes: section.attributes.map((a) => {
      if (a.enabled === false) return a;
      if (a.weightMode === WEIGHT_MODE.CUSTOM) return a;
      return { ...a, weight: share, weightMode: WEIGHT_MODE.EQUAL, weightLocked: false };
    }),
  };
}

export function createEmptyAttribute(name = 'New attribute') {
  return {
    id: `attr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    description: 'Thanked the customer for calling and gave their name.',
    scoringMode: ATTR_MODE.BINARY,
    weightMode: WEIGHT_MODE.EQUAL,
    required: false,
    enabled: true,
    weight: 1,
    weightLocked: false,
    percentRangeMin: 0,
    percentRangeMax: 100,
  };
}

export function createEmptySection(name = 'New stage') {
  const attr = createEmptyAttribute('New attribute');
  return {
    id: `section-${Date.now()}`,
    name,
    weight: 0.1,
    attributes: [attr],
  };
}

export function cloneRubric(rubric) {
  return JSON.parse(JSON.stringify(rubric));
}
