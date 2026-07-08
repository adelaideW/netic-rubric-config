# Netic Call Scoring System — Specification (v3)

Unified model for CXR managers: weighted stages, per-attribute scoring modes, and Required stage gates.

## Structure

```
Rubric → Stages (weights sum to 100%) → Attributes (weights within stage)
```

## Attribute scoring modes

| Mode | When to use | Behavior |
|------|-------------|----------|
| **Pass/Fail** (default) | Single behaviors | Pass or Fail |
| **Percentage** (advanced) | Compound tasks (e.g. verify 3 of 4 fields) | AI returns 0–100%; optional min/max score range |

**Prototype note:** Partial credit (50%) on Pass/Fail is disabled in this prototype.

**Deferred:** Count-based scoring (e.g. “confirm phone number twice”) — express in v1 via instruction + Pass/Fail. Revisit as an advanced graded sub-type in v1.5 if managers need numeric targets.

## Attribute weights within a stage

| Mode | Behavior |
|------|----------|
| **Equally weighted** | Each attribute gets the same share; no % badges shown |
| **Custom weight** | Manager sets % per attribute; unlocked attributes auto-balance to total 100% |

## Stage score

```
StageScore = Σ(attrScore × attrWeight) / Σ(attrWeight)
```

## Required gate

If any **Required** attribute fails:
- **Pass/Fail:** Fail
- **Percentage:** Score below pass threshold (default 70%, shown on Coaching tab only when Percentage attributes exist)

→ Stage marked **Failed** (score still shown for context)  
→ Call flagged **Coaching needed**

## Call score

```
CallScore = round(Σ(StageScore × StageWeight))
```

Each stage’s **contribution** = `StageScore × StageWeight` (shown as “+N pts” in the score breakdown).

Coaching needed when:
- Call score below threshold (default 80%), OR
- Any stage failed (Required miss)

## Display rules

Use three distinct number types — never mix them without labels.

### Attribute level — show **outcome**

| Scoring mode | Display |
|--------------|---------|
| Pass/Fail | **Pass** or **Fail** badge |
| Percentage | Numeric score (e.g. **72%**) |

Do **not** show attribute weight or share-of-stage (e.g. 33%) in Preview or Team dashboard. Weights affect stage score math only.

**AI confidence** (High / Medium / Low) is separate metadata — labeled “AI: High” with a tooltip, not mixed with performance.

### Stage level — show **stage score** (0–100)

- Header number = weighted average of attribute scores within the stage
- When expanded: hint text — *“Stage score = average of N attributes (equally weighted)”* or *weighted average* when custom weights are set
- Users can verify: e.g. 2 Pass + 1 Fail → `(100+100+0)/3 = 67`

### Call level — show **overall** and **contributions**

- Overall score (0–100) in the circle gauge
- Per stage: **Stage score** column + **Contributes** column (`+N pts`)
- Subtitle: *Overall = sum of contributions*

## Configuration surfaces

| Surface | Purpose |
|---------|---------|
| **Attributes editor — Stages column** | Stage weights (canonical); must total 100% |
| **Attributes editor — Attribute detail** | Instruction, Required, Advanced (scoring mode, attribute weights) |
| **Coaching tab** | Global rules (coaching threshold, coaching material) + live preview |

## Team performance table

Per agent row: score, Δ vs team, lead outcomes, coaching badge, weak stage.  
Expand row → stage scores + attribute **results** (Pass/Fail) with AI confidence.
