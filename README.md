# Netic — Rubric Configuration (Design Challenge)

Interactive prototype for configuring and reviewing Netic call-scoring rubrics. It covers the full loop: build a rubric, preview how it scores real calls, and review team performance driven by that rubric.

**Live:** [netic-rubric-config.vercel.app](https://netic-rubric-config.vercel.app)

## Quick start

```bash
npm install
npm run dev
```

**Local URL:** [http://127.0.0.1:5180](http://127.0.0.1:5180)

Built with React 19 + Vite. Deploys to Vercel (`npm run deploy`).

## Views

| View | URL | Purpose |
|------|-----|---------|
| Rubrics hub | `/?view=hub` | List of rubrics; open a rubric or create a new one |
| Preview | `/?view=preview` | Read-only walkthrough of the rubric scoring a sample call |
| Details | `/?view=edit` | Configure stages, attributes, scoring mode, Required, and weights |
| Coaching | `/?view=scoring` | Coaching thresholds and guidance per stage |
| Versions | `/?view=versions` | Version history; view or publish a past version |
| Team performance | `/?view=dashboard` | KPIs, charts, AI summary, and per-call review |

The editor is organized as tabs: **Preview / Details / Coaching / Versions**. Clicking a rubric row opens **Preview** first (safe overview); the pencil icon or **Create rubric** goes straight to **Details**.

## Scoring models

Rubrics support two scoring models, switchable from the attribute-checklist header:

- **V1 — Weighted checklist:** each stage rolls up its attribute scores by attribute weight, then by stage weight.
- **V2 — Rating guide:** each stage is rated against a 0–max rating guide, normalized to a percentage, then weighted.

**Overall call score = Σ (stage scores)**, where each stage score is the attribute average × stage weight (in points).

### Attributes

- **Binary** — pass/fail (with optional partial credit)
- **Granular** — 0–100%
- **Numeric** — AI rating between a configurable min/max (default max `5`)
- **Required** — a missed required attribute caps the whole stage below 60 and flags it for coaching, even if other attributes passed
- **Weights** — stages and attributes accept free-input custom weights; a warning appears (with the target value) when a set doesn't total 100%. Weights can't be 0%.

## Team performance

- **KPI cards** — Total employees, Lead calls, Leads converted, Leads won
- **Average call score** — donut chart with per-stage contributions in the legend (points + %, formula on hover)
- **Lead funnel** — vertical bar chart from calls taken → lead calls → converted → won (count + %)
- **AI summary** — collapsible: drivers of lost leads, who needs coaching, and suggested coaching material
- **Call performance** — per-call log with search + filters (date, agent, call type); click a row (or a cell) to filter/select
- **Call score panel** — full breakdown for the selected call, with a **Call source** section (recording + summary), AI-confidence and per-attribute/stage recording toggles

Filters, search, date range, and AI-summary state persist in `localStorage`.

## Versioning

- Auto-save messaging (**Draft saved · just now**); **Publish** is enabled only when there are unsaved changes
- Version pill near the rubric title with a history dropdown
- **Versions** tab lists each version (status, created, published); view a past version read-only, then **Publish** it via a confirmation modal to roll back
- Call records show a subtle **Scored by v#** tag

## Sample calls

- **AC repair — strong call**
- **AC repair — weak call**
- **Plumbing — stage failed call** (required attribute missed → stage capped below 60, flagged for coaching)

## Demo path

1. **Hub** → open a rubric (lands in **Preview**) → change the sample call and watch the breakdown update
2. **Details** → switch an attribute between Binary / Granular / Numeric and adjust weights
3. **Preview** → **Plumbing — stage failed call** → stage capped below 60 with coaching flag
4. **Versions** → view v2 read-only → **Publish** to roll back (confirmation modal)
5. **Team performance** → filter the call log, open a call, expand **Call source**

## Docs

| Artifact | Path |
|----------|------|
| Scoring spec | [docs/scoring-system.md](docs/scoring-system.md) |
| Figma frame spec | [docs/figma-spec.md](docs/figma-spec.md) |
| Extended analysis | [../netic-rubric-scoring/](../netic-rubric-scoring/) |
