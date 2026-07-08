# Netic Call Scoring System — Specification

Unified model for CXR managers: weighted stages, per-attribute scoring modes, a Required stage gate, two scoring models, and versioned rubrics.

## Structure

```
Rubric → Stages (weights sum to 100%) → Attributes (weights within stage)
```

## Scoring models

A rubric runs one of two scoring models, switchable from the attribute-checklist header:

| Model | How a stage is scored |
|-------|-----------------------|
| **V1 — Weighted checklist** (default) | Attributes are scored, averaged by attribute weight, then weighted by stage weight |
| **V2 — Rating guide** | Each stage is rated against a 0–max rating guide, normalized to a percentage, then weighted by stage weight |

## Attribute scoring modes (V1)

| Mode | Label in UI | Behavior |
|------|-------------|----------|
| **Binary** | Pass/Fail | Pass = 100, Fail = 0 (partial credit is disabled in this prototype) |
| **Granular** | Percentage | AI returns 0–100% |
| **Numeric** | Numeric | AI returns a raw value in `[min, max]`, normalized to 0–100 (`(value − min) / (max − min) × 100`). Default max = **5** |

**Prototype note:** Partial credit (50%) is not supported on Pass/Fail. Managers who need graded scoring can adopt the advanced **Percentage** or **Numeric** modes instead.

## Weights

Stages and attributes both use the same custom-weight behavior:

- Editing a weight **locks** it; remaining **unlocked** weights split what's left equally.
- Locked weights are never auto-shrunk — if a set doesn't total 100%, the UI **warns** with the exact target value instead of silently rebalancing.
- A weight can't be **0%**.
- Default stage weights: **20 / 25 / 35 / 20**.

## Terminology (aligned across UI, tooltips, and the "How rubric scoring works" panel)

| Term | Meaning | Range |
|------|---------|-------|
| **Attribute average** | Weighted average of attribute scores within a stage | 0–100 |
| **Stage score** | Attribute average × stage weight — a stage's contribution in points | 0–stage weight |
| **Overall call score** | Sum of all stage scores | 0–100 |

```
Attribute average = Σ(attrScore × attrWeight) / Σ(attrWeight)
Stage score       = attribute average × stage weight
Overall call score = Σ (stage scores)
```

## Required gate

A **Required** attribute counts as missed when:

- **Binary:** Fail (or Partial when partial credit is off)
- **Granular / Numeric:** score below the pass threshold (default **70%**)

When any required attribute is missed in a stage:

- The stage's **attribute average is capped below 60** (at 59), so a single critical miss can't leave the stage looking passable.
- The stage is flagged **coaching needed** (the cap banner replaces a separate coaching badge to avoid redundancy).

## Coaching flags

A call **needs coaching** when any of these are true:

- Overall call score is below the coaching threshold (default **80%**), **or**
- Any stage has a required miss, **or**
- (Optional) per-stage coaching thresholds are enabled and a stage's contribution falls below its threshold (default = 70% of the stage's max points).

Stages are individually flagged when they fail (required miss) or fall below the stage flag threshold (default **60**).

## Display rules

Three number types — always labeled, never mixed:

- **Attribute level:** outcome. Pass/Fail badge (Binary), numeric % (Granular), or normalized value (Numeric). A **weight % badge** shows first next to the attribute title, followed by the **Required** badge (with an explanatory tooltip).
- **Stage level:** attribute average (0–100), with an expandable tooltip showing the full `Σ (attribute score × attribute weight) × stage weight` calculation.
- **Call level:** overall score in the gauge, plus each **stage score** contribution; hovering shows `Overall call score = Σ (stage scores)`.

**AI confidence** (High / Medium / Low) is separate metadata, shown as "AI: High" with a tooltip — never mixed with performance numbers.

## Configuration surfaces (editor tabs)

| Tab | Purpose |
|-----|---------|
| **Preview** | Read-only walkthrough scoring a sample call; entry point when opening a rubric |
| **Details** | Stages + stage weights, attribute mode, Required, and attribute weights |
| **Coaching** | Coaching threshold, optional per-stage thresholds, and coaching material |
| **Versions** | Version history; view a past version read-only or publish it (rollback) |

## Versioning

- Changes auto-save as a **draft** ("Draft saved · just now"); **Publish** is enabled only when there are unsaved changes.
- A version pill near the rubric title exposes version history.
- Publishing mints a new version (with an optional "What changed?" note); viewing a past version is read-only and can be re-published via a confirmation modal to roll back.
- Call records carry a **Scored by v#** tag so results always trace to the rubric version that produced them.

## Team performance

- **KPIs:** total employees, lead calls, leads converted, leads won.
- **Average call score** donut with per-stage contributions in the legend (points + %, formula on hover).
- **Lead funnel** bar chart: calls taken → lead calls → converted → won (count + %).
- **AI summary** (collapsible): lost-lead drivers, who needs coaching, suggested material.
- **Call performance** log with search + filters (date, agent, call type); selecting a call opens the full **Call score** breakdown and a **Call source** section (recording + summary).
