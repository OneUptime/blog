# Validation Summary: How to Understand rate() vs increase() in Prometheus

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus counters and gauges
- Prometheus recording rules
- Grafana dashboard queries

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/

## Issues Found
- The mathematical definitions for `rate()` and `increase()` were too exact and omitted Prometheus extrapolation behavior. Updated them to describe adjusted/extrapolated increases and added a short note about extrapolation in `rate()`.
- Generic `rate(counter[time_range])` and `increase(counter[time_range])` snippets were not valid PromQL range selectors. Replaced them with valid `[5m]` examples.
- The relationship example used pseudo-operator syntax in a `promql` code fence. Changed the fence to `text`.
- The raw `rate(node_cpu_seconds_total[5m])` example was described as CPU utilization. Updated the wording to say it returns CPU seconds per second split by CPU and mode.
- The reset explanation implied Prometheus reconstructs a counter value as `previous value + post-reset value`. Updated it to explain that post-reset increase is added to pre-reset increases.
- One graphing example said `rate()` shows an instantaneous rate. Updated it to per-second average rate; `irate()` is the instantaneous-rate function.
- Inline comments were used after PromQL expressions. Moved them onto separate comment lines so the snippets are valid PromQL.
- `[24h]` examples were described as "today". Updated them to "last 24 hours" because PromQL range selectors are rolling ranges unless additional time alignment is applied.
- The recording-rule example used `increase()` recording rules, while Prometheus recommends using `rate()` in recording rules and reserving `increase()` primarily for human readability. Removed the `increase()` recording-rule group and kept rate-based recording rules.

## Review Notes
The remaining examples are technically valid but some production dashboards may need additional aggregation or label filtering, especially for CPU metrics and error-rate ratios.
