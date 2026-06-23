# Validation Summary: How to Create Prometheus Metrics for Over Time Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus alerting rules
- Grafana dashboard queries

## Sources Consulted
- Prometheus documentation: Query functions, including `changes()`, `histogram_quantile()`, `increase()`, and `_over_time` functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Querying basics, including range vectors, `offset`, subqueries, and PromQL comments: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus documentation: Defining recording and alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus `promtool` 3.5.0: used `promtool check rules` and `promtool --experimental promql format` for parser validation.

## Issues Found
- The "same hour yesterday" query placed `offset 24h` after `rate(...)` and placed the subquery range outside the `avg_over_time(...)` call, which is invalid PromQL. Changed it to `avg_over_time(rate(http_requests_total[5m] offset 24h)[1h:5m])`, matching Prometheus' requirement that `offset` immediately follow the vector selector.
- The average daily growth query placed `offset 30d` after `rate(...)`, which is invalid PromQL. Changed it to `avg_over_time(sum(rate(http_requests_total[5m] offset 30d))[1d:1h])`.
- The standard deviation recording rule applied `stddev by (service)` around `stddev_over_time(...)` after already aggregating to one series per service. That outer aggregation would reduce each single-series group to zero. Removed the outer `stddev by (service)` so the rule records the actual per-service time-window standard deviation.
- The `sum_over_time()` gauge example described the result as "Total samples", which could be confused with `count_over_time()`. Reworded it to "Sum of gauge sample values".

## Review Notes
The corrected PromQL expressions parse with `promtool --experimental promql format`. The recording and alerting rule examples parse successfully with `promtool check rules`. Some metric names in the article, such as `node_cpu_utilization` and `http_request_duration_seconds`, are illustrative and may need adjustment for a reader's actual instrumentation or exporter conventions.
