# Validation Summary: How to Monitor Flux CD Source Fetch Latency

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Flux CD
- Flux source-controller
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PodMonitor and PrometheusRule resources
- Grafana dashboard JSON

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux source-controller documentation: https://fluxcd.io/flux/components/source/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI `flux get sources git` documentation: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference for PodMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post listed `exported_namespace` as a label on `gotk_reconcile_duration_seconds`. Flux documents `kind`, `name`, `namespace`, and `le` for the histogram buckets; `exported_namespace` belongs to kube-state-metrics resource metrics such as `gotk_resource_info`. Removed the incorrect label.
- The scrape example used a `ServiceMonitor` targeting port `http-prom`. The default Flux source-controller Service exposes the artifact server on `http`, while the metrics endpoint is exposed on the controller Pod as `http-prom`. Changed the example to a `PodMonitor` using `podMetricsEndpoints`.
- The standalone percentile PromQL examples passed raw bucket rates to `histogram_quantile()` without aggregating by `le` and resource labels. Updated them to use `sum(rate(...)) by (le, kind, name, namespace)`, matching Prometheus guidance for classic histograms.
- The Grafana P95 query omitted `namespace`, which could merge sources with the same name and kind across namespaces. Added `namespace` to the aggregation and legend.
- The average-by-kind PromQL used an invalid/commented aggregation form and the Grafana query averaged per-source averages. Replaced both with `sum(rate(_sum)) / sum(rate(_count))` grouped by `kind`.
- The post described the histogram as direct fetch latency in a few places. Flux exposes reconciliation duration, which includes fetch time but is not a fetch-only metric. Adjusted wording and panel titles to say reconciliation duration where accuracy matters.

## Review Notes
The corrected metric is still useful as a practical proxy for slow source fetches, but it includes the full source reconciliation path. A future improvement would be to mention that Prometheus must be configured to select PodMonitor resources in the namespace where the PodMonitor is created.
