import { cloneRubric, createEmptySection, defaultRubric, CALL_TYPE } from './defaultRubric.js';
import { EDITOR_VERSIONS } from './ratingGuideV2.js';

/** Simulated customer onboarding date for the system default rubric */
export const ONBOARDED_AT = '2026-03-12T14:30:00Z';

export function countAttributes(rubric) {
  return rubric.sections
    .flatMap((s) => s.attributes)
    .filter((a) => a.enabled !== false).length;
}

export function formatRubricDate(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function lastUpdatedLabel(item) {
  if (item.isSystemDefault && item.lastUpdatedAt === item.onboardedAt) {
    return formatRubricDate(item.onboardedAt);
  }
  return formatRubricDate(item.lastUpdatedAt);
}

export function lastUpdatedHint(item) {
  if (item.isSystemDefault && item.lastUpdatedAt === item.onboardedAt) {
    return 'Adopted at onboarding';
  }
  return null;
}

export function createBlankRubric(name = 'Untitled rubric', callType = '') {
  const base = cloneRubric(defaultRubric);
  return {
    ...base,
    id: `rubric-${Date.now()}`,
    name,
    callType,
    lastUpdated: undefined,
    sections: base.sections.map((s) => ({
      ...s,
      attributes: s.attributes.map((a) => ({ ...a, required: false, critical: false })),
    })),
  };
}

function isProductReturnPrompt(prompt) {
  return (
    prompt.includes('product return') ||
    prompt.includes('return product') ||
    prompt.includes('returning product') ||
    prompt.includes('return call') ||
    prompt.includes('customer return') ||
    (prompt.includes('return') &&
      (prompt.includes('cXR') ||
        prompt.includes('cxr') ||
        prompt.includes('customer') ||
        prompt.includes('support')))
  );
}

/** Demo prefill for the new-rubric modal */
export const DEMO_RUBRIC_CREATE_PREFILL = {
  name: 'Product Return Calls Rubric',
  callType: CALL_TYPE.NON_LEAD,
  description:
    'Create a rubric and add attribute to understand my CXR\'s performance on supporting customers to return products',
};

/** Suggest rubric name and call type from a natural-language prompt */
export function suggestRubricMetaFromPrompt(description = '') {
  const prompt = description.trim().toLowerCase();
  if (isProductReturnPrompt(prompt)) {
    return {
      name: 'Product Return Calls Rubric',
      callType: CALL_TYPE.NON_LEAD,
    };
  }
  if (prompt.includes('empty rubric')) {
    return { name: 'Empty rubric', callType: CALL_TYPE.NON_LEAD };
  }
  return { name: '', callType: '' };
}

function sectionAttrsFromItems(items) {
  const size = items.length;
  return items.map((item) => ({
    enabled: true,
    required: false,
    scoringMode: 'binary',
    weightMode: 'equal',
    weight: 1 / size,
    weightLocked: false,
    percentRangeMin: 0,
    percentRangeMax: 100,
    ...item,
  }));
}

function createProductReturnRubricDraft(name, callType, generationPrompt) {
  const id = `rubric-${Date.now()}`;
  const baseSettings = cloneRubric(defaultRubric).settings;

  return {
    id,
    name,
    callType,
    status: 'draft',
    generationPrompt,
    lastUpdated: 'AI generated',
    sections: [
      {
        id: 'get-to-know',
        name: 'Get to know your customer',
        weight: 0.15,
        attributes: sectionAttrsFromItems([
          {
            id: 'greet-return',
            name: 'Greet the caller',
            description:
              'Used the appropriate greeting — thanked the customer for calling and gave their name.',
          },
          {
            id: 'reason-return',
            name: 'Reason for return',
            description:
              "Gathered the customer's reason for wanting to return the product (defective, wrong item, changed mind, etc.).",
          },
          {
            id: 'assurance-return',
            name: 'Assurance',
            description:
              "Expressed empathy and reassured the customer the return will be handled, especially if they're frustrated.",
          },
        ]),
      },
      {
        id: 'verification',
        name: 'Verification',
        weight: 0.4,
        attributes: sectionAttrsFromItems([
          {
            id: 'order-details-return',
            name: 'Order details',
            description:
              'Verified order number, purchase date, and item(s) to be returned.',
          },
          {
            id: 'customer-details-return',
            name: 'Customer details',
            description:
              'Verified name, email, shipping/billing address, and callback number.',
          },
          {
            id: 'return-eligibility',
            name: 'Return eligibility',
            description:
              'Confirmed the item and timeframe fall within return policy (window, condition, original packaging, etc.).',
          },
          {
            id: 'product-condition',
            name: 'Product condition',
            description:
              "Asked clarifying questions about the item's condition — used, damaged, unopened.",
          },
        ]),
      },
      {
        id: 'inform-educate',
        name: 'Inform and educate',
        weight: 0.35,
        attributes: sectionAttrsFromItems([
          {
            id: 'resolution-options',
            name: 'Resolution options',
            description:
              'Presented available options (refund, exchange, store credit) and let the customer choose where applicable.',
          },
          {
            id: 'refund-credit-terms',
            name: 'Refund/credit terms',
            description:
              'Explained how and when the refund or credit will be issued, and to which payment method.',
          },
          {
            id: 'return-logistics',
            name: 'Return logistics',
            description:
              'Explained how to send the item back (label, drop-off, pickup) or provided exchange shipping details.',
          },
          {
            id: 'set-expectations',
            name: 'Set expectations',
            description:
              'Communicated timeline for processing and any follow-up the customer should expect.',
          },
        ]),
      },
      {
        id: 'closing',
        name: 'Closing',
        weight: 0.1,
        attributes: sectionAttrsFromItems([
          {
            id: 'proper-closing-return',
            name: 'Proper closing',
            description: 'Used the proper closing.',
          },
          {
            id: 'use-name-return',
            name: 'Use customer name',
            description: "Used the caller's name at least once during the call.",
          },
          {
            id: 'confirm-resolution',
            name: 'Confirm resolution',
            description:
              'Confirmed the customer understood the resolution and had no further questions before ending.',
          },
        ]),
      },
    ],
    settings: baseSettings,
  };
}

/** Whether a create prompt falls back to the Lead Calls template */
export function usesLeadTemplateFromPrompt(description = '') {
  const prompt = description.trim().toLowerCase();
  if (!prompt) return false;
  if (prompt.includes('empty rubric')) return false;
  if (isProductReturnPrompt(prompt)) return false;
  return true;
}

/** Prototype: mock AI rubric generation from a natural-language prompt */
export function generateRubricFromPrompt(name, callType = '', description = '') {
  const prompt = description.trim().toLowerCase();
  const id = `rubric-${Date.now()}`;
  const baseSettings = cloneRubric(defaultRubric).settings;
  const trimmedPrompt = description.trim();

  if (prompt.includes('empty rubric')) {
    const section = createEmptySection('New stage');
    section.weight = 1;
    return {
      id,
      name,
      callType: callType || CALL_TYPE.NON_LEAD,
      status: 'draft',
      generationPrompt: trimmedPrompt,
      lastUpdated: 'AI generated',
      sections: [section],
      settings: baseSettings,
    };
  }

  if (isProductReturnPrompt(prompt)) {
    return createProductReturnRubricDraft(
      name || 'Product Return Calls Rubric',
      callType || CALL_TYPE.NON_LEAD,
      trimmedPrompt,
    );
  }

  const rubric = createBlankRubric(name, callType);
  return {
    ...rubric,
    id,
    generationPrompt: trimmedPrompt || undefined,
    lastUpdated: trimmedPrompt ? 'AI generated from lead template' : undefined,
  };
}

export function createInitialRegistry() {
  const rubric = cloneRubric(defaultRubric);
  const now = ONBOARDED_AT;
  return [
    {
      id: 'lead-calls-default',
      rubric,
      status: 'active',
      isSystemDefault: true,
      onboardedAt: now,
      lastUpdatedAt: now,
      callsScored: 1284,
    },
  ];
}

export function registryToRow(item) {
  return {
    id: item.id,
    name: item.rubric.name,
    callType: item.rubric.callType,
    editorVersion: item.rubric.editorVersion ?? EDITOR_VERSIONS.V1,
    attributeCount: countAttributes(item.rubric),
    callsScored: item.callsScored ?? 0,
    status: item.status,
    isSystemDefault: item.isSystemDefault,
    onboardedAt: item.onboardedAt,
    lastUpdatedAt: item.lastUpdatedAt,
    lastUpdatedLabel: lastUpdatedLabel(item),
    lastUpdatedHint: lastUpdatedHint(item),
  };
}
