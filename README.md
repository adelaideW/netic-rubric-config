# Netic — Rubric Configuration (Design Challenge)

Interactive prototype for Netic call scoring rubric configuration.

## Quick start

```bash
npm install
npm run dev
```

**Local URL:** [http://127.0.0.1:5180](http://127.0.0.1:5180)

**Scoring model comparison (separate app):** [http://127.0.0.1:5181](http://127.0.0.1:5181) — see [`../netic-rubric-scoring/`](../netic-rubric-scoring/)

## Views

| View | URL | Purpose |
|------|-----|---------|
| Rubrics hub | `/?view=hub` | Entry to configure lead-call rubric |
| Attributes | `/?view=edit` | Per-attribute mode, Required, weights |
| Scoring | `/?view=scoring` | Section weights and thresholds |
| Preview | `/?view=preview` | Live breakdown on sample calls |
| Team performance | `/?view=dashboard` | Expandable agent table with outcomes |

## Scoring logic

- **Sections** have weights (20/25/35/20 default) that roll up attribute scores
- **Attributes** use **Binary** (pass/fail + optional partial) or **Granular** (0–100%)
- **Required** miss → section **Failed** → **Coaching** badge
- **Critical** attributes count 2× within a section

## Demo path

1. **Team performance** → expand **Maria G.** → Required misses on Verification
2. **Rubrics → Edit** → **Verify customer details** → toggle **Required**
3. **Preview** → *AC repair — weak verification* → section shows **Failed**
4. Switch attribute to **Granular** vs **Binary** and watch breakdown update

## Docs

| Artifact | Path |
|----------|------|
| Scoring spec | [docs/scoring-system.md](docs/scoring-system.md) |
| Figma frame spec | [docs/figma-spec.md](docs/figma-spec.md) |
| Extended analysis | [../netic-rubric-scoring/](../netic-rubric-scoring/) |
