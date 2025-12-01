# 12 SRE Best Practices That Actually Move the Needle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, SRE, Best Practices, Reliability, Observability, Automation, OpenTelemetry

Description: A prioritized list of SRE practices that deliver outsized reliability gains, with concrete steps and tools to help you start today.

---

## How to Use This List

Don’t treat this as a bingo card. Pick the top reliability pain, implement the corresponding practice, measure the outcome, then move on. Each practice compounds when powered by clean telemetry and a unified platform such as OneUptime.

## 1. Define Two User-Centric SLOs per Service

- Focus on availability + latency for the most valuable journey.
- Feed SLIs from OpenTelemetry traces/metrics so they reflect real user experience.
- Review quarterly; adjust only when user expectations change.

## 2. Publish an Error Budget Policy

- Document what happens when the budget burns (freeze deploys, add guardrails, swarm toil).
- Automate burn-rate alerts (1h + 6h windows) inside OneUptime so engineers see impending risk early.

## 3. Instrument First, Then Optimize

- Make instrumentation a definition-of-done checklist item.
- Use OpenTelemetry auto-instrumentation libraries and collector pipelines for consistent spans, logs, and metrics.

## 4. Guard On-Call with High-Signal Alerts

- Alerts must map to either user impact or trend toward impact.
- Tie each alert to a runbook link; delete anything without an owner or action.
- Track page volume per person to spot burnout.

## 5. Automate Incident Lifecycles

- Auto-create Slack/Teams channels, role assignments, and status-page updates from OneUptime.
- Keep a single timeline that later seeds the postmortem.

## 6. Run Blameless Postmortems with Action SLAs

- Focus on system gaps (missing guardrail, poor test) instead of human error.
- Log actions in a ticket queue, track closure, and report overdue fixes.

## 7. Make Rollback a One-Command Operation

- Progressive delivery (canary, blue/green) plus fast revert scripts reduce MTTR dramatically.
- Practice rollbacks monthly to keep playbooks sharp.

## 8. Limit Toil to 50% of SRE Capacity

- Track repetitive manual tasks (manual deploys, log scraping, permission changes).
- For each, write an elimination plan: automate, delegate, or delete the need entirely.

## 9. Map Dependencies and Failure Modes

- Generate service maps from OpenTelemetry traces to understand blast radius.
- Rank dependencies by RTO/RPO sensitivity and plan mitigations.

## 10. Inject Failure in Lower Environments

- Chaos experiments expose configuration drift and missing safeguards.
- Start with controlled scenarios (kill pods, inject latency) before moving to prod.

## 11. Connect Cost to Telemetry Volume

- Track per-signal cost (metrics, logs, traces) and cardinality limits.
- OneUptime’s usage reports plus OpenTelemetry sampling keep spend predictable.

## 12. Share Reliability Roadmaps Widely

- Publish quarterly reliability goals alongside feature OKRs so stakeholders understand trade-offs.
- Celebrate debt pay-downs with the same visibility as feature launches.

## Final Takeaway

SRE maturity isn’t about how many dashboards exist; it’s about how intentionally you balance speed and safety. Instrument everything, automate the boring, and make every alert, runbook, and policy ladder up to user happiness.
