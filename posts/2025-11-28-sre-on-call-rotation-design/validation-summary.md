# Validation Summary: Designing an SRE On-Call Rotation Without Burning Out Your Team

## Status
validated

## Post Type
Guide / Best-practices blueprint (process and operations oriented, with a quantitative capacity-math section)

## Technologies Covered
- On-call rotation models (follow-the-sun, week-on/week-off, pager shifts, hybrid)
- Incident response roles (Primary, Secondary, IMOD, Manager Escalation)
- OpenTelemetry (telemetry collection)
- OneUptime (alerting, SLO burn / anomaly alerts, paging)
- SLOs / SLO burn rate alerting
- Incident metrics: MTTA, MTTR, page volume
- Capacity / scheduling math (coverage hours)

## Sources Consulted
- Google SRE Book — "Being On-Call" chapter: https://sre.google/sre-book/being-on-call/
- Google SRE Workbook — "On-Call" practices: https://sre.google/workbook/on-call/
- Google SRE Book — "Service Level Objectives": https://sre.google/sre-book/service-level-objectives/
- OpenTelemetry documentation: https://opentelemetry.io/docs/
- Atlassian Incident Management — MTTA/MTTR definitions: https://www.atlassian.com/incident-management/kpis/common-metrics
- OneUptime documentation: https://oneuptime.com/docs

## Issues Found
- **Step 4 (Capacity & Schedule Math) — incorrect/inconsistent coverage math.** The original text read: "With 7 engineers, each covers 48 primary hours/week (~1 shift) + 48 secondary (overlap)." This is mathematically inconsistent with the figures stated just above it. The post correctly establishes 168 hours/week and 336 total on-call person-hours/week (primary + secondary). Dividing 336 by 7 engineers yields 48 *total* on-call hours per engineer per week, not 96 (48 primary + 48 secondary) — the original implied 7 × 96 = 672 person-hours, double the stated 336. Additionally, in a week-on/week-off model a single shift is 168 hours, so labeling 48 hours as "~1 shift" was incorrect. Fixed to: "that 336 hours averages to ~48 on-call hours/engineer/week (≈24 primary + 24 secondary)—roughly one full primary week every 7 weeks." This keeps the author's stated 168/336 figures consistent and accurately describes the averaged load across a 7-week cycle.

## Review Notes
- The remaining content is conceptual/operational guidance (design principles, role definitions, health reviews, continuous-improvement playbook) and aligns with established SRE practice (Google SRE Book/Workbook) — e.g., primary + secondary coverage, capping wake-up pages, post-incident retros, and noise-reduction backlogs.
- Technical tooling claims are accurate: OpenTelemetry is correctly described as a source of consistent telemetry, and MTTA/MTTR are standard incident KPIs. SLO burn-rate alerting is a valid, recommended alerting strategy.
- The "≤2 wake-up pages per engineer per week" target and "Follow-the-sun requires 3+ regions" are reasonable rules of thumb rather than hard specifications; left as-is since they are presented as guidance, not absolutes.
- No code, CLI commands, or configuration snippets are present to verify.
