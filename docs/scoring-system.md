# Netic Call Scoring System — Specification

Unified model for CXR managers: weighted stages, per-attribute (or per-stage) scoring, a Required stage gate, and versioned rubrics.

## Structure

```
Rubric → Stages (weights sum to 100%) → Attributes (weights within stage)
```

## Scoring models

A rubric runs one of two scoring models, switchable from the attribute-checklist header.

| Model | How a stage is scored |
|-------|-----------------------|
| **V1 — Weighted checklist** (preferred) | Each attribute is scored, the scores are combined by attribute weight, then weighted by stage weight |
| **V2 — Rating guide** (exploration) | Each stage is rated 1–5 against a written rating guide, normalized to a percentage, then weighted by stage weight |

> **Design note:** **V1 (weighted checklist) is the preferred final design** — its per-attribute scoring, weights, and Required gate give CXR managers granular, auditable control over exactly what each call is measured on. V2 (rating guide) was an **exploration** of a holistic, level-based alternative. Both are kept in the prototype so the two directions can be compared.

### V2 — Rating guide (exploration)

- Each stage has a **rating guide**: an ordered list of levels (default **1–5**) with a written description of the behavior expected at each level.
- One level is marked the **minimum standard**. A stage rated below that level is **failed** and flagged for coaching.
- The AI picks the level whose description best matches the call; that rating drives the stage score.
- No per-attribute Required gate — the stage is judged as a whole against the guide.

## Terminology & formula

| Term | Meaning | Range |
|------|---------|-------|
| **Attribute score** | An individual attribute's result | 0–100 |
| **Stage score** | A stage's weighted contribution to the call, in points | 0–stage weight |
| **Overall call score** | Sum of all stage scores | 0–100 |

```
V1  Stage score = Σ (attribute score × attribute weight) × stage weight
V2  Stage score = (rating ÷ max rating) × 100 × stage weight

Overall call score = Σ (stage scores)
```

These formulas match the **"How rubric scoring works"** panel and the tooltips in the prototype.

## Stage details

- **Weight** — each stage has a weight; stage weights sum to 100%.
- **Stage score** — the stage's weighted contribution in points (see formula above); the score breakdown shows each stage's contribution and hovering reveals the full calculation.
- A stage's raw 0–100 result is shown on the stage header; the **stage score** (points) is what rolls up into the overall call score.

## Attribute details (V1)

Each attribute has a **scoring mode**:

| Mode | Label in UI | Attribute score |
|------|-------------|-----------------|
| **Binary** | Pass/Fail | Pass = 100, Fail = 0 (partial credit is disabled in this prototype) |
| **Granular** | Percentage | AI returns 0–100% |
| **Numeric** | Numeric | AI returns a raw value in `[min, max]`, normalized to 0–100 (`(value − min) / (max − min) × 100`). Default max = **5** |

Managers who need graded scoring can adopt the advanced **Percentage** or **Numeric** modes instead of Pass/Fail.

Each attribute can also be marked **Required** (see Required gate below).

## Weights

Stages and attributes both use the same custom-weight behavior:

- Editing a weight **locks** it; remaining **unlocked** weights split what's left equally.
- Locked weights are never auto-shrunk — if a set doesn't total 100%, the UI **warns** with the exact target value instead of silently rebalancing.
- A weight can't be **0%**.
- Default stage weights: **20 / 25 / 35 / 20**.

## Required gate

A **Required** attribute counts as missed when:

- **Binary:** Fail (or Partial when partial credit is off)
- **Granular / Numeric:** attribute score below the required pass threshold (default **60%**)

When any required attribute is missed in a stage:

- The stage's raw result is **capped below 60**, so a single critical miss can't leave the stage looking passable.
- The stage is flagged **coaching needed** (the cap banner replaces a separate coaching badge to avoid redundancy).

## Coaching flags

A call **needs coaching** when any of these are true:

- Overall call score is below the coaching threshold (default **60%**), **or**
- Any stage has a required miss (V1) or is rated below its minimum standard (V2), **or**
- (Optional) per-stage coaching thresholds are enabled and a stage's contribution falls below its threshold.

Defaults:

- **Coaching threshold (overall):** 60%
- **Required pass threshold:** 60%
- **Detailed per-stage threshold:** 60% of each stage's max when enabled — editable up to 100% per stage.

Stages are individually flagged when they fail (required miss / below minimum standard) or fall below the stage flag threshold (default **60**).

## Display rules

Three number types — always labeled, never mixed:

- **Attribute level:** outcome. Pass/Fail badge (Binary), numeric % (Granular), or normalized value (Numeric). A **weight % badge** shows first next to the attribute title, followed by the **Required** badge (with an explanatory tooltip).
- **Stage level:** the stage's raw 0–100 result, with an expandable tooltip showing the full `Σ (attribute score × attribute weight) × stage weight` calculation.
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
