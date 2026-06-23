# Validation Summary: How to Filter Prometheus Results by Metric Value

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus recording rules
- Prometheus alerting rules
- Grafana Prometheus panels
- kube-state-metrics ResourceQuota metrics

## Sources Consulted
- Prometheus operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Grafana Prometheus query editor documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- kube-state-metrics project documentation: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The ResourceQuota CPU quota example divided usage by all `kube_resourcequota{resource="limits.cpu"}` series, which can include both `type="hard"` and `type="used"`. I added `type="hard"` so the denominator represents the configured quota limit.
- Percentile and standard-deviation comparisons used aggregate results such as `quantile(...)`, `avg(...)`, and `stddev(...)` directly against per-series vectors. In PromQL, aggregate operators return instant vectors, so default vector matching would not match the per-series labels. I wrapped those one-element aggregate results in `scalar(...)` for valid vector-to-scalar comparisons.
- The anomaly query comparing per-instance request rates to the global average had the same vector-matching issue. I wrapped the aggregate threshold in `scalar(...)`.
- The `HighCPUUsage` alert printed a ratio value as a percent with `printf`, which would display `0.8%` for `0.8`. I changed it to use Prometheus' `humanizePercentage` template function.

## Review Notes
- The examples use common metric names from exporters and application instrumentation. Some names, such as `node_cpu_utilization`, are typically recording rules or platform-specific metrics rather than raw node-exporter metrics.
- `topk()` and `bottomk()` return the top or bottom series at each evaluation timestamp. In range graphs, the displayed series set can include more than `k` total series over time.
