# End-to-End Journey SLOs vs Service SLOs: Where Should You Measure Reliability?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SLO, SLI, User Experience, Service Level Objectives, Reliability, SRE

Description: Use journey SLOs to govern user outcomes and service SLOs to localize risk without confusing component health with product reliability.

---

Measure reliability at both levels, but give them different jobs. An end-to-end journey SLO decides whether users received the promised outcome. Service SLOs identify which component needs attention and whether internal consumers can safely depend on it.

If every microservice dashboard is green while customers cannot complete checkout, the service-level view is incomplete. If a checkout SLO is red but provides no component evidence, incident response is slow. The layers are complementary.

## Define the Layers

### Journey SLO

A journey is a user-meaningful task such as signing in, submitting an order, restoring a backup, or receiving a scheduled report. Its SLI begins at a user-visible start event and ends at the useful outcome:

```text
eligible journeys completed correctly and on time / eligible journeys started
```

Measure at the client, edge, or correlated business-event layer when possible. This captures gateways, dependencies, retries, asynchronous stages, and failures before the application server receives a request.

### Service SLO

A service SLO describes the promise one service makes to its supported consumers:

```text
eligible inventory RPCs returning a valid result within 100 ms / eligible inventory RPCs
```

Measure at the consumer-facing boundary of that service. CPU, pod readiness, and queue depth remain diagnostic indicators; they are not substitutes for the service outcome.

## Use the Journey to Govern Product Risk

Consider checkout:

```text
Browser -> API edge -> Cart -> Inventory -> Payment -> Order store -> Confirmation
```

The product SLO might require 99.9% of eligible submissions to produce a durable confirmation within five seconds. A payment timeout that prevents confirmation is bad even if the checkout application returned a polished error page. That top-level budget should control decisions such as release freezes and cross-team reliability investment.

Component objectives—payment-adapter availability, order-store latency, inventory correctness—help attribute the loss and protect internal consumers. Do not “correct” the journey result because a dependency caused it.

## Choose a Real Measurement Boundary

Measurement gets less user-representative as it moves inward:

| Source | Captures | Misses |
|---|---|---|
| Browser or mobile instrumentation | Full client experience | Users that block telemetry; instrumentation failure |
| Public edge or load balancer | Requests reaching the edge, gateway failures | DNS, some TLS/client rendering failures |
| Application server | Rich business context | Requests lost before the process |
| Synthetic journey | Proactive coverage with no traffic | Real identities, devices, data, and all user paths |

Start with the best available source, label it as a proxy, and compare it with support tickets and incidents. Google SRE recommends moving measurement closer to users when an SLI misses real impact.

## Correlate Logical Journeys

One journey can span requests and queues. Assign a durable journey ID at initiation, then record bounded events in a log or analytics store:

```text
journey_started(id, class, deadline)
journey_completed(id, completed_at, correctness)
journey_cancelled(id, reason)
```

An independent evaluator classifies each eligible start exactly once after completion or deadline. Keep the ID out of Prometheus labels; export aggregate counters such as `journey_outcomes_total{journey="checkout",result="good|bad",reason="payment|inventory|timeout"}`.

Retries and redundant calls remain component attempts. They should not inflate the journey denominator.

## Design Alerts for Each Layer

- Page on rapid journey-budget burn when users need immediate intervention.
- Use component symptoms and dependency signals to route diagnosis, not to create duplicate pages for the same incident.
- Create tickets for slow component degradation that threatens future journey reliability.
- Alert separately on missing journey telemetry; no data is not a green outcome.
- Keep infrastructure alerts only when an operator can act before user impact or when the failure has safety consequences.

A journey page should link to a dependency map, component SLIs, recent changes, and the event-class breakdown. It should not notify every team by default; one responder coordinates and escalates to the component owner indicated by evidence.

## Avoid Extremes

Journey-only measurement can be sparse, delayed, and hard to diagnose. Service-only measurement optimizes local success while missing integration, shared dependencies, and the final user result. A synthetic-only journey can remain green while real customers fail; an attempt-level service SLO can turn successful retries into multiple errors.

Keep a small set of critical journey SLOs and only the component SLOs that protect a real consumer decision. Retire metrics that never change an action.

## References

- [Google SRE Workbook: Modeling User Journeys](https://sre.google/workbook/implementing-slos/#modeling-user-journeys)
- [Google SRE Book: Define SLOs Like a User](https://sre.google/sre-book/service-best-practices/#define-slos-like-a-user)
- [Google Cloud Observability: SLI specifications and implementations](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)

## Conclusion

Let end-to-end journeys tell you whether the product kept its promise, and let service SLOs explain and contain component risk. Govern reliability from the outer outcome while preserving the inner evidence needed to act.
