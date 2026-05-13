# Validation Summary: How to Monitor Calico Component Metrics Monitoring Health

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Felix and Typha metrics
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Grafana-style dashboard queries

## Sources Consulted
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico documentation, Monitoring Typha with Prometheus: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Prometheus documentation, Query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation, Metric types: https://prometheus.io/docs/concepts/metric_types/
- Prometheus documentation, Getting started: https://prometheus.io/docs/prometheus/latest/getting_started/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
1. The Typha missing-metrics alert used `typha_connections_total`, which is not listed in the current Calico OSS Typha metric reference. I changed it to `typha_connections_active`, a documented Typha gauge that indicates open client connections.
2. The dashboard query for "Last successful scrape per target" used `time() - max(last_over_time(up[10m]))`, but `last_over_time(up[10m])` returns the latest `up` sample value, not the sample timestamp. I changed the panel to "Last scrape sample age per target" and used `time() - timestamp(up{job=~"calico-.*"})`.
3. The scrape duration panel queried `prometheus_target_interval_length_seconds_bucket`, but `prometheus_target_interval_length_seconds` is documented as a summary-style metric with quantile labels, not a histogram bucket series. I changed the panel to use Prometheus' per-target `scrape_duration_seconds` metric.

## Review Notes
- The example assumes the Prometheus `job` labels are `calico-felix-metrics` and match `calico-.*`; those labels depend on the local scrape configuration or ServiceMonitor setup.
- `PrometheusRule` resources may need deployment-specific labels so the Prometheus instance's rule selector picks them up.
- Typha is optional in Calico deployments, so the informational Typha missing-metrics alert is appropriately caveated.
