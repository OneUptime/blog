# Validation Summary: How to Use GitOps Observability by Monitoring Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor, PodMonitor, and PrometheusRule resources
- Grafana dashboards and Loki data source provisioning
- OpenTelemetry
- Go Prometheus client instrumentation

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux monitoring example repository: https://github.com/fluxcd/flux2-monitoring-example
- Flux notification Provider documentation for OTEL: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Grafana Loki data source provisioning documentation: https://grafana.com/docs/grafana/latest/datasources/loki/
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/

## Issues Found
- The Flux source-controller port-forward command targeted `svc/source-controller 8080:80`, which forwards to the source artifact service rather than the controller metrics port. I changed it to port-forward the `source-controller` Deployment on `8080:8080`.
- The post used older Flux resource-state metrics, `gotk_reconcile_condition` and `gotk_suspend_status`, as controller metrics. Current Flux documentation describes controller metrics such as `gotk_reconcile_duration_seconds_*` and resource-state metrics through kube-state-metrics as `gotk_resource_info`. I replaced readiness and suspension examples, recording rules, alerts, and dashboard expressions with `gotk_resource_info`.
- The Flux Prometheus scrape example used a `ServiceMonitor` with the pod port name `http-prom`. Flux's monitoring setup uses a `PodMonitor` for controller pods on `http-prom`, so I changed the example to `PodMonitor` with `podMetricsEndpoints`.
- The Flux success-rate recording rule used `rate()` on a resource condition gauge. I changed it to a current ready-resource ratio based on `gotk_resource_info`.
- The Flux slow reconciliation alert and dashboard referenced `gotk_reconcile_duration_seconds` as a direct time series. The documented Flux metric is a histogram with `_bucket`, `_sum`, and `_count` series, so I updated the alert to use `histogram_quantile()` over bucket rates and the dashboard to calculate average duration from sum/count rates.
- The Argo CD metric list and dashboard used the non-documented `argocd_app_reconcile_duration_seconds` metric. Official Argo CD documentation lists the reconciliation histogram as `argocd_app_reconcile`, which appears in Prometheus as `argocd_app_reconcile_bucket`, `_sum`, and `_count`. I updated those examples.
- The Argo CD out-of-sync recording rule name had a typo, `argocd:apps:outofync:count`. I corrected it to `argocd:apps:outofsync:count`.
- The Argo CD sync success-rate rule divided unaggregated counter rates, which could fail label matching or produce unintended per-series ratios. I wrapped both sides in `sum(...)`.
- The Argo CD Git latency alert used `histogram_quantile()` over unaggregated bucket rates. I updated it to `sum by (le) (rate(..._bucket[5m]))`, matching Prometheus histogram guidance.
- The Grafana Loki data source provisioning placed `derivedFields` at the data source top level. Grafana documents derived fields under `jsonData`, so I moved the field there.
- The Flux OpenTelemetry example patched controller environment variables, which is not the documented Flux event tracing integration. I replaced it with a Flux `Provider` of type `otel` and an `Alert` that forwards Flux events.
- The Go custom metric snippet used `package main` without a `main()` function. I changed it to `package metrics` so the snippet is a valid library-style instrumentation example.

## Review Notes
The Flux resource-state queries require kube-state-metrics custom resource metrics configured to export `gotk_resource_info`; scraping Flux controller pods alone provides controller runtime and reconciliation duration metrics, not readiness and suspension labels.
