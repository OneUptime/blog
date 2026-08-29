# Validation Summary: How to Keep Low-Traffic Burn-Rate Alerts from Paging on a Single Failed Request

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs) and error budgets
- Prometheus and PromQL
- Multiwindow, multi-burn-rate alerting
- Synthetic monitoring

## Sources Consulted

- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Prometheus: Query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Instrumentation best practices](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus: Jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus: Unit testing for rules](https://prometheus.io/docs/prometheus/latest/configuration/unit_testing_rules/)

## Issues Found

- The opening called the allowed bad-event allowance a "request budget." Changed it to "error budget" and made the steady 10-requests-per-hour assumption explicit. The calculation itself was correct: the nominal budget is 7.2 bad-request equivalents, and one failure consumes approximately 13.9%.
- The labeled-counter example did not state that expected label sets must exist before the first bad event. Added a requirement to initialize and scrape expected label sets at zero; otherwise, a first increment that predates the series's first sample cannot be recovered by `increase()`.
- The volume gate could be read as an exact count of 100 events. Clarified that `increase()` extrapolates to the range boundaries, making this an estimated window volume that can be non-integer.
- The service-combination guidance treated a shared failure domain as an alternative to semantic relatedness. Changed it to require a meaningful higher-level function and describe a shared failure domain as preferable, consistent with Google SRE guidance.
- The `absent_over_time()` advice was too broad to identify one vanished labeled series while other series remained. Scoped it to each known service and label set.

## Review Notes

- The live Google SRE Workbook currently says that one failure among 10 requests is a `1,000x` burn for a 99.9% SLO. Its own burn-rate definition, error-rate table, and 13.9% budget-consumption result imply `100x`, so the post's correction is accurate.
- The `14.4` multiplier is correct for a page threshold representing 2% of a 30-day error budget consumed in one hour.
- The PromQL comparison and `and on (service)` semantics are correct, and applying `increase()` before aggregation preserves per-series counter-reset handling.
- The `up` metric covers scrape failures for discovered targets. Inventory or absence monitoring is still needed when an expected target disappears from service discovery.
- All links in the post were reachable during validation. No deprecated APIs or version-specific incompatibilities were found.
