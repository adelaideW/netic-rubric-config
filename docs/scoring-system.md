# Netic Call Scoring System — Specification

**Version:** V1 (Weighted Checklist), preferred design  
**Scope:** Lead call rubrics — HVAC, plumbing, and similar home-services contexts

---

## 1. Purpose

The scoring system gives CXR managers a structured, auditable way to evaluate phone calls. Each call is scored against a rubric that defines what "good" looks like at the stage and attribute level. Scores drive coaching decisions and surface team-wide patterns in the performance dashboard.

---

## 2. Data model

```
Rubric
 └── Stage  (× N, each with a weight)
      └── Attribute  (× N per stage, each with a scoring mode and weight)
```

A rubric groups related **stages** (phases of the call). Each stage contains **attributes** — individual behaviors the CXR is evaluated on. Both stages and attributes carry weights that determine how much they contribute to the final score.

---

## 3. Scoring models

A rubric runs one of two scoring models, switchable from the attribute-checklist header. Both models share the same overall formula.

| Model | How stages are scored |
|-------|-----------------------|
| **V1 — Weighted checklist** *(preferred)* | Each attribute is scored individually, combined by attribute weight, then multiplied by stage weight |
| **V2 — Rating guide** *(design exploration)* | Each stage is given a holistic 1–5 rating against a written level guide, normalized to a percentage, then multiplied by stage weight |

> **Design rationale:** V1 is the preferred final design. Per-attribute scoring with a Required gate gives managers granular, auditable control — managers can pinpoint which behavior missed, not just that a stage scored low. V2 was explored as a faster, more holistic alternative and is retained in the prototype for comparison.

---

## 4. Core formulas

### V1 — Weighted checklist

```
Stage score   = Σ (attribute score × attribute weight) × stage weight
Call score    = Σ (stage scores)
```

### V2 — Rating guide

```
Stage score   = (rating ÷ max rating) × 100 × stage weight
Call score    = Σ (stage scores)
```

**Terminology**

| Term | Definition | Range |
|------|-----------|-------|
| Attribute score | The result of scoring one attribute | 0–100 |
| Stage score | A stage's weighted point contribution to the call | 0–stage weight |
| Call score | Sum of all stage scores | 0–100 |

These formulas match the **"How rubric scoring works"** panel and all hover tooltips in the prototype.

---

## 5. Stages

- A rubric has one or more stages, each representing a phase of the call (e.g., Verification, Closing).
- Each stage has a **weight** — its maximum contribution to the call score in points.
- Stage weights must total **100%**.
- Default stage weights for the Lead calls rubric:

| Stage | Default weight |
|-------|---------------|
| Get to know your customer | 15% |
| Verification | 40% |
| Inform and educate | 35% |
| Closing | 10% |

### Stage weight behavior

- Editing a stage weight **locks** it.
- Remaining unlocked stages share what's left equally.
- Locked weights are never auto-shrunk. If the total exceeds or falls short of 100%, the UI shows a warning with the exact correction target.
- A weight of **0%** is not allowed.

---

## 6. Attributes (V1)

Each attribute represents a specific observable behavior. Attributes have a **scoring mode** and optional **weight** within their stage.

### 6.1 Scoring modes

| Mode | UI label | How the attribute score is determined |
|------|----------|--------------------------------------|
| **Binary** | Pass/Fail | Pass = 100, Fail = 0. Partial credit is disabled in this prototype. |
| **Granular** | Percentage | AI returns a value 0–100%. |
| **Numeric** | Numeric | AI returns a raw value between a configurable min and max, normalized to 0–100 using `(value − min) / (max − min) × 100`. Default range: 0–5. |

Use Pass/Fail for single, binary behaviors. Use Percentage or Numeric when the AI needs to grade partial completion (e.g., "verified 3 of 4 customer fields").

### 6.2 Attribute weights

- By default, all attributes within a stage are **equally weighted**.
- A manager can switch to **custom weights** per attribute.
- Custom weight behavior mirrors stage weights: editing a weight locks it; unlocked attributes rebalance equally; no weight can be 0%; a warning appears if the set doesn't total 100%.

### 6.3 Required flag

An attribute can be marked **Required**. See section 7.

---

## 7. Required gate

The Required flag marks an attribute as a non-negotiable behavior. A miss on a Required attribute cannot be offset by strong performance elsewhere in the stage.

### When a Required attribute is missed

A Required attribute counts as missed when:

| Mode | Miss condition |
|------|---------------|
| Binary | Fail result |
| Percentage / Numeric | Attribute score below the required pass threshold (default **60%**) |

### Consequences

When any Required attribute is missed in a stage:

1. The stage score is **capped below 60** (at 59), regardless of other attribute scores.
2. The stage is flagged with a "Required attribute missed — coaching needed" banner.
3. No separate "Coaching needed" badge is shown on the stage (the banner covers it).

This is intentional: a single critical miss cannot leave a stage looking passable.

---

## 8. Coaching thresholds and flags

### 8.1 When a call is flagged for coaching

A call is flagged when **any** of the following are true:

- The overall call score is below the **coaching threshold** (default **60%**)
- Any stage has a Required attribute miss (V1) or is rated below its minimum standard (V2)
- *(Optional)* Per-stage detailed thresholds are enabled and a stage's score falls below its stage threshold

### 8.2 Default thresholds

| Setting | Default |
|---------|---------|
| Overall coaching threshold | 60% |
| Required attribute pass threshold | 60% |
| Per-stage threshold (when enabled) | 60% of each stage's max contribution |

### 8.3 Per-stage detailed thresholds

When enabled (opt-in toggle on the Coaching tab), each stage gets its own threshold, editable from 0% up to 100%. Stages that fall below their threshold are individually flagged, even if the overall call score is above the coaching threshold.

### 8.4 V2 coaching flags

In V2, each stage's rating guide has one level marked as the **minimum standard**. A stage rated below that level is treated as failed and flagged for coaching.

---

## 9. Display rules

Three number types appear in the UI. They are always labeled and never mixed without context.

| Level | What is shown | Notes |
|-------|--------------|-------|
| **Attribute** | Outcome badge (Pass/Fail, %, or numeric value) | Weight % badge appears first, then Required badge if applicable |
| **Stage** | Raw 0–100 result on the stage header | Hover tooltip shows the full calculation |
| **Call** | Overall score in the gauge | Hover shows `Call score = Σ (stage scores) = X + Y + Z = N` |

**AI confidence** (High / Medium / Low) is separate metadata. It is always labeled "AI: High / Medium / Low" and never combined with performance numbers.

---

## 10. Versioning

Changes to a rubric are auto-saved as a **draft**. Drafts do not affect scoring of new calls until published.

| Action | Behavior |
|--------|----------|
| Edit a rubric | Changes auto-save; header shows "Draft saved · just now" |
| Publish | Mints a new version with an optional "What changed?" note; Publish button is disabled if there are no unsaved changes |
| View past version | Opens read-only; Publish is available to trigger a rollback |
| Rollback | Requires a confirmation modal; creates a new version from the old snapshot |

Call records carry a **Scored by v#** tag, so any score can always be traced back to the exact rubric version that produced it.

---

## 11. Editor configuration surfaces

| Tab | What a manager configures |
|-----|--------------------------|
| **Preview** | Read-only; select a sample call and see the full score breakdown in context |
| **Details** | Stages and their weights; per-attribute scoring mode, Required flag, and attribute weights |
| **Coaching** | Overall coaching threshold (with pts/% unit toggle), optional per-stage detailed thresholds, coaching material, email/escalation rules |
| **Versions** | Full version history table; view or roll back any past version |

---

## 12. Team performance dashboard

The dashboard gives managers a read of team health driven by the active rubric.

| Component | What it shows |
|-----------|--------------|
| **KPI cards** | Total employees, lead calls taken, leads converted, leads won |
| **Average call score (donut)** | Team-wide average, broken down by each stage's contribution; hover for formula |
| **Lead funnel (bar chart)** | Calls → lead calls → converted → won (count + %) |
| **AI summary** | Collapsible; drivers of lost leads, agents flagged for coaching, suggested material |
| **Call performance table** | Per-call log; searchable and filterable by date, agent, call type |
| **Call score panel** | Detailed breakdown for the selected call; collapsible **Call source** with transcript and recording player |

Filter state, search, date range, and AI summary collapse state persist in `localStorage` across sessions.
