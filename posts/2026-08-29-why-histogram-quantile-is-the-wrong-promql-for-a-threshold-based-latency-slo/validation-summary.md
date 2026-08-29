# Validation Summary: Why histogram_quantile Is the Wrong PromQL for a Threshold-Based Latency SLO

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus classic histograms
- Prometheus native histograms and native histograms with custom bucket boundaries (NHCBs)
- PromQL, including `histogram_quantile()`, `histogram_fraction()`, `rate()`, and `increase()`
- Latency SLIs, SLOs, error budgets, and burn rates
- Prometheus recording rules

## Sources Consulted

- [Prometheus: Histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus: Query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus: Native histogram specification](https://prometheus.io/docs/specs/native_histograms/)
- [Prometheus: Querying basics and avoiding slow queries](https://prometheus.io/docs/prometheus/latest/querying/basics/#avoiding-slow-queries-and-overloads)
- [Prometheus: Defining recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [Google SRE Workbook: Example Error Budget Policy](https://sre.google/workbook/error-budget-policy/)
- [GitHub author profile](https://github.com/nawazdhandala) for link-target verification

## Issues Found

- The post described the observed bad-event ratio as a “bad-event error budget.” An error budget is determined by `1 - SLO target`; the measurement produces a bad-event ratio that is compared with that budget. The wording now states that the good-event ratio's complement is the bad-event ratio used to calculate error-budget burn.
- The post required identical status filters on the numerator and denominator for both failed-request policies. That is incorrect when failures count as latency misses: failures must be absent from the good-event numerator but present in the denominator. The population guidance now distinguishes a success-only latency SLO from an SLO in which every failure is a bad event, while keeping route, tenant, and eligibility scope aligned.

## Review Notes

- All four PromQL examples are syntactically valid and match current Prometheus query semantics. The classic bucket query uses the required exact cumulative `le="0.3"` bucket, applies `rate()` before aggregation, and divides aggregated good observations by aggregated total observations.
- The native histogram query correctly applies `histogram_fraction(0, 0.3, ...)`. The post already explains that the result is estimated when the boundary does not align with a native bucket and that NHCB layout compatibility matters.
- Native histograms are stable starting with Prometheus 3.8. In Prometheus 3.9, scraping them still requires explicitly enabling `scrape_native_histograms`; this is an ingestion prerequisite and does not change the query shown for an already-ingested native histogram.
- `increase()` extrapolates to the full selected range and may produce non-integer values. The long-window ratio remains valid, and the post appropriately recommends recording rules for recurring alert evaluation.
- All reference links and the author profile link resolved to the intended resources on the validation date.
