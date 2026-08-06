# Use an Actionability Test for Every Production Page

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alerting, On-Call, Site Reliability Engineering, Prometheus, Service Level Objectives, Incident Response, Observability

Description: Decide whether an alert deserves a page by proving urgency, user impact, a safe human action, ownership, and reliable detection.

---

A page interrupts a human and asks for immediate judgment. The alert should therefore prove that waiting until working hours creates unacceptable harm and that the responder has a meaningful action to take now.

Prometheus guidance says alerts should be urgent, important, actionable, and real, and recommends paging on user-facing symptoms rather than every possible cause. Google SRE guidance says pages should be immediately actionable and have a high signal-to-noise ratio. Turn those principles into an explicit review before any rule can reach the paging route.

## The Six-Question Actionability Test

An alert qualifies for paging only when all six questions have defensible answers.

### 1. Is the condition real?

The expression must represent an observed condition, not an ambiguous metric artifact. Validate:

- metric source, labels, units, and aggregation;
- behavior when data is absent or delayed;
- expected variance and seasonality;
- evaluation interval and hold duration;
- duplicate series and high-availability replicas;
- test cases just below and above the threshold.

A firing CPU threshold may be real as a metric but still not represent a real service problem. "Real" is necessary, not sufficient.

### 2. Is the consequence important?

The condition should indicate current user harm, imminent material harm, data or security loss, or exhaustion that requires intervention before the next staffed period.

Good paging candidates include:

- rapid error-budget consumption on a critical journey;
- confirmed data corruption or loss in progress;
- a hard capacity limit that will be reached before staff return;
- a failed critical batch that cannot meet its deadline without action;
- monitoring-path failure that removes the only detection for critical services.

Informational drift, isolated retryable failures, and a redundant instance failure usually belong in dashboards, automation, or tickets unless they create a time-critical consequence.

### 3. Is it urgent now?

Write the latest safe response time. If an engineer can act tomorrow with the same outcome, do not wake one now.

Urgency depends on time to harm, not only severity. A capacity forecast can justify a page if exhaustion is two hours away and manual provisioning takes ninety minutes. The same forecast should create a ticket if exhaustion is three weeks away.

### 4. Is there a human action?

Name the first safe action and the decision it supports. Examples include stopping a rollout, shedding optional traffic, failing away from an impaired cell, disabling a compromised credential, or increasing an approved quota.

"Investigate" is not enough. Investigation can be part of the response, but the runbook should state what evidence distinguishes the next actions.

If the correct response is deterministic, safe, and automatable, automate it and alert on automation failure or exhausted authority. Do not use the on-call engineer as a scheduled controller.

### 5. Is the right owner reachable and equipped?

The page must route to a staffed team that owns the user outcome or mitigation. Verify that responders can access dashboards, logs, deployment controls, credentials, and incident tooling.

Do not page a downstream team only because its metric appears abnormal. Page the service owning user impact, provide dependency evidence, and use an agreed escalation path.

### 6. Will the page resolve predictably?

Define the resolved condition and any minimum recovery period. A page that flaps between firing and resolved creates repeated interruptions and obscures whether mitigation worked.

Use hysteresis, appropriate `for` and `keep_firing_for` durations, multiwindow evaluation, or stateful suppression when appropriate. These mechanisms should filter noise without hiding sustained harm.

## Page on Symptoms and Diagnose with Causes

A symptom states that users are receiving a bad service outcome: high request failure, excessive latency, stale output, or missed processing deadline. A cause states a possible reason: CPU saturation, pod restart, cache eviction, or database connection use.

Prometheus recommends symptom-based paging at the highest useful point in the stack. Lower-level cause signals belong on the diagnostic dashboard or in non-paging alerts unless they require direct urgent action before user impact.

This prevents one database fault from paging the database, API, frontend, and product teams independently. It also allows a redundant component to fail without waking anyone while the user journey remains healthy.

There are legitimate exceptions. Imminent certificate expiry, data corruption, exhausted storage, and security compromise may require action before a user-facing SLI changes. Document the consequence and response deadline rather than pretending they are ordinary symptom alerts.

## Use SLO Burn for User-Journey Pages

An SLO gives a page a user-centered consequence. Burn rate compares the observed bad-event rate with the bad-event rate allowed by the objective.

```text
burn_rate = observed_bad_fraction / allowed_bad_fraction
```

For a 99.9 percent SLO, the allowed bad fraction is 0.001. An observed bad fraction of 0.0144 burns at 14.4 times the sustainable rate.

Google's multiwindow, multi-burn-rate approach uses both a longer window and a shorter confirmation window. The longer window expresses material budget consumption; the shorter window confirms the condition is still active. Fast burn can page, while slow burn can create a ticket.

Tune windows and thresholds to the SLO, traffic, and response time. Do not copy values without validating event volume and responder workload. Low-traffic services may need synthetic transactions or deadline-based alerts because ratios have sparse data.

## Define an Alert Contract

Treat each paging rule as an operational interface:

```yaml
alert: CheckoutFastErrorBudgetBurn
owner: checkout-platform
user_journey: place-order
consequence: >-
  If sustained, checkout will consume a material portion of its 28-day
  availability budget before the next staffed response period.
urgency: page
first_actions:
  - check rollout annotation and stop an active rollout if correlated
  - compare failures by region, tenant, and dependency
  - fail away from an impaired cell when isolation criteria are met
dashboard: https://observability.example.net/checkout/slo
runbook: https://runbooks.example.net/checkout/fast-burn
escalation: commerce-incident-primary
tested_at: 2026-07-24T16:00:00Z
```

Also record the PromQL or query owner, measurement source, expected page frequency, known blind spots, and safe test method. Keep secrets and customer identifiers out of alert annotations.

## Choose the Right Delivery Class

Use a simple routing taxonomy:

| Class | Required response | Examples |
| --- | --- | --- |
| Page | Immediate, any hour | Fast SLO burn, active corruption, imminent hard exhaustion |
| Ticket | Planned within a stated time | Slow budget burn, forecast capacity shortfall, expiring exception |
| Dashboard or log | Investigation context | Component saturation, retry count, individual pod failure |
| Automation event | Deterministic machine action | Restart, failover, scale, credential rotation workflow |

An alert can change class as time to harm changes. Implement explicit thresholds rather than relying on a human to notice a dashboard becoming urgent.

Prometheus Alertmanager can group, route, inhibit, and silence alerts. Those features manage delivery; they do not make a bad signal actionable.

## Validate Before Enabling Paging

Run a shadow period in which the rule evaluates and records notifications without waking responders. During that period:

- replay known incident intervals;
- inject or simulate the target failure safely;
- verify notification labels and links;
- measure firing, resolution, and duplicate behavior;
- confirm the correct team receives it;
- have an unfamiliar responder follow the runbook;
- estimate pages per on-call shift;
- record false positives and missed relevant events.

Test the complete route from metric production through rule evaluation and notification delivery. A correct expression cannot help if the monitoring system, route, or paging integration is broken.

Enable paging only after an owner accepts the expected interruption budget. Review quickly after every new page and after material service or SLO changes.

## Learn from Every Page

Classify the outcome:

- **Actionable**: a responder took a necessary time-critical action.
- **Useful but not urgent**: move it to a ticket or working-hours route.
- **Automatable**: implement the action and page on failure.
- **Duplicate**: consolidate at the user symptom or use inhibition.
- **False positive**: repair the signal or threshold.
- **No access or no owner**: fix readiness before relying on the alert.
- **No runbook path**: add the missing decision and test it.

Do not merely raise a threshold after noise. Determine whether the metric, consequence, urgency, or ownership assumption was wrong.

## Page Review Checklist

- [ ] The condition is real under missing, delayed, and duplicated data.
- [ ] Consequence and latest safe response time are explicit.
- [ ] A human has a necessary action that cannot safely wait.
- [ ] The page represents a user symptom or a documented pre-impact exception.
- [ ] One staffed owner has access and authority to mitigate.
- [ ] Dashboard, runbook, and escalation links are tested.
- [ ] Firing and resolution resist flapping.
- [ ] Shadow evaluation predicts an acceptable interruption rate.
- [ ] End-to-end notification delivery is monitored.
- [ ] Every firing feeds an alert-quality review.

## Official Documentation

- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: On-Call](https://sre.google/workbook/on-call/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/)
- [Prometheus: Alertmanager Overview](https://prometheus.io/docs/alerting/latest/overview/)

## Conclusion

A production page must earn the right to interrupt. Prove that its condition is real, important, urgent, human-actionable, correctly owned, and stable through recovery. Use user symptoms and SLO burn for paging, keep cause signals for diagnosis, and validate the full notification path before enabling it. The result is a pager that directs action instead of distributing anxiety.
