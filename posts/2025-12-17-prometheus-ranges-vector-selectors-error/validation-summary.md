# Validation Summary: How to Fix 'ranges only allowed for vector selectors' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting rules
- Prometheus recording rules

## Sources Consulted
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus subquery support announcement: https://prometheus.io/blog/2019/01/28/subquery-support/

## Issues Found
- The `group_left`/`group_right` example fixed a range-on-join error by applying `rate()` to only one input metric. That was not a general equivalent fix and incorrectly assumed a counter metric. Changed it to use subquery syntax for the join result.
- The CPU examples used `sum(rate(node_cpu_seconds_total{mode!="idle"}[5m]))`, which reports aggregate non-idle CPU seconds per second and can exceed 1 on multi-core hosts. Changed the examples to calculate utilization as `1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))`, with `by (instance)` where instance-level output is needed.
- The `deriv()` wrong example applied `[1h]` after the function call, which did not clearly demonstrate the intended range-selector-on-function-result issue because `deriv()` itself requires a range vector. Changed it to `deriv(rate(http_requests_total[5m])[1h])`, with the existing subquery-based fix retained.
- The recording-rule section said the recorded metrics could be used "in subqueries" even though the shown queries use normal range selectors on recorded metric names. Changed the wording to "with range selectors."
- The quick-reference table used counter-specific `rate()` fixes for generic metric names and had an inconsistent placeholder in the division example. Changed those entries to subquery-based fixes.

## Review Notes
The main explanation of instant vectors, range vectors, range selectors, and subquery syntax matches the Prometheus documentation. The post still uses generic metric names in several examples, so readers should choose `rate()`, `increase()`, or over-time functions based on whether their metrics are counters or gauges.
