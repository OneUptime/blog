# Validation Summary: How to Define an SLO for a Service with Zero or Very Low Traffic

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs), service level indicators (SLIs), and error budgets
- Site reliability engineering (SRE) practices for zero- and low-traffic services
- Synthetic monitoring
- Prometheus metrics and PromQL

## Sources Consulted

- [Google SRE Workbook: Low-Traffic Services and Error Budget Alerting](https://sre.google/workbook/alerting-on-slos/#low-traffic-services-and-error-budget-alerting)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google Cloud Observability: Properties of a good SLI](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/overview)
- [Google Cloud Observability: Concepts in service monitoring](https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus: Instrumentation best practices—avoid missing metrics](https://prometheus.io/docs/practices/instrumentation/#avoid-missing-metrics)

## Issues Found

- The `or vector(1)` explanation implied that known idleness and missing instrumentation always produce the same PromQL result. The text now describes the precise empty-vector fallback case and warns that missing telemetry can be incorrectly reported as 100% reliability.
- The alerting discussion attributed paging directly to a 99.9% SLO target. An SLO does not page by itself, so the text now attributes the page to alerting configured against that target.
- The labeled request counter was not required to exist before its first event, so a never-used but healthy service could be mistaken for missing telemetry. The post now requires initializing known labeled counter series to zero, and the `absent_over_time()` selector now matches the eligible counter used by the traffic query.
- The `absent_over_time()` prose overstated the query as detecting a missing series. It now states the actual behavior: the query reports when no samples for the selected counter were observed during the range.
- The `max_over_time(up[10m]) == 0` prose described a target as currently existing and failing. The query actually means that every recorded scrape in the range failed, so the wording was corrected accordingly.
- The zero-increase query did not explicitly depend on a separate freshness check. The text now states that dependency so absent or insufficient telemetry is not described as confirmed idleness.
- The independent synthetic objective did not state its compliance window, and “five-minute checks” was ambiguous about duration versus cadence. It now uses the same rolling 28-day window and says the checks are scheduled every five minutes.

## Review Notes

The low-traffic SRE guidance and numerical examples are correct: at 99.9%, two bad events out of 2,000 meet the objective exactly, while one bad event out of 200 yields 99.5% and misses it. All three PromQL snippets are syntactically valid and use current functions. `absent_over_time()` over the shown selector detects total absence of matching samples, not one missing instance when another matching series remains. All post references and the author link resolved successfully. No version-specific or deprecation issues were found.
