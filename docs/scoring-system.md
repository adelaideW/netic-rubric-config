# Netic Intelligent Call Scoring — Design Specification

**Product:** Rubric Configuration + Call Scoring System
**Designer:** Adelaide Wang
**Version:** 1.0
**Scope:** Lead calls only — CXR Manager configuration experience

---

## 1. Overview

Netic's AI listens to inbound service calls and scores each CXR's (customer experience representative) performance. The rubric is the contract between the manager and the AI — it defines what a good call looks like, which behaviors are measured, and how scores are calculated.

This spec covers:

- How the rubric is structured
- How scoring works (formulas, modes, gates)
- How managers configure and publish changes
- How scores surface in the team performance view

---

## 2. Who This Is For

**User:** CXR Manager — oversees a team of CXRs handling inbound HVAC, plumbing, or pest control calls.

They need answers to four questions:

1. How is my team performing overall?
2. Where are we losing leads?
3. What are individual agents doing wrong on calls?
4. What do I need to coach my team on?

The rubric configuration experience is how managers define the rules that power those answers.

---

## 3. Rubric Structure

A rubric is organized into **stages** (phases of a call), each containing **attributes** (specific behaviors to evaluate).

```
Rubric
└── Stage (e.g. Verification) — has a weight
     └── Attribute (e.g. Verify customer details) — has a scoring mode + optional Required flag
```

### Default Rubric

| Stage | Default Weight | Attributes |
|-------|---------------|------------|
| Get to know your customer | 15% | Greet the caller, Issue identification, Assurance |
| Verification | 40% | Issue details, Verify customer details, Verify membership |
| Inform and educate | 35% | Availability, Service charge & payment terms, Arrival & tech communication |
| Closing | 10% | Proper closing, Use customer name |

Managers can:

- Toggle attributes on or off
- Edit attribute descriptions (this is the AI evaluation instruction)
- Add custom attributes to any stage
- Reorder attributes within a stage
- Adjust stage and attribute weights
- Mark attributes as Required
- Publish changes to apply to future calls

---

## 4. Scoring System

### 4.1 Attribute Scoring Modes

Each attribute uses one of three scoring modes, set per attribute by the manager:

| Mode | UI Label | How the AI scores it | Attribute score range |
|------|----------|---------------------|----------------------|
| Binary | Pass / Fail | Pass = 100, Fail = 0 | 0 or 100 |
| Granular | Percentage | AI returns a 0–100% score | 0–100 |
| Numeric | Numeric | AI returns a raw value within a min/max range; normalized to 0–100 | 0–100 |

**Numeric normalization formula:**

```
Attribute score = (value − min) / (max − min) × 100
```

Default max = 5. Managers can configure the min/max range.

**Default mode:** Binary (Pass/Fail) — recommended for most attributes and all first-time setups.

### 4.2 Stage Score Formula

A stage score is the weighted average of its attribute scores, multiplied by the stage weight. This gives the stage's contribution in points toward the overall call score.

```
Stage score = Σ (attribute score × attribute weight) × stage weight
```

**Example:** Verification has 3 attributes equally weighted (33.3% each), scores of 100, 100, and 0.

```
Stage raw result = (100×0.333 + 100×0.333 + 0×0.333) = 66.6
Stage weight     = 40%
Stage score (points contribution) = 66.6 × 0.40 = 26.6 pts
```

### 4.3 Overall Call Score Formula

```
Overall call score = Σ (all stage scores)
```

The overall score ranges from 0–100. It is the sum of all stage point contributions.

### 4.4 Attribute Weights Within a Stage

By default, all attributes within a stage are equally weighted.

Managers can switch to custom weights per attribute. When editing:

- Editing a weight **locks** it — locked weights are not auto-adjusted when other weights change
- Unlocked weights split the remaining percentage equally
- Weights cannot be set to 0%
- If locked weights do not total 100%, the UI shows a warning with the exact shortfall — it does not silently rebalance

### 4.5 Stage Weights

Stage weights follow the same lock/unlock behavior as attribute weights. All stage weights must total 100%. Default weights are 15 / 40 / 35 / 10.

---

## 5. Required Gate

Any attribute can be marked **Required**. This signals that failing this attribute is a disqualifying miss — not just a performance deduction.

### When a Required Attribute Is Missed

| Scoring mode | "Missed" means |
|--------------|---------------|
| Binary | Fail |
| Granular | Attribute score below the required pass threshold (default 60%) |
| Numeric | Normalized score below the required pass threshold (default 60%) |

### Effect of a Required Miss

- The stage's raw result is **capped below 60** — a single critical miss cannot leave the stage looking passable
- The stage is flagged **Coaching needed**
- The cap banner replaces a separate coaching badge to avoid redundancy
- The uncapped score is stored internally for coaching context ("would have scored X without the required miss")

### Default Required Attributes (Pre-Tagged)

| Attribute | Stage | Why |
|-----------|-------|-----|
| Verify customer details | Verification | Cannot dispatch without verified contact info |
| Availability | Inform and educate | No appointment offered = direct lead loss |
| Service charge & payment terms | Inform and educate | Compliance risk and surprise-fee disputes |

Managers can toggle Required on or off per attribute.

---

## 6. Coaching Flags

A call is flagged **Coaching needed** when any of the following are true:

- Overall call score is below the coaching threshold (default 60%), **OR**
- Any stage has a Required miss, **OR**
- *(Optional)* A stage's point contribution falls below its individual stage threshold, when per-stage thresholds are enabled

### Threshold Defaults

| Threshold | Default | Configurable |
|-----------|---------|--------------|
| Overall coaching threshold | 60% | Yes, in Coaching tab |
| Required pass threshold (Granular/Numeric) | 60% | Yes, in Coaching tab |
| Per-stage coaching threshold | 60% of stage max | Yes, per stage in Coaching tab (up to 100%) |

---

## 7. Display Rules

Three number types appear in the product. They are always labeled and never mixed without context.

| Level | What to show | What NOT to show |
|-------|-------------|------------------|
| Attribute | Pass/Fail badge (Binary), numeric % (Granular), normalized value (Numeric) + weight % badge + Required badge with tooltip | Do not show attribute's share of the stage score |
| Stage | Raw 0–100 stage result in the header; expandable tooltip shows full formula | Do not show raw result as if it's the call score |
| Call | Overall score in gauge + each stage's point contribution ("+N pts"); hover shows "Overall = sum of stage contributions" | Do not mix stage points with stage raw result |

**AI Confidence** (High / Medium / Low) is separate metadata — shown as "AI: High" with a tooltip. Never mixed with performance numbers.

---

## 8. Versioning

- All edits auto-save as a draft (shown as "Draft saved · just now")
- Publish is enabled only when there are unsaved draft changes
- Publishing mints a new version with an optional "What changed?" note
- Past versions are viewable in read-only mode and can be re-published (rollback) via a confirmation modal
- Every call record carries a **Scored by v#** tag — scores always trace to the rubric version that produced them
- Past scores are never recalculated when a rubric changes — this is stated explicitly in the publish confirmation modal

---

## 9. Information Architecture

```
Rubrics Hub
└── Lead calls rubric [Active]
     ├── Preview tab — read-only; scores a sample call; entry point on open
     ├── Details tab — stages, attributes, weights, scoring modes, Required flags
     ├── Coaching tab — thresholds, per-stage flags, coaching materials
     └── Versions tab — version history; view past versions; rollback

Team Performance
├── KPI summary — total employees, lead calls, leads converted, leads won
├── Average call score — donut with per-stage contributions
├── Lead funnel — calls → lead calls → converted → won
├── AI summary — lost-lead drivers, coaching candidates, suggested material
└── Call performance log — search + filter; select a call to open full score breakdown
```

---

## 10. Key User Flows

### Flow A — First-Time Setup (Happy Path)

**Scenario:** Manager onboards for the first time. Wants to accept defaults and make one small tweak before going live.

1. Manager lands on Rubrics Hub — sees the default "Lead calls" rubric with Netic template
2. Opens rubric → lands on Preview tab — scores a sample call with defaults to build trust
3. Switches to Details tab — scans 4 stages and attributes
4. Selects "Verify membership" → edits description to match their business language ("HomeShield plan membership")
5. Switches to Coaching tab — reviews thresholds, leaves defaults
6. Clicks Publish → confirmation modal: "Applies to all future lead calls. Past scores are not recalculated."
7. Rubric goes live

**Design principle:** Manager can accept defaults with zero changes and publish immediately — "Use Netic default rubric" path must require no more than 2 clicks.

### Flow B — Diagnose a Team Problem

**Scenario:** Manager notices Verification is underperforming on the team dashboard. Wants to find out why and tighten the rubric.

1. Manager opens Team Performance — sees Verification stage avg at 52% (flagged red)
2. Clicks "Edit scoring for Verification →" — lands in Details tab with Verification stage selected
3. Reviews attribute scores — "Verify customer details" is frequently failing
4. Marks "Verify customer details" as Required
5. Switches to Preview tab — selects "Weak verification" sample call → sees stage cap at below 60% with coaching flag
6. Confirms the change reflects the intended signal
7. Clicks Publish — future calls scored under new rules

### Flow C — Add a Custom Attribute

**Scenario:** Pest control company requires CXRs to ask about pets on property before dispatching a technician. This is not in the default rubric.

1. Manager opens Details tab → expands Verification stage
2. Clicks + Add attribute
3. Enters name: "Ask about pets on property"
4. Writes AI instruction: "CXR confirmed whether pets are present in the home before scheduling"
5. Leaves scoring mode as Binary (Pass/Fail)
6. Does not mark as Required (first week — wants to track before enforcing)
7. Saves → new attribute appears with "Custom" label in the stage
8. Previews on a sample call — confirms AI evaluates correctly
9. Publishes

**Design guardrail:** If description is fewer than 20 characters, show warning: "Vague descriptions reduce AI scoring accuracy."

### Flow D — Switch Scoring Mode (Advanced)

**Scenario:** Manager wants "Issue details" to be scored granularly — CXRs should get partial credit for asking some but not all follow-up questions.

1. Manager opens "Issue details" attribute in Details tab
2. Expands Advanced section
3. Switches scoring mode from Binary → Granular (Percentage)
4. Sets required pass threshold to 70% (meaning the AI must score this attribute ≥ 70% to pass)
5. Marks attribute as Required
6. Previews on sample call — sees attribute score of 60% (below threshold) → stage caps, coaching flag triggers
7. Publishes

### Flow E — Rollback a Rubric Version

**Scenario:** Manager published a rubric change last week. Coaching scores shifted unexpectedly. Wants to revert.

1. Manager opens rubric → clicks version pill near the title ("v4")
2. Opens Versions tab — sees version history with timestamps and "What changed?" notes
3. Selects v3 — views in read-only mode; confirms it's the correct prior state
4. Clicks Re-publish this version → confirmation modal: "This will become the active rubric for all future calls. Calls scored under v4 will not be recalculated."
5. Confirms → v3 is now active, logged as v5 in version history

---

## 11. Edge Cases

| Scenario | Behavior |
|----------|----------|
| All attributes in a stage are disabled | Stage is excluded from scoring; its weight is redistributed proportionally to remaining stages |
| Stage weight total does not equal 100% | UI shows warning with exact shortfall; Publish is blocked until resolved |
| AI returns Low confidence on an attribute | Attribute is flagged "Needs review" and excluded from the score; manager can confirm or override |
| Manager sets required pass threshold above current team average | UI shows a warning: "This threshold will flag X% of recent calls for coaching" |
| Rubric published with no Required attributes | Allowed — Required is optional. No warning needed. |
| Manager attempts to delete last attribute in a stage | Blocked with message: "A stage must have at least one attribute." |
| Rubric has unsaved changes when navigating away | Browser prompt: "You have unsaved changes. Discard or save draft?" |

---

## 12. Out of Scope for v1

| Capability | Notes |
|------------|-------|
| Non-lead call types | Separate rubric type; future scope |
| Multi-rubric management | Single rubric per call type in v1 |
| CXR-facing score views | Manager-only in v1 |
| Full coaching workflow | Coaching queue entry point only |
| Outcome-linked composite scoring | Requires CRM/booking integration |
| AI vs. human benchmark UI | Phase 2 — after process scoring is trusted |
| Historical score recalculation | Scores always trace to the rubric version that produced them — no retroactive changes |

---

## 13. Open Questions

1. Who owns the default rubric descriptions? Does Netic write them per vertical (HVAC vs. pest control vs. plumbing), or is it one generic default? This affects onboarding copy and the "Use Netic default" path.
2. Does the Required pass threshold (default 60%) need to be per-attribute or is one global threshold sufficient for v1?
3. What CRM/booking signal is available today? Determines how soon the lead-loss tag can be validated against actual booking outcomes, not just call behavior.
4. Is there a max number of attributes per stage? No hard limit defined — worth setting a soft cap (e.g. 10) to prevent rubrics that are too granular for the AI to evaluate reliably.
