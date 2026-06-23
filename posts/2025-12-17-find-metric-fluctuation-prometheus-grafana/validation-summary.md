# Validation Summary: How to Find Metric Fluctuation in Prometheus/Grafana

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting and recording rules
- Grafana dashboards
- Grafana annotations

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics and subquery syntax: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators and aggregation syntax: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana annotation query documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/annotate-visualizations/

## Issues Found
- The historical baseline example subtracted raw `http_requests_total` counter values. Changed it to compare `rate(http_requests_total[5m])` with the 24-hour offset rate, because Prometheus counters should generally be compared with `rate()` to account for resets.
- The `process_start_time_seconds` example described configuration changes, but that metric changes when a process restarts. Updated the comment to say process restart detection.
- The histogram quantile examples used raw per-bucket series directly. Updated them to aggregate classic histogram buckets with `sum by (le) (rate(..._bucket[...]))`, matching Prometheus histogram query guidance.
- The Grafana annotation snippet used a YAML provisioning shape that is not the dashboard annotation query model. Replaced it with a dashboard JSON `annotations.list` example using a Prometheus annotation query target.
- The practical CPU and network examples placed `by (...)` after `stddev_over_time(...)`, which is invalid because `by` applies to PromQL aggregation operators, not range-vector functions. Updated the snippets to aggregate with `sum by (...)` first, then apply a subquery and `stddev_over_time`.
- The error-rate stability example applied a range selector directly to a function result without subquery syntax. Updated it to use `[10m:1m]`.

## Review Notes
Validated the edited PromQL forms with `promtool promql format` from the current `prom/prometheus:latest` container image. Some example metric names, such as `http_request_duration_seconds`, assume a float gauge or derived time series; for classic Prometheus histograms, the `_bucket`, `_sum`, and `_count` series shown later in the post are the more typical shape.
