# Netic — Rubric Configuration Prototype

A high-fidelity interactive prototype built for a design challenge. It covers the full manager workflow: configure a call-scoring rubric, preview how it evaluates real calls, and review team performance data driven by that rubric.

**Live demo:** [netic-rubric-config.vercel.app](https://netic-rubric-config.vercel.app)

---

## Quick start

```bash
npm install
npm run dev
# → http://127.0.0.1:5180
```

Built with React 19 + Vite. Deploy to Vercel with `npm run deploy`.

---

## What this prototype covers

The prototype is scoped to the **lead calls rubric** for a home-services company (HVAC, plumbing). A CXR manager can:

1. **Browse rubrics** — see all rubrics, their status, and scoring model.
2. **Preview a rubric** — see how it scores sample calls without touching the config.
3. **Configure a rubric** — set stages, attributes, scoring modes, weights, and coaching thresholds.
4. **Publish changes** — versions are tracked; old versions can be viewed and rolled back.
5. **Review team performance** — per-call scores, coaching flags, and an AI summary of patterns.

---

## Navigation

### Rubric editor (tabs)

Clicking a rubric row opens it in **Preview** first. Clicking the pencil icon or **Create rubric** goes straight to **Details**.

| Tab | Purpose |
|-----|---------|
| **Preview** | Read-only: select a sample call, see the full score breakdown |
| **Details** | Configure stages, attributes, scoring mode, Required, and weights |
| **Coaching** | Set coaching thresholds and attach coaching material per stage |
| **Versions** | View version history; open a past version read-only or publish it to roll back |

### App-level views

| View | URL | Purpose |
|------|-----|---------|
| Rubrics hub | `/?view=hub` | List of rubrics |
| Preview | `/?view=preview` | Active rubric preview |
| Details editor | `/?view=edit` | Rubric configuration |
| Coaching tab | `/?view=scoring` | Thresholds and material |
| Versions tab | `/?view=versions` | Version history |
| Team performance | `/?view=dashboard` | Call log, KPIs, charts |

---

## Scoring models

Two models are available, switchable from the attribute-checklist header. **V1 is the preferred design.**

| Model | Approach |
|-------|----------|
| **V1 — Weighted checklist** *(preferred)* | Each attribute is scored individually, weighted within its stage, then the stage contributes to the call score by its stage weight |
| **V2 — Rating guide** *(design exploration)* | Each stage is given a holistic 1–5 rating against a written level guide; the rating is normalized and weighted by stage weight |

See [`docs/scoring-system.md`](docs/scoring-system.md) for the full specification.

---

## Key features

### Rubric configuration
- Three attribute scoring modes: **Pass/Fail**, **Percentage** (0–100%), and **Numeric** (AI rates on a custom min–max scale, default 0–5)
- **Required** attribute flag: a miss caps the whole stage below 60 and triggers coaching, regardless of other attribute scores
- **Custom weights** for stages and attributes: editing a weight locks it; unlocked weights rebalance equally. Weights can't be 0%. A warning with the exact correction target appears when the set doesn't total 100%.
- Default stage weights: **Get to know (15%) / Verification (40%) / Inform and educate (35%) / Closing (10%)**

### Versioning
- All edits auto-save as a draft ("Draft saved · just now")
- **Publish** mints a new version with an optional change note
- Past versions are viewable read-only; publishing a past version rolls back with a confirmation modal
- Call records show a **Scored by v#** tag

### Team performance dashboard
- **KPI cards** — total employees, lead calls, leads converted, leads won
- **Average call score** — donut chart with per-stage contributions (hover for formula)
- **Lead funnel** — vertical bar chart: calls → lead calls → converted → won
- **AI summary** — collapsible panel: drivers of lost leads, agents who need coaching, suggested material
- **Call performance table** — searchable/filterable per-call log; click a row to open the call score breakdown with a collapsible **Call source** (transcript + recording player)
- Filter, search, date range, and AI summary collapse state persist in `localStorage`

---

## Demo path

1. **Hub** → click the "Lead calls" rubric row → lands in **Preview**
2. Change the sample call dropdown to "Plumbing — stage failed call" → Verification stage caps below 60 with a coaching flag
3. Click **Details** → switch an attribute between Pass/Fail / Percentage / Numeric, adjust a weight → return to **Preview** to see the breakdown update
4. Click **Versions** → open v2 read-only → click **Publish** → confirm rollback modal
5. Click **Team performance** → filter the call log by agent or call type, open a call, expand **Call source**

---

## Docs

| Artifact | Path |
|----------|------|
| Scoring specification | [docs/scoring-system.md](docs/scoring-system.md) |
| Figma frame spec | [docs/figma-spec.md](docs/figma-spec.md) |
