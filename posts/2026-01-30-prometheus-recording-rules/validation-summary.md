# Validation Summary: How to Build Prometheus Recording Rule Optimization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (recording rules, rule groups, PromQL)
- promtool (rule validation CLI)
- YAML (rule file format)
- Prometheus self-monitoring metrics
- SLI/SLO patterns (availability, latency budgets)

## Sources Consulted
- Prometheus Recording Rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus naming/instrumentation best practices: https://prometheus.io/docs/practices/naming/ and https://prometheus.io/docs/practices/rules/
- Prometheus `rules/group.go` source (definitions of `prometheus_rule_evaluation_duration_seconds`, `prometheus_rule_evaluation_failures_total`, `prometheus_rule_group_last_duration_seconds`, `prometheus_rule_group_last_evaluation_timestamp_seconds`): https://github.com/prometheus/prometheus/blob/main/rules/group.go
- Brian Brazil, "What range should I use with rate()?" — Robust Perception: https://www.robustperception.io/what-range-should-i-use-with-rate/
- Grafana `$__rate_interval` documentation (defined as `max(4 * scrape_interval, $__interval)`): https://grafana.com/blog/new-in-grafana-7-2-rate-interval-for-prometheus-rate-queries-that-just-work/

## Issues Found

1. **Invalid use of `histogram_quantile` on a Summary metric (Monitoring Your Recording Rules section).** The post used `histogram_quantile(0.99, sum by (rule_group) (rate(prometheus_rule_evaluation_duration_seconds_bucket[5m])))`. This is broken for two reasons:
   - `prometheus_rule_evaluation_duration_seconds` is registered as a **Summary** in Prometheus's `rules/group.go`, so no `_bucket` time series exists — the query would return nothing.
   - The Summary has no `rule_group` label, so `sum by (rule_group)` would not partition anything.

   Fixed by replacing the recording rule to use `prometheus_rule_group_last_duration_seconds` (a `GaugeVec` with a `rule_group` label), which is the canonical per-group duration metric. The accompanying table row was updated to reference this metric and corrected its description.

2. **"Rate window should be at least 4x the evaluation interval" guidance (Pitfall 2).** The widely cited Prometheus best practice (Brian Brazil; Grafana's `$__rate_interval`) is that the rate range should be at least **4x the scrape interval**, not the evaluation interval. Corrected the comment to reflect the scrape-interval rule and added that it should also be no shorter than the evaluation interval (the actual reason the BAD example breaks).

## Review Notes
- YAML rule group schema (`groups[].name`, `interval`, `limit`, `rules[].record`, `expr`, `labels`) matches current Prometheus docs.
- `level:metric:operations` naming convention is correctly cited from the official naming guide.
- The `promtool check rules` invocation and example output format are accurate.
- All PromQL examples (rate/sum-by/histogram_quantile patterns, SLI ratios, hierarchical aggregations) are syntactically valid and semantically sound. The histogram_quantile usage in the SLI/latency examples is correct because those operate on user histogram `_bucket` series (e.g. `http_request_duration_seconds_bucket`), unlike the broken self-monitoring example that was fixed.
- The dependency ordering rule for Pitfall 3 (rules in the same group can reference each other because they evaluate sequentially) is consistent with Prometheus documentation.
- Performance numbers (2.3s → 12ms) are illustrative and not verifiable, but presented as an example rather than a benchmark, which is acceptable.
