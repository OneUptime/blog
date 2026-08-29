# Validation Summary: End-to-End Journey SLOs vs Service SLOs: Where Should You Measure Reliability?

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Site Reliability Engineering (SRE)
- Service level indicators (SLIs), service level objectives (SLOs), and error budgets
- Critical user journey and service-boundary measurement
- Browser/mobile, edge/load-balancer, application, and synthetic telemetry
- Correlated event evaluation for asynchronous journeys
- Prometheus counters, labels, cardinality, and telemetry-health alerting
- Burn-rate alerting and incident routing

## Sources Consulted

- [Google SRE Book: Service Level Terminology](https://sre.google/sre-book/service-level-objectives/#service-level-terminology)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Modeling User Journeys](https://sre.google/workbook/implementing-slos/#modeling-user-journeys)
- [Google SRE Book: Define SLOs Like a User](https://sre.google/sre-book/service-best-practices/)
- [Google Cloud Observability: SLI specifications and implementations](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Prometheus: Instrumentation](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Metric and label naming](https://prometheus.io/docs/practices/naming/)
- [Prometheus: Querying basics and label matchers](https://prometheus.io/docs/prometheus/latest/querying/basics/#label-matchers)
- [Prometheus: Alerting best practices](https://prometheus.io/docs/practices/alerting/)
- [Prometheus: `absent()` and `absent_over_time()`](https://prometheus.io/docs/prometheus/latest/querying/functions/#absent)
- [Google Cloud Dataflow: Exactly-once processing and deduplication](https://docs.cloud.google.com/dataflow/docs/concepts/exactly-once)

## Issues Found

- The introduction and service example conflated SLIs, which measure service behavior, with SLOs, which set targets for those SLIs. The wording now assigns measurement to SLIs and targets to SLOs, and the checkout example now states that its percentage applies over a defined compliance window.
- The measurement-boundary text implied that any single client, edge, or business-event source captured every journey stage. It now recommends the outermost source or combination of sources that can observe the journey and makes the result dependent on the available instrumentation.
- The table described browser/mobile instrumentation as capturing the full client experience and described synthetics as operating with no traffic. Client telemetry can miss failures before instrumentation loads or reports, and synthetics generate artificial traffic. The table now states both limitations accurately.
- The evaluator was said to classify starts "exactly once" without specifying how duplicate delivery or retries were handled. It now requires a deduplicating, idempotent evaluator that assigns one final logical outcome per eligible start.
- The Prometheus example used `result="good|bad"` and `reason="payment|inventory|timeout"`. With an equality matcher, those are literal strings rather than alternatives. The example now uses concrete label values and explicitly requires bounded labels.
- Missing journey outcomes alone cannot distinguish broken telemetry from legitimately quiet traffic. The alerting guidance now calls for a separate heartbeat or freshness signal.
- The "Define SLOs Like a User" reference used a fragment that is not present in the current page HTML. The invalid fragment was removed while preserving the link to the correct official page.

## Review Notes

- The event declarations are conceptual pseudocode rather than language-specific executable code.
- A production implementation should document cancellation eligibility and whether long-running outcomes are attributed by start time, deadline, or final-classification time.
- All post and author links were reachable on 2026-08-29. No version-specific or deprecated APIs, commands, or configuration were present.
