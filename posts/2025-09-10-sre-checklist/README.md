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

For each item, use the sub-actions to guide implementation:
- **Assess**: Evaluate current state against the description.
- **Plan**: Identify specific steps and owners.
- **Execute**: Implement changes with timelines.
- **Measure**: Track progress and impact.

---
## 1. Culture & Ownership
- Clear service ownership (every production service has a directly accountable team)
  - **Action**: Create a service catalog (e.g., in Confluence or GitHub Wiki) listing all production services, their owners, and contact info.
  - **Action**: Schedule quarterly reviews to update ownership as teams change.
  - **Action**: Integrate ownership into CI/CD pipelines for automated notifications.
- Shared vocabulary for reliability metrics (MTTR, MTTD, SLOs, error budget) — see: [Understanding MTTR, MTTD, MTBF and more](https://oneuptime.com/blog/post/2025-09-04-what-is-mttr-mttd-mtbf-and-more/view)
  - **Action**: Host a workshop to define and document key terms.
  - **Action**: Add a glossary page to internal docs and reference it in all reliability discussions.
- Error budget policy defines when to slow feature delivery
  - **Action**: Define thresholds (e.g., if error budget < 20%, halt non-critical deploys).
  - **Action**: Automate alerts when thresholds are breached.
  - **Action**: Communicate policy to all teams and include in sprint planning.
- Blameless postmortem ethos explicitly documented
  - **Action**: Write a company policy on blameless culture and share in onboarding.
  - **Action**: Train facilitators on leading blameless postmortems.
- SRE principles included in onboarding
  - **Action**: Add a module to new hire orientation covering SRE basics.
  - **Action**: Require new engineers to attend an SRE 101 session.
- Reliability goals visible (dashboards / internal wiki)
  - **Action**: Build a public dashboard showing SLO status and error budgets.
  - **Action**: Update wiki with current reliability targets and progress.
- Leadership reinforces reliability trade-offs (not just speed)
  - **Action**: Include reliability metrics in leadership reviews and OKRs.
  - **Action**: Encourage leaders to discuss trade-offs in all-hands meetings.

## 2. SLIs, SLOs & Error Budgets
- User-centric SLIs defined (availability, latency percentiles, correctness)
  - **Action**: Identify top user journeys and define SLIs for each (e.g., 99.9% availability for login).
  - **Action**: Instrument code to collect these metrics using tools like Prometheus or OpenTelemetry.
  - **Action**: Validate SLIs against user feedback quarterly.
- Internal vs external SLO separation (buffer between SLO & SLA) — see: [What is SLA, SLI and SLO's?](https://oneuptime.com/blog/post/2023-06-12-sli-sla-slo/view)
  - **Action**: Set internal SLOs 10-20% stricter than external SLAs.
  - **Action**: Document the rationale for buffers in service docs.
- Error budgets calculated automatically every period
  - **Action**: Use a tool like OneUptime to automate error budget calculations.
  - **Action**: Set up dashboards to visualize budget consumption.
- Burn rate alerts (fast + slow window) configured
  - **Action**: Configure alerts for 2x burn rate in 1 hour and 1x in 6 hours.
  - **Action**: Test alerts with synthetic data.
- SLO reviews part of quarterly planning
  - **Action**: Add SLO review agenda item to quarterly planning meetings.
  - **Action**: Track decisions made from SLO data.
- SLOs influence prioritization (e.g., freeze on sustained high burn)
  - **Action**: Integrate SLO status into project management tools (e.g., Jira labels).
  - **Action**: Automate feature freezes when error budget is low.
- Clear decision log when SLOs are re-baselined
  - **Action**: Maintain a changelog for SLO changes with reasons.
  - **Action**: Review changelog in postmortems for lessons learned.

## 3. Observability & Telemetry Hygiene
- Unified platform for metrics, logs, and traces — see: [Logs, Metrics & Traces: A Before and After Story](https://oneuptime.com/blog/post/2025-08-21-logs-traces-metrics-before-and-after/view)
  - **Action**: Choose a platform like OneUptime or ELK stack and migrate data.
  - **Action**: Train teams on unified querying.
- Golden signals instrumented: latency, traffic, errors, saturation
  - **Action**: Add instrumentation for each signal in application code.
  - **Action**: Create dashboards for golden signals per service.
- High-cardinality controls (dimension limits, drop policies) — see: [How to reduce noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
  - **Action**: Set limits on label cardinality in collectors.
  - **Action**: Implement drop policies for noisy dimensions.
- Structured logging with correlation IDs — see: [How to Structure Logs Properly](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
  - **Action**: Update logging libraries to include correlation IDs.
  - **Action**: Ensure IDs propagate across services.
- Trace spans named consistently — see: [How to name spans in OpenTelemetry](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view)
  - **Action**: Define a naming convention (e.g., service.operation).
  - **Action**: Audit and rename existing spans.
- Metrics implement aggregation strategy (no unbounded label values)
  - **Action**: Use histograms or summaries instead of gauges where possible.
  - **Action**: Limit label values to predefined sets.
- Dark reads / synthetic probes for critical user flows
  - **Action**: Set up synthetic monitoring for key endpoints.
  - **Action**: Integrate results into SLO calculations.
- Retention tiers (hot vs cold telemetry) documented
  - **Action**: Define retention policies (e.g., hot: 7 days, cold: 1 year).
  - **Action**: Automate data migration to cheaper storage.

## 4. Alerting & Signal Quality
- Only alert on things requiring action from a human
  - **Action**: Review all alerts and disable those that don't need human intervention.
  - **Action**: Implement auto-remediation for common issues.
- SLO burn alerts (fast + 6/24h) separated from infrastructure noise
  - **Action**: Tag alerts by type and route SLO alerts to SRE team.
  - **Action**: Use different channels for different alert types.
- No duplicate alerts for same failure mode
  - **Action**: Deduplicate alerts in the alerting system.
  - **Action**: Use alert grouping and inhibition rules.
- Alert ownership mapped (no orphan pages)
  - **Action**: Assign owners to each alert rule.
  - **Action**: Include owner contact in alert payload.
- On-call load tracked (pages / engineer / week)
  - **Action**: Log all pages and calculate load metrics.
  - **Action**: Balance rotations based on load data.
- Automatic suppression during planned maintenance
  - **Action**: Integrate maintenance windows into alerting system.
  - **Action**: Suppress alerts during scheduled downtimes.
- Runbook link embedded in every alert
  - **Action**: Add runbook URLs to alert templates.
  - **Action**: Ensure runbooks are up-to-date and accessible.

## 5. On‑Call & Incident Response
- Primary + secondary rotation (documented escalation policy)
  - **Action**: Set up rotation schedule in a tool like PagerDuty.
  - **Action**: Document escalation paths and test them.
- Paging platform health monitored (meta-alerting)
  - **Action**: Monitor PagerDuty or similar for outages.
  - **Action**: Have backup paging methods.
- Acknowledge SLA (e.g., < 5 min) tracked per incident
  - **Action**: Log acknowledgment times in incident tracker.
  - **Action**: Review SLA compliance monthly.
- ChatOps / incident channel auto-bootstrap
  - **Action**: Automate creation of incident channels in Slack/Teams.
  - **Action**: Populate with relevant stakeholders.
- Incident roles: Commander, Scribe, Comms defined
  - **Action**: Train team on roles and responsibilities.
  - **Action**: Assign roles at incident start.
- Severity classification rubric published
  - **Action**: Define severity levels (e.g., Sev1: user impact >50%).
  - **Action**: Include in incident response docs.
- War room entry/exit criteria defined
  - **Action**: Specify when to escalate to war room (e.g., Sev1 incidents).
  - **Action**: Document exit criteria (e.g., incident resolved).

## 6. Incident Lifecycle & Postmortems
- All Sev1/Sev2 incidents get postmortems within X days
  - **Action**: Set deadline (e.g., 5 business days).
  - **Action**: Automate reminders for overdue postmortems.
- Standardized template — see: [Incident Postmortem Templates](https://oneuptime.com/blog/post/2025-09-09-effective-incident-postmortem-templates-ready-to-use-examples/view)
  - **Action**: Adopt a template and customize for your org.
  - **Action**: Store templates in shared docs.
- Mitigation timestamp vs detection timestamp tracked (improve MTTD)
  - **Action**: Record timestamps in incident tracker.
  - **Action**: Calculate MTTD metrics post-incident.
- Root cause phrased as systemic contributing factors (no blame)
  - **Action**: Train on 5-whys or similar techniques.
  - **Action**: Review postmortems for blameless language.
- Action items have owners + due dates
  - **Action**: Assign owners during postmortem meeting.
  - **Action**: Track in issue tracker with deadlines.
- Recurring issue review (pattern detection)
  - **Action**: Analyze postmortems for patterns quarterly.
  - **Action**: Create preventive measures for common issues.
- Learning summaries shared company-wide
  - **Action**: Publish summaries in company newsletter.
  - **Action**: Discuss in all-hands or team meetings.

## 7. Change & Release Engineering
- Deployment frequency measured
  - **Action**: Track deploys per week in a dashboard.
  - **Action**: Set targets based on DORA metrics.
- Progressive delivery (canary / feature flags)
  - **Action**: Implement feature flags in code.
  - **Action**: Set up canary deployments in CI/CD.
- Rollback < 1 command or button
  - **Action**: Automate rollback scripts.
  - **Action**: Test rollbacks in staging.
- Pre-deploy health gates (tests, lint, vulnerability scan)
  - **Action**: Add gates to CI pipeline.
  - **Action**: Fail builds on gate failures.
- Post-deploy automated smoke checks
  - **Action**: Run health checks after deploy.
  - **Action**: Roll back automatically on failure.
- Change failure rate tracked (DORA)
  - **Action**: Monitor failed deploys.
  - **Action**: Investigate and fix root causes.
- Freeze policy tied to error budget consumption
  - **Action**: Automate freezes when budget low.
  - **Action**: Communicate freezes to teams.

## 8. Resilience & Architecture
- Dependency graph documented (critical upstream services)
  - **Action**: Map dependencies in a tool like Service Map.
  - **Action**: Update map after changes.
- Bulkheads / circuit breakers around external dependencies
  - **Action**: Implement circuit breakers in code (e.g., Hystrix).
  - **Action**: Test breaker behavior.
- Timeouts and retries tuned (no unbounded retries)
  - **Action**: Set reasonable timeouts (e.g., 30s).
  - **Action**: Implement exponential backoff.
- Graceful degradation patterns defined (read-only mode, cache serve stale)
  - **Action**: Design fallback modes for services.
  - **Action**: Test degradation scenarios.
- Backpressure mechanisms (queue limits, shed load)
  - **Action**: Set queue limits in message brokers.
  - **Action**: Implement load shedding.
- Chaos / fault injection in non-prod (or prod with guardrails)
  - **Action**: Use tools like Chaos Monkey for testing.
  - **Action**: Schedule chaos days.
- Blast radius analysis for each critical component
  - **Action**: Assess impact of component failure.
  - **Action**: Prioritize based on radius.

## 9. Capacity & Performance
- Auto-scaling policies tested under load
  - **Action**: Simulate load and verify scaling.
  - **Action**: Adjust policies based on results.
- Capacity models for peak events (seasonal / launch / marketing spikes)
  - **Action**: Forecast capacity needs.
  - **Action**: Pre-scale for known events.
- Profiling in place for CPU / memory hotspots — see: [Basics of profiling](https://oneuptime.com/blog/post/2025-09-09-basics-of-profiling/view)
  - **Action**: Use profilers like pprof or YourKit.
  - **Action**: Profile regularly and optimize.
- Performance SLOs (latency percentiles) tracked alongside availability
  - **Action**: Define latency SLOs (e.g., P95 < 500ms).
  - **Action**: Monitor and alert on breaches.
- Queues / thread pools / connection pools sized intentionally
  - **Action**: Tune pool sizes based on load tests.
  - **Action**: Monitor pool usage.
- Load test scenarios reflect real traffic mix
  - **Action**: Analyze production traffic for test scenarios.
  - **Action**: Run load tests before releases.
- Exhaustion drills (simulate resource limits)
  - **Action**: Simulate CPU/memory exhaustion.
  - **Action**: Test system behavior under limits.

## 10. Security × Reliability Overlap
- Secrets rotation automated
  - **Action**: Use tools like Vault for rotation.
  - **Action**: Schedule automated rotations.
- Dependency vulnerability scanning integrated into CI
  - **Action**: Add scanners like Snyk to pipelines.
  - **Action**: Block builds on high-severity issues.
- Least-privilege IAM enforcement (no wildcard in prod roles)
  - **Action**: Audit and remove wildcards.
  - **Action**: Implement principle of least privilege.
- DDoS / rate limit policies tuned & tested
  - **Action**: Configure rate limits in proxies.
  - **Action**: Test with simulated attacks.
- Incident channel integrates with security team for cross-cutting events
  - **Action**: Add security to incident channels.
  - **Action**: Define collaboration protocols.
- Audit log integrity monitored
  - **Action**: Monitor for tampering.
  - **Action**: Store logs immutably.

## 11. Automation & Tooling
- Self-healing scripts for known failure classes
  - **Action**: Write scripts for common fixes (e.g., restart service).
  - **Action**: Integrate into monitoring.
- Automatic ticket creation for repeating anomalies
  - **Action**: Configure alerts to create Jira tickets.
  - **Action**: Deduplicate tickets.
- One-click / CLI scaffolding for new services (observability baked in)
  - **Action**: Create templates with logging/tracing.
  - **Action**: Use tools like Cookiecutter.
- Runbook drift detection (links checked automatically)
  - **Action**: Script to check runbook links.
  - **Action**: Alert on broken links.
- ChatOps for deploy, status updates, on-call handoff
  - **Action**: Integrate Slack with CI/CD.
  - **Action**: Automate status broadcasts.
- Config changes reviewed same as code
  - **Action**: Store configs in Git.
  - **Action**: Require PRs for changes.

## 12. Cost & Telemetry Efficiency
- Cost per signal type (trace, metric, log) monitored
  - **Action**: Track costs in cloud dashboards.
  - **Action**: Optimize high-cost signals.
- High-cardinality detection & pruning pipeline — see: [Noise reduction guide](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
  - **Action**: Implement cardinality limits.
  - **Action**: Prune unused dimensions.
- Cold storage migration policy (beyond X days)
  - **Action**: Define migration rules (e.g., >30 days to cold).
  - **Action**: Automate migration.
- Error / warn log ratio tracked (noise health)
  - **Action**: Monitor log levels.
  - **Action**: Reduce warning noise.
- Budget alerts for sudden ingest spikes
  - **Action**: Set cost budgets.
  - **Action**: Alert on overruns.

## 13. Governance & Continuous Improvement
- Quarterly reliability review (SLOs, incidents, trends)
  - **Action**: Schedule reviews with stakeholders.
  - **Action**: Document outcomes and actions.
- MTTD / MTTR tracked and improved with explicit experiments
  - **Action**: Measure metrics monthly.
  - **Action**: Run experiments to improve (e.g., better alerting).
- Top 3 systemic risks listed & owned
  - **Action**: Identify risks from postmortems.
  - **Action**: Assign owners to mitigate.
- Reliability OKRs tied to user/business outcomes (not vanity)
  - **Action**: Align OKRs with user metrics.
  - **Action**: Measure impact.
- Tooling consolidation review annually
  - **Action**: Audit tools for overlap.
  - **Action**: Consolidate where possible.

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
   - **Action**: Audit all alerts, disable non-actionable ones, implement auto-remediation.
   - **Timeline**: Week 1-2.
2. Define core SLIs & error budget policy
   - **Action**: Identify user journeys, set SLIs, calculate budgets.
   - **Timeline**: Week 3-4.
3. Standardize incident response (roles + template)
   - **Action**: Train on roles, adopt postmortem template.
   - **Timeline**: Week 5-6.
4. Ensure deploys are reversible in < 5 minutes
   - **Action**: Implement automated rollbacks, test in staging.
   - **Timeline**: Week 7-8.
5. Add structured logging + trace correlation
   - **Action**: Update code for structured logs and correlation IDs.
   - **Timeline**: Week 9-10.
6. Implement burn rate + availability SLO alerting
   - **Action**: Configure alerts, integrate with dashboards.
   - **Timeline**: Week 11-12.
7. Introduce progressive delivery & dependency timeouts
   - **Action**: Add feature flags, set timeouts in services.
   - **Timeline**: Week 13-14.

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
