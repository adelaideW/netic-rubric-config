# Netic Rubric Configuration — Case Study

**Designer:** Adelaide Wang  
**Scope:** Lead call rubric configuration + scoring system  
**Deliverables:** [Scoring spec](docs/scoring-system.md) · [Figma spec](docs/figma-spec.md) · Interactive prototype

---

## 1. Problem & User

Netic's AI listens to inbound service calls and scores CXR (customer experience representative) performance against a rubric. The rubric is the contract between the manager and the AI — it defines what "good" looks like.

**User:** CXR Manager overseeing teams handling HVAC, plumbing, and pest control calls.

**Four questions they need answered:**
1. How is my team performing?
2. Where are we losing leads?
3. What are agents doing wrong on calls?
4. What do I need to coach my team on?

This project focuses on the **configuration experience** — how managers define the rubric and scoring rules that power those answers.

---

## 2. Scoring System

### Approach: Weighted section-aggregated score (0–100)

Each call is evaluated at the **attribute** level (Met / Partial / Not met), rolled up to **sections** (call stages), then combined into an **overall score** using manager-configurable weights.

```
Call score = Σ (section_score × section_weight)
```

**Why this model:**
- **Sections map to the call funnel** — managers diagnose lead loss by stage ("Verification is at 52%")
- **Weights are tunable** without rebuilding the rubric — emphasize verification over closing
- **Transparent math** — managers preview exactly how a sample call scores
- **AI-appropriate granularity** — binary + partial is more reliable than 1–5 scales

### Key rules

| Rule | Behavior |
|------|----------|
| Partial credit | 50% by default; toggle off for strict pass/fail |
| Required attribute | If Not met → section capped at 50% |
| Critical attribute | Counts 2× within section |
| Coaching threshold | Overall below 70 → flagged |
| Section flag | Section below 60 → highlighted on dashboard |

### Rejected alternatives

1. **Pure checklist pass rate** — treats all attributes equally; can't emphasize high-impact behaviors
2. **AI discretionary 0–100** — black box; managers can't tune or explain scores to agents

Full specification: [docs/scoring-system.md](docs/scoring-system.md)

---

## 3. Information Architecture & Flows

```
Rubric Hub → Editor (Attributes) → Scoring Rules → Score Preview → Publish
                    ↑                                      |
              Team Dashboard ←─────────────────────────────┘
```

### Flow A — First-time setup
Manager accepts Netic's default rubric, tweaks 1–2 attribute descriptions for their business, adjusts section weights, previews on a sample call, publishes.

### Flow B — Diagnose team problem
Manager sees Verification underperforming on dashboard → opens rubric → marks "Verify customer details" as Required → preview shows impact on weak calls → publishes.

Figma frame specs: [docs/figma-spec.md](docs/figma-spec.md)

---

## 4. Design Decisions & Tradeoffs

| Decision | Rationale | Tradeoff |
|----------|-----------|----------|
| Scoring in dedicated tab | Keeps attribute editor focused on AI evaluation specs | Extra click to adjust weights |
| Description as primary field | It's the AI prompt — most impactful config | Requires helper text for quality |
| Live score preview | Builds trust in opaque AI scoring | Needs sample calls bundled |
| Required cap at 50% | Strong signal without zeroing entire call | May feel harsh; preview mitigates |
| Light dashboard context | Shows downstream value without scope creep | Not a full analytics product |

### UX principles
- **Progressive disclosure** — attributes first, weights second
- **Guardrails** — weights auto-normalize to 100%; vague descriptions warned
- **B2B admin tone** — dense, utilitarian, data-forward

---

## 5. Out of Scope

- Non-lead call types
- CXR-facing score views
- Full coaching workflow
- Multi-rubric management
- Historical score recalculation
- High-fidelity visual polish

---

## 6. Prototype

Interactive prototype demonstrates:
- Edit attribute descriptions and Required/Critical flags
- Adjust section weights with live normalization
- Toggle partial credit and thresholds
- Switch between sample calls with instant score recalculation
- Navigate from dashboard weak section to rubric editor

```bash
cd "Vibe Coding Prototypes/netic-rubric-config"
npm install
npm run dev
# → http://127.0.0.1:5180
```

**Try this path:** Dashboard → "Edit scoring" on Verification → mark "Verify customer details" Required → Preview → switch to "weak verification" call → see section drop.

---

## 7. What I'd Explore Next

- Rubric versioning with diff view
- Per-attribute custom weights (power user)
- "Test with your own call" upload
- AI-suggested attribute descriptions from call transcripts
- Coaching queue auto-generated from threshold breaches
