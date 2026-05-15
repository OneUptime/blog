# Validation Summary: How to Set Up Alertmanager Rules for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux CLI
- Kubernetes
- Prometheus
- Prometheus Operator
- Alertmanager
- kube-state-metrics

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux monitoring example PodMonitor: https://github.com/fluxcd/flux2-monitoring-example/blob/main/monitoring/configs/podmonitor.yaml
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI reference: https://fluxcd.io/flux/cmd/flux/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting route documentation: https://prometheus-operator.dev/docs/developer/alerting/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The `gotk_resource_info` alert annotations and Alertmanager templates used `kind` and `namespace` labels. Flux documents those labels for controller reconciliation-duration metrics, while kube-state-metrics Flux resource metrics use labels such as `customresource_kind` and `exported_namespace`. I updated the alert annotations, Alertmanager grouping, and Slack template references to use the correct kube-state-metrics labels.
- The `FluxReconciliationNotProgressing` alert used `rate(gotk_reconcile_duration_seconds_count[30m]) == 0` per time series. That can alert on individual resources that simply reconcile less often than every 30 minutes and does not handle absent metric series. I changed it to alert when the summed reconciliation rate is zero or when the metric is absent.

## Review Notes
- The `stalled` label on `gotk_resource_info` is not part of the minimal Flux custom metrics example; the post correctly lists kube-state-metrics custom resource configuration as a prerequisite for exporting it.
- The PodMonitor example matches the official Flux monitoring example for core controllers. Clusters using image automation should add `image-automation-controller` and `image-reflector-controller` to the selector values.
