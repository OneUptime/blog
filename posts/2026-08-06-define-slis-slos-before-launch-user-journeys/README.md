# Define SLIs and SLOs from User Journeys Before Launch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Level Objectives, Service Level Indicators, Site Reliability Engineering, Error Budgets, Observability, Operational Readiness

Description: Derive launch-ready SLIs and SLOs from critical user journeys, with precise event definitions, targets, budgets, and ownership.

---

The easiest prelaunch mistake is to browse available metrics and promote convenient ones into service level indicators. CPU, pod readiness, database connections, and queue depth help explain a system, but they rarely state whether a user accomplished a goal.

Google's SRE guidance recommends starting with what users care about, not what is easiest to measure, and working backward from objectives to indicators. Before launch, use critical user journeys to define successful outcomes, eligible events, thresholds, and response policy. Instrumentation follows that definition.

## Write the Journey in User Language

A journey is an outcome with a starting condition and a completion condition. Examples include:

- a signed-in shopper submits an in-stock order and receives a durable confirmation;
- an API client writes a valid object and can subsequently read the committed version;
- a scheduled payroll file becomes available before the contractual cutoff;
- an administrator revokes a credential and the credential stops authorizing requests.

"Orders API is available" is too broad. It mixes reads, writes, validation failures, payment behavior, and background processing. Separate journeys when users, criticality, workload shape, or reliability expectations differ.

For each journey, identify:

- user or client population;
- valid starting conditions;
- observable success boundary;
- maximum useful completion time;
- correctness and durability requirements;
- expected exclusions;
- product and engineering owners.

Do not exclude a condition merely because the system currently handles it badly. Exclusions should represent traffic the service is not expected to serve, such as invalid unauthenticated input, and should be resistant to manipulation.

## Turn the Journey into an SLI Specification

An SLI is a quantitative measure, not a dashboard title. A request-based availability SLI commonly has this shape:

```text
availability = good eligible events / all eligible events
```

A latency SLI is often expressed as the fraction of eligible events completed below a threshold:

```text
latency_attainment = good eligible events completed within 500 ms / all eligible events
```

Define every term:

| Field | Example |
| --- | --- |
| Population | Production checkout requests from enabled tenants |
| Event | One `PlaceOrder` attempt received at the public edge |
| Good availability event | Durable order confirmation, or idempotent replay of the same confirmation |
| Bad availability event | Rejection of an otherwise valid attempt, ambiguous outcome, timeout, or lost accepted operation |
| Excluded event | Invalid or expired credentials, invalid payload, explicit client cancellation before acceptance |
| Latency start | Eligible attempt received at public edge |
| Latency stop | Durable confirmation returned to client |
| Measurement point | Edge telemetry joined to order outcome |
| Window | Rolling 28 days |

The values are examples. Product expectations, workload behavior, and business constraints determine the real definitions.

## Measure at the User-Relevant Boundary

Server-side latency can miss DNS, network, proxy, client, or rendering delays. Internal success can miss a response lost after committing state. Client-side measurement can be more representative but may be sampled, delayed, blocked, or biased.

Choose the closest reliable boundary to the user experience and document the gap. Useful patterns include:

- load-balancer or API-edge outcomes for request success;
- browser or mobile telemetry for page usability;
- synthetic transactions for low-traffic critical paths;
- data timestamps at ingress and published output for pipelines;
- periodic read-after-write probes for correctness and freshness;
- reconciliation records for asynchronous business completion.

Google's SRE Book notes that client-side measurement may reveal failures missed by server metrics. It also recommends a small number of representative indicators rather than every available metric.

## Include Correctness, Freshness, and Durability

An HTTP 200 is not necessarily good. A checkout that confirms the wrong total, a dashboard that serves yesterday's data, and a storage API that loses an acknowledged write are user failures.

For critical journeys, consider separate indicators for:

- **availability**: an eligible operation completes successfully;
- **latency**: it completes within a useful threshold;
- **correctness**: the result satisfies a domain invariant;
- **freshness**: output is no older than the allowed delay;
- **durability**: acknowledged data remains recoverable;
- **coverage**: the expected population or partition was processed.

Correctness may require business telemetry or sampled validation rather than an infrastructure counter. If it cannot be measured before launch, record that as a readiness risk and define a plan to close it.

## Set a Target and Window

An SLO is a target for an SLI over a window. State all three:

```text
Over a rolling 28-day window, at least 99.9% of eligible PlaceOrder
operations produce a durable confirmation without an ambiguous result.
```

Avoid "99.9% uptime" without event, population, measurement point, and window. A time-based probe can report 100 percent while half of user requests fail.

Choose a window that supports decisions. Rolling windows give a continuously updated view. Calendar windows align with reporting periods but reset at boundaries. The organization should document which one controls alerting and release policy.

Targets are product and business decisions informed by engineering cost and feasibility. Do not simply copy an upstream provider SLA, choose the current measured value, or default to 100 percent. Google recommends avoiding absolute targets and using as few SLOs as provide meaningful coverage.

## Calculate the Error Budget

For an event-based 99.9 percent SLO, the allowed bad-event fraction is:

```text
error_budget_fraction = 1 - 0.999 = 0.001
```

If the window contains 1,000,000 eligible events, the budget permits 1,000 bad events. If 250 events are bad, 25 percent of the budget is consumed.

Do not translate this blindly into minutes. Event-based and time-based measurements weight outages differently. Ten minutes during peak traffic can consume far more event budget than ten minutes overnight.

Define what happens as budget is consumed. An error-budget policy might change rollout pace, require reliability work, or stop risky launches. This response is organizational policy, not an automatic property of an SLO.

## Handle Dependencies Deliberately

A journey SLO includes dependency failures when users experience them. Removing payment-provider errors from checkout availability may make the service dashboard green while customers cannot buy.

Model the dependency instead:

- include its observed effect in the journey SLI;
- document the upstream objective or contract;
- design fallback or degradation where the product permits it;
- set client deadlines and retry budgets;
- identify who owns mitigation and escalation;
- test the journey during dependency latency, errors, and loss.

Internal component SLIs remain useful for diagnosis and capacity, but they do not replace the end-to-end objective.

## Design for Low Traffic and Missing Data

At low volume, one failure can create a volatile ratio and burn-rate alerts may not fire predictably. Consider:

- synthetic traffic that exercises the real boundary safely;
- a longer evaluation window;
- combining truly equivalent event classes;
- an explicit maximum time since the last successful completion;
- direct paging for a missed critical batch deadline.

Define missing telemetry behavior. No requests may mean no demand, broken instrumentation, failed routing, or a dead client. Monitor the measurement pipeline separately and never treat absent data as automatic success.

## Build the SLO Before the Dashboard

Use a versioned specification:

```yaml
journey: place-order
owners:
  product: commerce-product
  engineering: checkout-platform
sli:
  type: request-availability
  source: edge-and-order-outcome
  eligible: production PlaceOrder attempts from enabled tenants received at public edge
  good: durable confirmation or idempotent replay
  exclusions:
    - invalid or expired credentials rejected before acceptance
    - invalid payload rejected before acceptance
    - explicit client cancellation before acceptance
slo:
  target: 0.999
  window: rolling-28d
alert_policy: multiwindow-burn-rate
decision_policy: commerce-error-budget-v2
```

Then implement:

1. source instrumentation and event-quality checks;
2. reproducible SLI query or recording rule;
3. dashboard with numerator, denominator, ratio, and budget;
4. alerts tied to a tested responder action;
5. ownership and review cadence;
6. validation against known good and bad test cases.

Version the definition. A changed denominator can improve the graph without improving users. Review SLI changes like an API change and annotate the historical discontinuity.

## Prelaunch Validation Checklist

- [ ] Critical user journeys have product and engineering owners.
- [ ] Each SLI defines population, event, good, bad, and exclusions.
- [ ] Measurement is near the user-relevant boundary.
- [ ] Correctness, freshness, and durability are considered.
- [ ] Target and window are explicit and justified.
- [ ] Error-budget math is reproducible.
- [ ] Dependency impact remains visible in the journey.
- [ ] Low traffic and missing telemetry have defined behavior.
- [ ] Test events prove the query counts good and bad outcomes correctly.
- [ ] Alerts and decision policy have named actions.

## Official Documentation

- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Book: Define SLOs Like a User](https://sre.google/sre-book/service-best-practices/)
- [Google SRE Book: Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)

## Conclusion

An SLO should describe a user outcome precisely enough to guide a production decision. Start from critical journeys, define eligible and good events, measure at a meaningful boundary, include dependency impact, and test the query before launch. Available metrics become implementation inputs, not the source of truth for what reliability means.
