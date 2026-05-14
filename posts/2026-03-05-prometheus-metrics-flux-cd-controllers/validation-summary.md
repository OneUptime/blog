# Validation Summary: How to Set Up Prometheus Metrics for Flux CD Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-prometheus-stack
- kube-state-metrics
- Grafana
- PromQL

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Prometheus Operator troubleshooting documentation: https://prometheus-operator.dev/docs/platform/troubleshooting/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Prometheus histogram and PromQL documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The post described `gotk_reconcile_condition` and `gotk_suspend` as common Flux controller metrics. Current Flux documentation lists controller-exported reconciliation duration metrics and uses kube-state-metrics custom resource metrics, especially `gotk_resource_info`, for resource readiness and suspension state. Updated the metric examples, PromQL queries, alert expressions, verification query, and cardinality note accordingly.
- The post used a `ServiceMonitor` to scrape Flux controllers. Flux's monitoring example uses a `PodMonitor` selecting Flux controller Pods and the `http-prom` port. Updated the operator configuration examples from `ServiceMonitor`/`serviceMonitor*` to `PodMonitor`/`podMonitor*`.
- The raw Prometheus scrape configuration used Kubernetes service discovery with `role: service` and service labels. Since the corrected setup scrapes controller Pods directly, changed it to `role: pod` with pod label and container port relabeling.
- The dashboard section claimed the official Flux dashboard is imported with Grafana dashboard ID `16714`. Flux documentation points to dashboard JSON files in the `fluxcd/flux2-monitoring-example` repository instead. Updated the import instructions to reference those JSON dashboards.
- The troubleshooting section told readers to inspect Services for the `http-prom` port and referred to ServiceMonitor discovery. Updated it to inspect Pod container ports and PodMonitor discovery.

## Review Notes
The controller duration PromQL examples are valid for Flux controller metrics. The readiness and suspension queries require kube-state-metrics to be configured for Flux custom resources as shown in the Flux monitoring example; without that configuration, `gotk_resource_info` will not exist.
