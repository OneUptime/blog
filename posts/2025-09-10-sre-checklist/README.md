# The Ultimate SRE Reliability Checklist: From Chaos to Consistent Excellence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Site Reliability Engineering, SRE, Observability, Reliability, Incident Management, SLOs, Error Budgets, DevOps, Automation, Metrics, Postmortems

Description: A comprehensive, opinionated Site Reliability Engineering (SRE) checklist covering culture, SLOs, observability, alerting, incident response, change management, resilience engineering, cost, automation, and continuous learning—mapped for day-one adoption and long-term maturity.

A mature SRE practice isn’t a set of dashboards and a pager - it’s a system of intentional guardrails that reduce uncertainty, accelerate safe change, and turn every incident into compound learning.

This checklist gives you a structured, progressive view of what “good” looks like. Don’t treat it as a purity test. Treat it as:

- A roadmap: Where are we now? What’s next?
- A forcing function: Are practices consistent or tribal?
- A prioritization lens: Are we investing in reliability where it matters to users?

If you're still defining what SRE maturity looks like overall, read the companion post: [The Five Stages of SRE Maturity](https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view).

---
## How to Use This Checklist
Assign each item a maturity level:

- 0 = Not Applicable / Not Started
- 1 = Exists (ad‑hoc, inconsistent)
- 2 = Defined (documented, repeatable)
- 3 = Optimized (measured, automated, continuously improved)

Focus first on eliminating high-risk gaps that delay detection, slow mitigation, or hide systemic regressions.

---
## 1. Culture & Ownership
- Clear service ownership (every production service has a directly accountable team)
- Shared vocabulary for reliability metrics (MTTR, MTTD, SLOs, error budget) — see: [Understanding MTTR, MTTD, MTBF and more](https://oneuptime.com/blog/post/2025-09-04-what-is-mttr-mttd-mtbf-and-more/view)
- Error budget policy defines when to slow feature delivery
- Blameless postmortem ethos explicitly documented
- SRE principles included in onboarding
- Reliability goals visible (dashboards / internal wiki)
- Leadership reinforces reliability trade-offs (not just speed)

## 2. SLIs, SLOs & Error Budgets
- User-centric SLIs defined (availability, latency percentiles, correctness)
- Internal vs external SLO separation (buffer between SLO & SLA) — see: [What is SLA, SLI and SLO's?](https://oneuptime.com/blog/post/2023-06-12-sli-sla-slo/view)
- Error budgets calculated automatically every period
- Burn rate alerts (fast + slow window) configured
- SLO reviews part of quarterly planning
- SLOs influence prioritization (e.g., freeze on sustained high burn)
- Clear decision log when SLOs are re-baselined

## 3. Observability & Telemetry Hygiene
- Unified platform for metrics, logs, and traces — see: [Logs, Metrics & Traces: A Before and After Story](https://oneuptime.com/blog/post/2025-08-21-logs-traces-metrics-before-and-after/view)
- Golden signals instrumented: latency, traffic, errors, saturation
- High-cardinality controls (dimension limits, drop policies) — see: [How to reduce noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- Structured logging with correlation IDs — see: [How to Structure Logs Properly](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- Trace spans named consistently — see: [How to name spans in OpenTelemetry](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view)
- Metrics implement aggregation strategy (no unbounded label values)
- Dark reads / synthetic probes for critical user flows
- Retention tiers (hot vs cold telemetry) documented

## 4. Alerting & Signal Quality
- Only alert on things requiring action from a human
- SLO burn alerts (fast + 6/24h) separated from infrastructure noise
- No duplicate alerts for same failure mode
- Alert ownership mapped (no orphan pages)
- On-call load tracked (pages / engineer / week)
- Automatic suppression during planned maintenance
- Runbook link embedded in every alert

## 5. On‑Call & Incident Response
- Primary + secondary rotation (documented escalation policy)
- Paging platform health monitored (meta-alerting)
- Acknowledge SLA (e.g., < 5 min) tracked per incident
- ChatOps / incident channel auto-bootstrap
- Incident roles: Commander, Scribe, Comms defined
- Severity classification rubric published
- War room entry/exit criteria defined

## 6. Incident Lifecycle & Postmortems
- All Sev1/Sev2 incidents get postmortems within X days
- Standardized template — see: [Incident Postmortem Templates](https://oneuptime.com/blog/post/2025-09-09-effective-incident-postmortem-templates-ready-to-use-examples/view)
- Mitigation timestamp vs detection timestamp tracked (improve MTTD)
- Root cause phrased as systemic contributing factors (no blame)
- Action items have owners + due dates
- Recurring issue review (pattern detection)
- Learning summaries shared company-wide

## 7. Change & Release Engineering
- Deployment frequency measured
- Progressive delivery (canary / feature flags)
- Rollback < 1 command or button
- Pre-deploy health gates (tests, lint, vulnerability scan)
- Post-deploy automated smoke checks
- Change failure rate tracked (DORA)
- Freeze policy tied to error budget consumption

## 8. Resilience & Architecture
- Dependency graph documented (critical upstream services)
- Bulkheads / circuit breakers around external dependencies
- Timeouts and retries tuned (no unbounded retries)
- Graceful degradation patterns defined (read-only mode, cache serve stale)
- Backpressure mechanisms (queue limits, shed load)
- Chaos / fault injection in non-prod (or prod with guardrails)
- Blast radius analysis for each critical component

## 9. Capacity & Performance
- Auto-scaling policies tested under load
- Capacity models for peak events (seasonal / launch / marketing spikes)
- Profiling in place for CPU / memory hotspots — see: [Basics of profiling](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
- Performance SLOs (latency percentiles) tracked alongside availability
- Queues / thread pools / connection pools sized intentionally
- Load test scenarios reflect real traffic mix
- Exhaustion drills (simulate resource limits)

## 10. Security × Reliability Overlap
- Secrets rotation automated
- Dependency vulnerability scanning integrated into CI
- Least-privilege IAM enforcement (no wildcard in prod roles)
- DDoS / rate limit policies tuned & tested
- Incident channel integrates with security team for cross-cutting events
- Audit log integrity monitored

## 11. Automation & Tooling
- Self-healing scripts for known failure classes
- Automatic ticket creation for repeating anomalies
- One-click / CLI scaffolding for new services (observability baked in)
- Runbook drift detection (links checked automatically)
- ChatOps for deploy, status updates, on-call handoff
- Config changes reviewed same as code

## 12. Cost & Telemetry Efficiency
- Cost per signal type (trace, metric, log) monitored
- High-cardinality detection & pruning pipeline — see: [Noise reduction guide](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- Cold storage migration policy (beyond X days)
- Error / warn log ratio tracked (noise health)
- Budget alerts for sudden ingest spikes

## 13. Governance & Continuous Improvement
- Quarterly reliability review (SLOs, incidents, trends)
- MTTD / MTTR tracked and improved with explicit experiments
- Top 3 systemic risks listed & owned
- Reliability OKRs tied to user/business outcomes (not vanity)
- Tooling consolidation review annually

## 14. Maturity Snapshot Table (Example)
| Domain | Current | Target | Next Action |
|--------|---------|--------|-------------|
| SLOs | 1 | 2 | Define latency SLO & burn alerts |
| Alerting | 2 | 3 | Remove duplicate CPU/noise alerts |
| Incidents | 1 | 2 | Formalize commander / scribe roles |
| Deploys | 2 | 3 | Add automated rollback verification |
| Resilience | 0 | 2 | Implement timeouts + circuit breakers |

---
## Common Failure Smells (Kill These Early)
- Pages with no attached runbook
- 2+ tools giving conflicting status for same service
- Postmortems that list “human error” as root cause
- Feature flag platform outages blocking emergency rollback
- Unbounded fan-out retries amplifying partial outages
- Dashboards nobody looks at except during outages
- SLOs defined but never used to make a decision

## Sequencing Guidance (First 30–90 Days)
1. Stabilize alert noise (reduce pager fatigue)
2. Define core SLIs & error budget policy
3. Standardize incident response (roles + template)
4. Ensure deploys are reversible in < 5 minutes
5. Add structured logging + trace correlation
6. Implement burn rate + availability SLO alerting
7. Introduce progressive delivery & dependency timeouts

## Tooling Principles
- One authoritative timeline per incident
- Instrument before you optimize
- Prefer fewer high-quality signals over many low-value metrics
- Make reliability frictionless (defaults > heroics)

## Conclusion

Reliability maturity compounds. The earlier you institutionalize learning loops (SLO reviews, postmortems, proactive chaos, telemetry hygiene), the faster every additional control you add produces outsized stability and velocity gains.

Start small. Eliminate toil. Automate propagation of best practices. And anchor everything to user impact—not internal comfort metrics.

If you want a platform that bakes in SLOs, error budgets, incident timelines, structured logging, and correlation out of the box—OneUptime exists to accelerate exactly this journey.

Revisit this checklist quarterly. Your future self (and your sleep schedule) will thank you.
