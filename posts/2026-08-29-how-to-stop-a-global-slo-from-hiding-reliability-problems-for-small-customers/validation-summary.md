# Validation Summary: How to Stop a Global SLO from Hiding Reliability Problems for Small Customers

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Service level objectives (SLOs) and service level indicators (SLIs)
- Multi-tenant reliability measurement and customer-level guardrails
- Prometheus metrics and PromQL
- Metric label cardinality
- Error-budget and burn-rate alerting

## Sources Consulted

- [Google SRE Workbook: Implementing SLOs](https://sre.google/workbook/implementing-slos/), including “What to Measure: Using SLIs” and “Grading Interaction Importance”
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/), including “What Do You and Your Users Care About?” and “Aggregation”
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/), including multiwindow, multi-burn-rate alerting and low-traffic services
- [Prometheus instrumentation best practices](https://prometheus.io/docs/practices/instrumentation/), including label cardinality, counters, and missing metrics
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/), including aggregation, vector matching, and division
- [Prometheus `rate()` documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/#labels)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/#metric-names-and-labels)
- [The Zen of Prometheus](https://prometheus.io/docs/practices/the_zen/), including missing-series and multiplicative-cardinality guidance
- [NIST Engineering Statistics Handbook: Confidence intervals for proportions](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm)

## Issues Found

- The PromQL numerator could be absent for a bounded cohort that had eligible failures but had never emitted an `sli_result="good"` series. PromQL drops vector elements without a matching series, so that cohort could disappear instead of reporting zero. Added a note requiring expected bounded-cohort good-result series to be initialized to zero and specifying that a zero eligible-event denominator represents no data.
- The conclusion called customer-ratio averages “statistically meaningless.” An unweighted customer-level average can be a meaningful macro-average when equal customer weighting is intentional, although it is noisy and misleading without activity qualifications. Replaced the phrase with “noisy, unqualified customer-ratio averages.”

## Review Notes

- The worked calculation is correct: `9,999,000 / 10,000,100` is approximately `99.989%`, which exceeds a `99.9%` global objective while the small tenant has zero successful requests.
- The PromQL syntax and aggregation order are current and correct for a counter: `rate()` is applied before `sum by (customer_tier)`, and numerator and denominator vectors retain matching label sets.
- The query produces a rolling five-minute SLI. It does not by itself calculate compliance over a longer SLO window, and the post does not claim that it does.
- The 100-journey eligibility threshold is clearly an illustrative policy choice, not a universal sample-size guarantee. Production thresholds should be calibrated to the product’s traffic and decision requirements.
- The fast-burn guidance is valid. For production SLO defense, Google’s more complete recommendation is multiwindow, multi-burn-rate alerting so both fast and sustained budget consumption are detected.
- All four URLs in the post resolved to the intended authoritative documentation. No deprecated APIs, version-specific errors, or invalid links were found.
