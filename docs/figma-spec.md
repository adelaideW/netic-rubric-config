# Figma Deliverable Spec — Netic Rubric Configuration

Mid-fidelity frames for the 48-hour case study. Grayscale + single accent (`#2563EB`).

---

## File Structure

| Page | Contents |
|------|----------|
| **1 · Narrative** | Problem statement, scoring model diagram, IA map |
| **2 · Flows** | Flow A (first-time setup), Flow B (diagnose team problem) |
| **3 · Screens** | Frames 1–9 |
| **4 · Components** | Reusable mid-fi kit |

---

## Component Kit

### SectionCard
- 280×72px
- Left: section name (14px semibold), attribute count (12px muted)
- Right: weight badge (`25%`), chevron
- States: default, selected (left border accent 3px), hover (bg `#F8FAFC`)

### AttributeRow
- Full width × 56px
- Columns: drag handle · name · Required badge · Critical badge · chevron
- Selected state opens detail panel

### WeightSlider
- Label + value (`30%`)
- Track 200px, thumb 16px
- Helper: "All sections must total 100%" with live sum indicator

### ScoreBreakdown
- Overall score circle (64px, large number)
- Section bars: name · bar · score · weight contribution
- Attribute rows nested under expanded section

### EvalBadge
- Pill 20px height
- Pass: green bg `#DCFCE7`, text `#166534`
- Partial: amber bg `#FEF3C7`, text `#92400E`
- Fail: red bg `#FEE2E2`, text `#991B1B`

### AppShell
- Left sidebar 220px: Netic wordmark, nav items (Rubrics, Team performance)
- Top bar: breadcrumb, Publish button (primary), unsaved dot

---

## Information Architecture

```
Rubric Hub
├── Lead calls rubric [active]
└── + Duplicate rubric (disabled v1)

Rubric Editor
├── Section list (left panel)
├── Attribute list (center)
└── Attribute detail (right drawer)

Scoring Rules (tab)
├── Section weights
├── Partial credit toggle
└── Threshold inputs

Score Preview (tab)
├── Sample call selector
├── Transcript excerpt
└── Live breakdown

Team Performance (context)
├── Section score chart
└── Agent drill-down
```

---

## Flow A — First-Time Setup

1. **Hub** → Manager sees "Lead calls" default rubric, last edited "Netic template"
2. **Editor** → Scans 4 sections; selects "Verification"
3. **Attribute detail** → Edits "Verify membership" description to "HomeShield plan"
4. **Scoring** → Bumps Verification to 35%, lowers Closing to 10%
5. **Preview** → Runs sample call "AC repair — strong call" → score 87
6. **Publish** → Confirm modal → "Applies to all future lead calls"

**Annotation (Frame 2):** "Section list mirrors call stages — managers think in funnel order, not alphabetical."

**Annotation (Frame 5):** "Weights live in dedicated tab to avoid overwhelming the attribute editor."

---

## Flow B — Diagnose Team Problem

1. **Dashboard** → Verification section avg 52% (red flag)
2. **Click "Edit rubric"** → Lands in Editor, Verification selected
3. **Mark "Verify customer details" as Required**
4. **Preview** → Switch to "Weak verification" sample → section drops to 38%
5. **Publish** → Dashboard will reflect on future calls

**Annotation (Frame 8):** "Section breakdown answers 'where are we losing leads' — dotted line links to rubric editor."

---

## Screen Frames

### Frame 1 — Rubric Hub
- Table: Name · Call type · Attributes · Last updated · Status
- Row: "Lead calls" · Lead · 11 · "Netic template" · Active
- CTA: "Edit rubric" (primary)

**Annotations:**
- "Single rubric for v1 — multi-rubric is future scope"
- "Call type badge clarifies lead vs non-lead scope"

### Frame 2 — Editor Overview
- Left: 4 section cards, "Verification" selected
- Center: 3 attribute rows for Verification
- Top tabs: Attributes · Scoring · Preview

**Annotations:**
- "Progressive disclosure — scoring not inline on every row"
- "Attribute count per section visible at a glance"

### Frame 3 — Attribute Detail (right drawer)
- Fields: Name, Description (textarea, 4 rows)
- Toggles: Required, Critical
- Helper: "Describe observable behavior, not intent."
- Example chip: "Asked for name, address, email, and callback number"

**Annotations:**
- "Description IS the AI evaluation spec — most important field"
- "Required = knockout cap; Critical = 2× weight"

### Frame 4 — Add Attribute (modal)
- Section dropdown (pre-filled)
- Name input
- Description textarea
- Warning if description < 20 chars: "Vague descriptions reduce scoring accuracy"

### Frame 5 — Scoring Rules
- 4 weight sliders with live sum (must = 100%)
- Toggle: "Allow partial credit (50%)"
- Inputs: Coaching threshold (70), Section flag threshold (60)
- Mini preview: "Sample call would score: 72"

**Annotations:**
- "Auto-normalize other weights when one changes"
- "Thresholds connect config to downstream coaching queues"

### Frame 6 — Score Preview
- Left: Sample call dropdown (2 options)
- Center: Transcript excerpt with highlighted moments
- Right: ScoreBreakdown component, expanded Verification

**Annotations:**
- "Live recalculation — any config change updates preview"
- "Transcript grounds abstract scores in real conversation"

### Frame 7 — Publish Confirmation
- Modal: "Publish rubric changes?"
- Copy: "Applies to all future lead calls. Past scores are not recalculated."
- Buttons: Cancel · Publish

### Frame 8 — Team Performance (context)
- Bar chart: avg section score by section (team aggregate)
- Verification bar red (< 60)
- Link: "Edit scoring for Verification →"

### Frame 9 — Agent Drill-Down (context)
- Table: Agent · Last 5 calls · Avg score · Weak section
- Row: "Maria G." · 68% · Verification
- Click row → call list (out of scope, indicated by dashed outline)

---

## Visual Tokens

| Token | Value |
|-------|-------|
| Background | `#FFFFFF` |
| Surface | `#F8FAFC` |
| Border | `#E2E8F0` |
| Text primary | `#0F172A` |
| Text muted | `#64748B` |
| Accent | `#2563EB` |
| Font | Inter or system sans |
| Radius | 8px cards, 6px inputs, 999px badges |

---

## Prototype Link

Interactive version: deploy from `Vibe Coding Prototypes/netic-rubric-config/` — mirrors frames 1–9 with live scoring math.
