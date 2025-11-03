# The Ultimate SRE Reliability Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, SRE, Reliability, SLOs, Error Budgets, Observability, Incident Management, Automation, DevOps, Operations

Description: A practical, progressive SRE checklist you can actually implement. Plain explanations. Focus on user impact. Start small, mature deliberately.

If you’re also defining overall maturity, see: [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view).

---

## Ultra‑Short Summary (If You Read Nothing Else)

1. Make someone clearly own each service.  
2. Define a small set of user-facing SLOs (latency + availability).  
3. Alert only on real user impact (burn rate, not CPU noise).  
4. Standardize incident process (roles, severity, timeline).  
5. Make rollback fast and boring.  
6. Correlate logs, traces, metrics (shared IDs).  
7. Use dual-window SLO burn alerts.  
8. Add timeouts, retries (with backoff), and circuit breakers.  
9. Run postmortems that fix systems, not blame people.  
10. Revisit quarterly: what improved, what still hurts?

---

## Why This Checklist Exists

A mature reliability practice isn’t “we have dashboards + alerts.” It’s:  
- Clear ownership  
- Reality-based measures (SLOs)  
- High-signal telemetry  
- Few, meaningful alerts  
- A calm, reliable incident process  
- A habit of learning + improving  
- Guardrails that **prevent** chaos instead of heroically reacting to it

Think of each section as a “control surface” you gradually harden.

---

## How to Use It

Assign a maturity level to each item (keep it simple):
- 0 = Not started
- 1 = Exists but ad‑hoc
- 2 = Defined and repeatable
- 3 = Automated / measured / continuously improved

Workflow per item: Assess → Prioritize → Implement → Measure → Revisit.  
Don’t try to do everything at once. Sequence (first calm alerting → then SLOs → then incident discipline → then resilience → then cost efficiency).

---

## Fast Print-Friendly Checklist

(Use this for workshops. See detailed explanations below.)

### 1. Culture & Ownership
Service Ownership Registry | Glossary | Error Budget Policy | Blameless Ethos | SRE Onboarding | Visible Reliability Goals | Leadership Trade‑offs | Production Readiness Gate | Reliability Champions

### 2. SLIs / SLOs / Error Budgets
User Journey SLIs | SLO vs SLA Buffer | Automated Budget Tracking | Dual Burn Rate Alerts | Quarterly Review | Roadmap Linkage | SLO Changelog | Tail Latency Focus | Spend Forecasting

### 3. Observability
Unified Platform | Golden Signals | High Cardinality Limits | Structured Logs + Correlation IDs | Consistent Span Naming | Metrics Hygiene | Synthetic Probes | Tiered Retention | PII Redaction | Maturity Scorecard

### 4. Alerting
Only Actionable | SLO-Centric Tier | Failure Mode Dedup | Rule Ownership | On‑Call Load Metrics | Maintenance Suppression | Runbook Links | Quality Review | Multi-Signal Correlation

### 5. On‑Call & Incidents
Two-Level Rotations | Paging System Health | Ack SLA Tracking | Auto Incident Channel | Defined Roles | Severity Matrix | War Room Rules | Readiness Path | Psychological Safety Check

### 6. Incident Lifecycle
Postmortem SLA | Standard Template | Detection vs Mitigation Metrics | Systemic Root Causes | Action Accountability | Recurrence Analysis | Knowledge Sharing | Remediation Follow-up

### 7. Change & Release
Deploy Frequency Tracking | Progressive Delivery | Fast Rollback | Pre-Deploy Gates | Post-Deploy Smoke Tests | Change Failure Rate | Error-Budget Freeze | Config as Code | Deployment Health Score

### 8. Resilience & Architecture
Dependency Map | Circuit Breakers | Tuned Timeouts & Retries | Graceful Degradation | Backpressure & Load Shedding | Fault Injection | Blast Radius Analysis | State Classification | Multi-Region (if needed)

### 9. Capacity & Performance
Auto-Scaling Validation | Peak Planning | Continuous Profiling | Latency SLOs | Pool Sizing | Realistic Load Shapes | Exhaustion Drills | Early Capacity Indicators

### 10. Security × Reliability
Secrets Rotation | Dependency Scanning | Least Privilege Reviews | DDoS / Rate Limits | Joint SecOps Flow | Audit Log Integrity | Secret Leak Detection

### 11. Automation & Tooling
Self-Healing Scripts | Auto Tickets for Recurrent Issues | Service Scaffolds | Runbook Drift Detection | ChatOps Integration | Config-as-Code Review | Instrumentation by Default

### 12. Cost & Telemetry Efficiency
Per-Signal Cost | High Cardinality Watch | Storage Lifecycle | Log Level Hygiene | Ingest Spike Alerts | Cost per SLO

### 13. Governance & Improvement
Quarterly Reliability Review | MTTR/MTTD Experiments | Top 3 Risks Register | Outcome-Aligned OKRs | Tooling Consolidation | Reliability KPI Dashboard

---

## Detailed Sections (Plain Explanations)

### 1. Culture & Ownership

**Service Ownership Registry**  
What: Every production service lists exactly one owning team.  
Why: No guesswork during incidents.  
Do: Catalog → review quarterly → tag in repos / CI metadata.

**Shared Reliability Glossary**  
What: A short doc defining SLO, SLA, MTTR, etc.  
Why: Prevents mismatched conversations.  
Do: Publish + link from dashboards and postmortems.

**Error Budget Policy**  
What: Rules for what happens when reliability degrades (slow releases? freeze?).  
Why: Aligns speed vs stability consciously.  
Do: Define thresholds + auto-alert.

**Blameless Ethos**  
What: No public shaming; focus on systemic improvements.  
Why: Encourages honest timelines and faster fixes.  
Do: Publish principles, train facilitators.

**SRE Onboarding Module**  
What: A lightweight course on how “we do reliability here.”  
Why: Reduces tribal knowledge risk.

**Visibility of Reliability Goals**  
What: SLOs + burn health appear where leadership and engineers look daily.  
Why: Drives proactive decisions.

**Leadership Trade-off Narration**  
What: Leaders explicitly talk through “we chose X reliability over Y speed.”  
Why: Normalizes discipline.

**Production Readiness Gate**  
What: Checklist before first prod deploy (logging baseline, rollback path, SLO draft, runbook).  
Why: Avoids inheriting unmanageable risk.

**Reliability Champions Network**  
What: One rep per team advocating patterns.  
Why: Scales adoption without central bottleneck.

---

### 2. SLIs, SLOs & Error Budgets

Keep it lean to start: 2–3 user journeys, each with availability + latency.

**User Journey SLIs**: Real user flows (login, purchase) not raw host stats.  
**SLO vs SLA Buffer**: Internal SLO stricter than contractual SLA.  
**Automated Budget Tracking**: No spreadsheets; platform surfaces remaining % + burn velocity.  
**Dual-Window Burn Rate Alerts**: Use two SLO burn rate evaluations- a short window (~1h) to catch sudden spikes and a longer window (6–24h) to spot slow budget leakage- so you detect both fast failures and quiet degradation without excess paging.
**Quarterly SLO Review**: Adjust only with justification (not to “look green”).  
**Roadmap Influence**: Breached budget → triggers backlog reshuffle / freeze rules.  
**SLO Changelog**: Version changes; helps post-incident context.  
**Latency Distribution Hygiene**: Track P50/P95/P99; avoid averages hiding tail pain.  
**Forecasting**: Project exhaustion date early (line fit or regression).

---

### 3. Observability & Telemetry

Goal: Fewer pivot steps from “alert” to “probable cause.”

**Unified Platform**: Traces, logs, metrics, events discoverable together.  Use OpenTelemetry with a platform like OneUptime (https://oneuptime.com)
**Golden Signals**: Latency, traffic, errors, saturation for each service template.  
**High Cardinality Guardrails**: Prevent label explosions (cost + query slowness).  
**Structured Logs + Correlation IDs**: Standard request ID flows through all tiers.  
**Span Naming Consistency**: Pattern like `service.operation.resource`.  
**Metrics Hygiene**: Use histograms, limit freeform labels.  
**Synthetic Probes**: Critical flows tested continuously- feed into SLOs if representative.  
**Tiered Retention**: Hot (fast query) vs warm vs cold archival; saves cost.  
**PII Redaction**: Avoid leaking user data into logs.  
**Maturity Scorecard**: Track improvements; fuels budget conversations.

---

### 4. Alerting & Signal Quality

Aim: Every page → a decision or action. Nothing else.

**Actionable-Only**: Purge noise first.  
**SLO-Centric Tier**: SLO burn alerts are highest priority.  
**Failure Mode Dedup**: Group related alerts to reduce page storms.  
**Rule Ownership**: Each rule has a team owner & review date.  
**On‑Call Load Metrics**: Watch trends (pages per shift, sleep interruptions).  
**Maintenance Suppression**: Auto-silence during known windows.  
**Runbook Links**: Each alert: why firing, what to check first.  
**Quality Reviews**: Monthly: add vs removed ratio; justify noisy survivors.  
**Multi-Signal Correlation**: Enrich with deploy events or anomaly clusters.

---

### 5. On‑Call & Incident Response

**Two-Level Rotation**: Primary + secondary (resilience + mentorship).  
**Paging System Health**: Monitor the monitor (heartbeats).  
**Ack SLA Tracking**: Time from fire → acknowledgment. Detect overload.  
**Auto Incident Channel**: Bot creates channel, pins runbook, collects timeline.  
**Defined Roles**: Commander (decisions), Comms (stakeholders), Scribe (timeline).  
**Severity Matrix**: Impact-based; remove ambiguity in escalation.  
**War Room Criteria**: Only spin up for high severity; define exit conditions.  
**Readiness Path**: Shadow → co-pilot → primary; reduces anxiety.  
**Psych Safety Pulse**: Short survey after big incidents to catch burnout risk.

---

### 6. Incident Lifecycle & Postmortems

**Postmortem SLA**: Draft due within fixed days (e.g., 5 business days).  
**Template**: Standard sections → pattern spotting easier.  
**Detection vs Mitigation Metrics**: Break timeline into phases; target worst lag.  
**Systemic Causes Focus**: Avoid “human error” as a terminal label.  
**Action Accountability**: Every remediation ticket tracked to closure rate.  
**Recurrence Analysis**: Tag incidents; cluster quarterly.  
**Knowledge Sharing**: Summaries in all‑hands / newsletter.  
**Remediation Effectiveness**: Verify fix actually prevented recurrence.

---

### 7. Change & Release Engineering

**Deploy Frequency Tracking**: Correlate stability vs speed.  
**Progressive Delivery**: Canary / feature flags to shrink blast radius.  
**Fast Rollback**: One command/script; drill it.  
**Pre-Deploy Gates**: Tests + security + config validation.  
**Post-Deploy Smoke Tests**: Auto-run; rollback if fail.  
**Change Failure Rate**: % of changes needing rollback/hotfix.  
**Error Budget Freeze**: Budget spent? Auto-block risky changes.  
**Config as Code**: Reviewable diffs, no mystery toggles.  
**Deployment Health Score**: Quick pass/fail composite after each release.

---

### 8. Resilience & Architecture

**Dependency Map**: Generated from traces; reveals blast radius.  
**Circuit Breakers & Bulkheads**: Contain failures.  
**Timeouts & Retries (with backoff + jitter)**: Avoid storms.  
**Graceful Degradation**: Serve stale cache / limited mode instead of full outage.  
**Backpressure & Load Shedding**: Reject early to protect critical paths.  
**Fault Injection**: Practice failures before they find you.  
**Blast Radius Analysis**: Document worst-case; rank mitigation priority.  
**State Classification**: Durable vs ephemeral vs derivable → guides replication.  
**Multi-Region (If Justified)**: Tie to real RPO/RTO goals; test failover.

---

### 9. Capacity & Performance

**Auto-Scaling Validation**: Simulate load, tune thresholds.  
**Peak Planning**: Plan launches, seasonal surges.  
**Continuous Profiling**: Catch slow drift.  
**Latency SLOs**: Tail users matter (P95/P99).  
**Resource Pool Tuning**: Thread/connection pools based on measured load.  
**Realistic Load Shapes**: Bursts + variance, not flat lines.  
**Resource Exhaustion Drills**: Memory / file descriptors / disk; verify alerts.  
**Early Indicators**: Queue depth, GC pauses, saturation trending.

---

### 10. Security × Reliability

Security events are also availability threats.

**Secrets Rotation**: Automated schedule.  
**Dependency Scanning**: Block high severity during CI.  
**Least Privilege Reviews**: Quarterly rights reduction.  
**DDoS / Rate Limits**: Protect upstream capacity.  
**Joint Incident Path**: Security triggers auto-notify reliability + security.  
**Audit Log Integrity**: Tamper-resistant storage.  
**Secret Leak Detection**: Scan repos/log streams.

---

### 11. Automation & Tooling

**Self-Healing Playbooks**: Script frequent known fixes with guardrails.  
**Auto Ticket Creation**: Repeating anomalies → tracked work, not noise.  
**Service Scaffolds**: New service starts instrumented, tested, logged.  
**Runbook Drift Detection**: Flag outdated or broken links.  
**ChatOps Integration**: Deploys + incident commands in-channel.  
**Config-as-Code Review**: Same rigor as code changes.  
**Observability by Default**: Templates enforce logging/tracing from day one.

---

### 12. Cost & Telemetry Efficiency

**Per-Signal Cost Attribution**: Know which signals you pay most for.  
**High Cardinality Watch**: Alert on explosion before cost hits invoice.  
**Lifecycle Storage**: Hot vs warm vs cold retention policy.  
**Log Level Hygiene**: Track error:warn ratio; both inflation and silence are smells.  
**Ingest Spike Alerts**: Sudden telemetry shifts may hide latent defects.  
**Cost per SLO**: Are we overspending for marginal user value?

---

### 13. Governance & Continuous Improvement

**Quarterly Reliability Business Review**: Tie reliability to revenue / churn / productivity.  
**MTTD / MTTR Experiments**: Hypothesize → change → measure.  
**Top 3 Risks Register**: Focus finite engineering energy.  
**Outcome-Aligned OKRs**: Goals tied to user impact, not vanity uptime.  
**Tooling Consolidation Audit**: Reduce overlapping tools yearly.  
**Reliability KPI Dashboard**: Single source (burn rate, incidents, toil hours, change failure rate, cost).

---

## Example Maturity Snapshot

| Domain | Current | Target | Next Action |
|--------|---------|--------|-------------|
| SLOs | 1 | 2 | Define latency SLO + dual burn alerts |
| Alerting | 2 | 3 | Remove duplicate CPU alerts + add runbook links |
| Incidents | 1 | 2 | Formalize commander/scribe roles |
| Deploys | 2 | 3 | Add automated rollback smoke test |
| Resilience | 0 | 2 | Implement timeouts + circuit breakers |

---

## Tooling Principles

- Use one tool for the entire SRE pipeline -> Monitoring / Telemetry -> Incident Management -> Status Page Communication and more. OneUptime (https://oneuptime.com) can help you here.
- One authoritative incident timeline  
- Instrument first; optimize second  
- Fewer, higher-quality signals beat noisy sprawl  
- Defaults > Heroics (bake good patterns into scaffolds)

---

## Minimal Starter Checklist (10 Items)

If you need the smallest viable nucleus:
1. Service ownership list
2. Two user journey SLOs (availability + latency)
3. Dual-window burn rate alert
4. Runbooks linked in every alert
5. Incident roles + severity matrix
6. Fast rollback script
7. Structured logging + correlation IDs
8. Timeouts & exponential backoff
9. Postmortem template (ban “human error”)
10. Quarterly reliability review

Do those well before expanding.

---

## Conclusion

Reliability maturity compounds: each practice reduces future chaos tax. Keep momentum by:
- Reviewing SLOs honestly
- Running real postmortems
- Practicing failure safely
- Automating the boring edges
- Measuring improvement, not just status

Anchor everything in user impact. Your future on-call self will sleep better.

If you want a platform that unifies SLOs, error budgets, incidents, logging, tracing, and correlation- OneUptime accelerates exactly this journey.

Revisit the checklist quarterly. Trim, refine, automate.

Sleep well.

---