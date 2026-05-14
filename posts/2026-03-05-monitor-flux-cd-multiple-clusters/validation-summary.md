# Validation Summary: How to Monitor Flux CD Across Multiple Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator PodMonitor and PrometheusRule resources
- kube-prometheus-stack
- kube-state-metrics custom resource state metrics
- Grafana dashboard variables
- Flux notification-controller Alerts and Providers

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1 and v1beta3: https://fluxcd.io/flux/components/notification/api/v1/ and https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana variables documentation: https://grafana.com/docs/grafana/latest/variables/templates-and-variables/
- kube-prometheus-stack chart metadata and values: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found
- The post used `gotk_reconcile_condition` for Flux resource readiness. Current Flux documentation describes controller metrics such as `gotk_reconcile_duration_seconds` and uses kube-state-metrics custom resource state metrics, especially `gotk_resource_info`, for Flux resource readiness. I replaced readiness, dashboard, Grafana variable, and alert queries with `gotk_resource_info`.
- The post used a `ServiceMonitor` to scrape all Flux controllers. The default Flux install exposes the controller metrics port on Pods, and Flux's monitoring example uses a `PodMonitor` for the controller Pods. I changed the example to a `PodMonitor` and updated the kube-prometheus-stack selector from `serviceMonitorSelector` to `podMonitorSelector`.
- The post did not mention that `gotk_resource_info` requires kube-state-metrics custom resource state configuration. I added a short note so the readiness queries have the required metric source.
- The Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider resources, but current Flux documentation still documents Alert and Provider examples under `v1beta3`; `v1` is currently documented for Receiver. I changed the Alert and Provider snippets to `notification.toolkit.fluxcd.io/v1beta3`.
- The Slack Alert example used deprecated `.spec.summary`. I changed it to `.spec.eventMetadata.summary`, which Flux recommends for alert summary metadata.
- The kube-prometheus-stack chart version in the example was outdated (`56.x`). I updated it to the current major series observed in the chart metadata (`85.x`) as of the review date.

## Review Notes
The post is now technically consistent with current Flux monitoring guidance. The resource readiness queries assume kube-state-metrics has been configured with Flux custom resource state metrics in every cluster; without that, only the controller duration metrics will be available from Flux controller scraping.
