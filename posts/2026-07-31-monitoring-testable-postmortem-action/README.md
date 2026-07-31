# Turn “Improve Monitoring” into a Testable Postmortem Action

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Management, Monitoring, Alerting, Postmortem Actions, Prometheus, SRE

Description: Replace a vague monitoring promise with an owned signal, explicit alert semantics, end-to-end tests, and measurable completion criteria.

---

“Improve monitoring” identifies an area of dissatisfaction, not a deliverable.

It does not say which failure should become visible, which metric represents it, when a human should be interrupted, or how anyone will prove the change works. A ticket with that title can be closed after adding a dashboard that would not have changed the incident.

Google’s SRE Workbook calls measurability a characteristic of good postmortem actions and uses “Add an alert when more than X% of our machines have been taken away from us” as an example of a verifiable end state. Turn the monitoring action into a small monitoring design.

## Start with the Detection Gap

Write one sentence connecting the incident to the missing signal:

> During INC-482, checkout success in `eu-west` fell below 94% for 17 minutes, but the first page came from host CPU 12 minutes after customer errors began.

This establishes:

- the affected customer journey;
- the scope;
- the measured symptom;
- the detection delay;
- why the existing signal was inadequate.

Avoid starting with a tool:

> Add a Grafana panel.

A panel might help diagnosis, but it does not define detection or response.

## Decide the Required Monitoring Output

Google SRE distinguishes:

- **page:** a human must act immediately;
- **ticket:** a human must act, but not immediately;
- **log or dashboard:** retained for later diagnosis or analysis.

Prometheus similarly recommends paging on symptoms associated with user pain and avoiding pages where there is nothing to do.

Ask:

1. What bad outcome is occurring or approaching?
2. How quickly must a person act?
3. What action can they take?
4. If no immediate action exists, should this be a ticket or dashboard instead?

“Everything should alert” is not improvement. It is a path to alert fatigue.

## Specify the Signal

Define:

- metric name and type;
- numerator and denominator, if it is a ratio;
- required labels and aggregation boundary;
- data source and scrape or evaluation interval;
- expected normal behavior;
- behavior during the incident;
- missing-data semantics;
- responsible service owner.

For an HTTP failure ratio:

```text
signal:
  numerator: rate of checkout responses with 5xx status
  denominator: rate of all checkout responses
  scope: service + region
  window: 5 minutes
  low-traffic behavior: no page below the agreed request-rate floor
```

Do not use an unbounded customer ID, URL, exception message, or request ID as a metric label. Instrumentation should keep label cardinality controlled.

## Define the Alert Contract

A testable alert needs:

- expression;
- threshold;
- evaluation window;
- pending duration;
- severity and destination;
- ownership labels;
- summary and impact annotations;
- runbook and dashboard links;
- expected resolving condition;
- maintenance and missing-data behavior.

An illustrative Prometheus rule could be:

```yaml
groups:
  - name: checkout-symptoms
    rules:
      - alert: CheckoutRegionalErrorRatioHigh
        expr: |
          (
            sum by (service, region) (
              rate(http_requests_total{
                service="checkout",
                status=~"5.."
              }[5m])
            )
            /
            sum by (service, region) (
              rate(http_requests_total{
                service="checkout"
              }[5m])
            )
          ) > 0.02
          and
          sum by (service, region) (
            rate(http_requests_total{
              service="checkout"
            }[5m])
          ) > 1
        for: 3m
        labels:
          severity: page
          team: checkout
        annotations:
          summary: "Checkout 5xx ratio is high in {{ $labels.region }}"
          runbook_url: "https://runbooks.example/checkout/high-errors"
```

The metric names, 2% threshold, one-request-per-second floor, and durations are examples, not universal recommendations. Derive them from the service objective, traffic pattern, detection requirement, and an action responders can safely take.

Prometheus’s `for` clause keeps an alert pending until its expression has remained active for the configured duration. That is useful for filtering harmless blips, but it also adds detection delay. Include the full window and pending time when checking the target.

## Separate Detection from Diagnosis

The page should tell the on-call that customer impact requires action. The linked dashboard can then show:

- request rate, errors, and latency by region;
- dependency health;
- deployment and configuration events;
- saturation and capacity;
- retry and timeout behavior;
- current incident and change links.

Do not page independently on every possible lower-level cause if a customer-symptom alert already provides the actionable interruption. Cause metrics can support dashboards, tickets, or targeted capacity warnings.

There are exceptions. A disk with a predictable short time to exhaustion may require action before customer impact. Write that page around the forecast, lead time, and remediation-not merely “disk is high.”

## Write Completion Criteria Before Implementation

The action is complete only when all agreed evidence exists:

```text
Implementation:
[ ] Metric is emitted in every production region.
[ ] Recording and alerting rules are reviewed and deployed.
[ ] Ownership, severity, runbook, and dashboard links are present.

Rule behavior:
[ ] Rule tests cover healthy, firing, low-traffic, missing-data,
    and recovery cases.
[ ] Counter reset and label aggregation behavior are checked.

End to end:
[ ] A controlled failure in a safe environment crosses the threshold.
[ ] The alert remains pending and fires at the expected times.
[ ] Alertmanager routes it to the current checkout rotation.
[ ] The notification contains enough context to start the runbook.
[ ] The alert resolves after recovery.

Operations:
[ ] The runbook contains a safe first action and escalation path.
[ ] The team records expected detection time and test evidence.
```

Prometheus provides `promtool check rules` and unit testing for rule files. Syntax validation alone is insufficient: test the expression against representative series and test notification delivery through the actual routing path.

## Include an Effectiveness Criterion

Implementation verification asks, “Did we build what the ticket specified?” Effectiveness verification asks, “Would it materially improve a recurrence?”

Define both:

```text
implementation target:
  A representative regional 5xx failure fires the page within
  8 minutes of the first failing samples.

effectiveness target:
  During quarterly alert tests and any matching production incident,
  the page arrives before the legacy host alert and identifies the
  affected service and region.
```

Do not claim success merely because the incident has not recurred. A controlled test gives positive evidence; absence of recurrence may only mean the failure has not been exercised.

## Assign One Owner and a Deadline

Use a tracked action with:

- one implementation owner;
- collaborators;
- priority;
- due date;
- dependencies;
- reviewer or accepting service owner;
- links to the incident and causal factor;
- verification evidence.

Ownership is for delivery of the improvement, not ownership of blame for the incident.

A good ticket title is:

> Page checkout on sustained regional 5xx ratio above the approved error threshold

The body should contain the detection gap, rule contract, completion checklist, and test plan.

## Avoid Common Weak Rewrites

### “Add more alerts”

More is not a success criterion. Name the uncovered outcome and required response.

### “Lower the threshold”

Explain which missed impact the new threshold detects, evaluate historical noise, and test the delay/noise tradeoff.

### “Build a dashboard”

State who uses it, for which decision, and how a scenario test proves it shortens diagnosis.

### “Alert on every host”

Host-level pages can multiply one service incident into hundreds of notifications. Choose an aggregation and routing boundary that matches the response.

### “Use anomaly detection”

An algorithm does not define urgency, impact, ownership, or action. Specify the behavior it must detect and its false-positive/false-negative acceptance criteria.

### “Done when deployed”

A deployed rule may have no data, never cross its threshold, route to the wrong team, or lack a usable response. Require behavioral evidence.

## A Complete Action Example

```text
Action:
Create a regional checkout-error page tied to the customer success objective.

Incident gap:
INC-482 produced 17 minutes of elevated 5xx responses; detection relied
on a later CPU page.

Owner:
Checkout observability owner

Due:
Before the next checkout release train

Acceptance:
Rule and unit tests merged; signal present in all production regions;
controlled failure fires within 8 minutes; notification reaches the
active rotation with dashboard and runbook; recovery resolves it.

Effectiveness review:
Re-run quarterly and review behavior after any matching incident.
```

That is an action a reviewer can accept or reject with evidence. “Improve monitoring” is only the note that should have led to it.

## Official Documentation

- [Google SRE Workbook: Postmortem Culture](https://sre.google/workbook/postmortem-culture/)
- [Google SRE: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Prometheus: Alerting Practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [Prometheus: Unit Testing Rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)
- [Prometheus: promtool](https://prometheus.io/docs/prometheus/latest/command-line/promtool/)
