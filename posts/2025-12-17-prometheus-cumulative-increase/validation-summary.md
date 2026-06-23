# Validation Summary: How to Calculate Cumulative Increase in Prometheus

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus counters
- PromQL `increase()`, `rate()`, `resets()`, `sum_over_time()`, and subqueries
- Prometheus recording rules and alerting rules

## Sources Consulted
- Prometheus documentation: Metric types - https://prometheus.io/docs/concepts/metric_types/
- Prometheus documentation: Querying functions - https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Querying basics and subqueries - https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Recording rules - https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The subquery examples were described as "cumulative running" totals. The shown PromQL calculates rolling totals over a lookback window, so the wording was changed to "rolling total" while preserving the examples.
- Two examples described `increase(...[24h])` as "today" totals. A 24-hour range selector returns the last 24 hours relative to the evaluation time, not the calendar day, so those comments were changed to "last 24 hours."

## Review Notes
The PromQL examples use supported functions and syntax according to the current Prometheus documentation. Prometheus documents `increase()` as syntactic sugar for `rate()` multiplied by the range duration and recommends using `rate()` in recording rules for consistent per-second tracking; the recording-rule examples in the post are valid PromQL, but rate-based recording rules may be preferable for production rule design.
