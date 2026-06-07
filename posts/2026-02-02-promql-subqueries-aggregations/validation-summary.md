# Validation Summary: How to Implement PromQL Subqueries and Aggregations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PromQL (Prometheus Query Language)
- Prometheus (metrics, recording rules, alerting rules)
- Histograms and `histogram_quantile`
- Subqueries and range vectors
- Aggregation operators (`sum`, `avg`, `min`, `max`, `stddev`, `count`, `topk`, `quantile`, `group`)
- Over-time functions (`avg_over_time`, `max_over_time`, `deriv`, `predict_linear`)
- Label manipulation with `label_replace`
- Vector matching (`ignoring`, `group_left`)

## Sources Consulted
- Prometheus official query basics docs: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query operators docs (aggregation operators, `bool` modifier, vector matching): https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions docs (`rate`, `histogram_quantile`, `predict_linear`, `deriv`, `*_over_time`, `label_replace`): https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording-rule and alerting-rule reference

## Issues Found

1. **Missing `bool` modifier in sustained error-rate alert (Practical Subquery Examples → Detecting Sustained High Error Rates).**
   Original used `> 0.05` inside the `avg_over_time` subquery. Without `bool`, a PromQL comparison only filters series; it does not return `0`/`1`. The intent ("avg_over_time calculates what percentage of samples were true (1)") only works when the comparison yields `1` for true and `0` for false. Replaced `> 0.05` with `> bool 0.05` so the surrounding `avg_over_time(...) > 0.8` actually expresses "true for 80% of the past hour."

2. **Misleading `quantile` aggregator example (Aggregation Operators → Selection Aggregations).**
   The original wrapped `histogram_quantile(0.95, sum by (le) (...))` inside `quantile(0.95, ...)`. Because the inner `sum by (le)` reduces to a single series and `histogram_quantile` returns a single instant value, the outer `quantile` aggregator becomes a no-op. Rewrote the example to show `quantile(0.95, rate(..._sum)/rate(..._count))`, which properly demonstrates the `quantile` aggregator computing a percentile across series, and clarified in the comment how it differs from `histogram_quantile`.

3. **Incorrect comment in trend-detection example (Combining Subqueries and Aggregations → Trend Detection with Derivatives).**
   The subquery `[6h:1m]` produces 1-minute samples over 6 hours, but the comment described them as "hourly samples." Updated the comment to "1-minute samples over the past 6 hours."

4. **Missing `bool` modifier in SLO compliance recording rule (Recording Rules → Using Recording Rules with Subqueries).**
   The rule `service:slo_latency:compliance_1h` compared `histogram_quantile(...) < 0.5` inside `avg_over_time`. Without `bool`, the comparison only filters samples, so the average is not an SLO-compliance ratio as the comment claims ("A value of 0.99 means the service met its SLO 99% of the time"). Added `bool`: `< bool 0.5`.

## Review Notes
- The `predict_linear(..., 24 * 3600) < 0` memory-exhaustion alert is correct: the inner expression is `node_memory_MemAvailable_bytes`, so a predicted available-memory value below zero correctly indicates the projection of running out of memory.
- The `LatencyDegradation` alert uses `[30m:5m] offset 24h` on a subquery. Subquery offset is supported (per Prometheus query-basics docs) so this is valid syntax.
- The `avg by (endpoint) (http_request_duration_seconds)` example treats a typically histogram/summary metric as a plain instant vector. The PromQL is syntactically valid and acceptable as an illustrative example, but in real Prometheus deployments `http_request_duration_seconds` is conventionally a histogram (use `_sum / _count` for averages, or `histogram_quantile` for percentiles). Left as-is since the section is about `avg` syntax, not metric design.
- The nested `sum by (namespace) (sum by (namespace, pod) (...))` example for hierarchical aggregation is mathematically equivalent to a single `sum by (namespace)`; it is illustrative of the layered-grouping concept but is not strictly necessary.
- The `quantile(0.95, ...)` aggregator example I substituted is in addition to (not replacing) the latency-distribution coverage; readers wanting per-distribution percentiles should use `histogram_quantile`, which is covered elsewhere in the post.
- All `rate()` calls use `_total` counter metrics and reasonable range windows (`[5m]`). The math for data-point counts in the "Choosing Appropriate Resolution" section (8,640 / 720 / 30) is correct.
- Mermaid diagrams render cleanly and accurately depict the described relationships.
