# Designing an SRE On-Call Rotation Without Burning Out Your Team

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, On-Call, Incident Response, Culture, Automation

Description: A blueprint for creating humane, effective SRE on-call rotations—covering staffing models, scheduling math, tooling, and continuous improvement tips.

---

## Design Principles

1. **Predictability beats heroics.** Publish schedules 6+ weeks ahead.
2. **Primary + secondary coverage.** Pager duty should never rest on one person.
3. **Low noise, high context.** SLO-driven alerts via OneUptime ensure folks wake up only for real user pain.
4. **Rotation health is a metric.** Track page volume, sleep disruption, and time-off debt.

---

## Step 1: Pick a Rotation Model

| Model | Best For | Notes |
|-------|----------|-------|
| **Follow-the-sun** | Global teams, 24/7 critical services | Requires 3+ regions; minimal sleep disruption |
| **Week-on / Week-off** | Mid-size teams (6–8 engineers) | Pair with secondary to prevent isolation |
| **Pager shifts (8-12h)** | Smaller teams with flexible schedules | Hand-off fatigue rises; use strict checklists |
| **Hybrid** | Split by service criticality | Example: primary for critical services, best-effort for internal tools |

Aim for 6–8 engineers per high-severity rotation. Smaller? Limit coverage to business hours and negotiate managed services for after-hours.

---

## Step 2: Assign Roles per Shift

- **Primary:** Responds within 5 minutes, leads triage.
- **Secondary:** Backs up primary, takes over if incident >1h.
- **Incident Manager On-Duty (IMOD):** Optional rotating leadership for Sev-1.
- **Manager Escalation:** Available but not paged unless policy requires.

Document responsibilities in the runbook so hand-offs are crisp.

---

## Step 3: Tooling & Alerts

- Use OpenTelemetry to produce consistent telemetry; surface SLO burn and anomaly alerts inside OneUptime.
- Integrate paging (SMS, phone, Slack) with acknowledgment tracking.
- Attach runbooks, dashboards, and recent deploy context to every alert payload.
- Auto-mute known maintenance windows.

---

## Step 4: Capacity & Schedule Math

1. **Load target:** ≤2 wake-up pages per engineer per week.
2. **Coverage math:**
   - Hours per week: 168.
   - With primary + secondary, you need 336 on-call hours.
   - With 7 engineers, each covers 48 primary hours/week (~1 shift) + 48 secondary (overlap). Adjust as teams grow.
3. **Time off:** Guarantee a cooldown day after a week-long rotation; comp time within the same month.

---

## Step 5: Health Reviews

- Track metrics: page count, MTTA, MTTR, post-incident survey (1–5 stress score).
- Hold a monthly on-call retro. Agenda: what hurt, what helped, what automation shipped.
- Replace engineers who carry pager too often; rotate in SWE partners to keep empathy high.

---

## Step 6: Continuous Improvement Playbook

1. **Noise reduction backlog:** Every week, pick one noisy alert and fix/retire it.
2. **Runbook freshness:** Auto-flag runbooks untouched for 90 days.
3. **Shadowing program:** New engineers: 1 week shadow, 1 week co-pilot, then solo.
4. **Chaos and drill days:** Simulate incidents during business hours to keep muscle memory fresh.

---

## Example Schedule (Week-On Model)

| Week | Primary | Secondary | Notes |
|------|---------|-----------|-------|
| W1 | Alex | Priya | Alex takes cooldown Monday W2 |
| W2 | Priya | Mateo | Priya comp day following Monday |
| W3 | Mateo | Lina | ... |

Publish as a calendar feed; sync with PTO tracker to prevent gaps.

---

## When to Split Rotations

- Persistent pager load > 10 alerts/week.
- Different services require different expertise (e.g., platform vs product).
- Global customers now expect 24/7 <15 min response.

Spin out a new rotation with dedicated runbooks, SLOs, and training rather than stretching the existing one.

---

## Closing Thoughts

Great on-call design makes reliability everyone’s job *and* keeps engineers rested. Let your data (OpenTelemetry + OneUptime) tell you when the pager is too loud, automate relentlessly, and treat on-call health as a first-class KPI.
