# Validation Summary: How to Configure Custom Prometheus Metrics for Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-state-metrics
- Python Kubernetes client
- prometheus-client for Python

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator API reference for PodMonitor: https://prometheus-operator.dev/docs/api-reference/api/
- Kubebuilder/controller-runtime metrics reference: https://book-v3.book.kubebuilder.io/reference/metrics-reference
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Python client CustomObjectsApi documentation: https://github.com/kubernetes-client/python/blob/master/kubernetes/docs/CustomObjectsApi.md
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/

## Issues Found
- The custom exporter used `list_cluster_custom_object` to list Flux Kustomizations. Current Kubernetes Python client documentation distinguishes this from `list_custom_object_for_all_namespaces`, which is the method for listing namespace-scoped custom objects across all namespaces. Updated the exporter script to call `list_custom_object_for_all_namespaces` with `resource_plural="kustomizations"`.
- The exporter deployment relied on `prometheus.io/scrape` pod annotations even though the post uses Prometheus Operator resources such as `PrometheusRule`. Prometheus Operator discovers scrape targets through resources such as `PodMonitor` and `ServiceMonitor`. Replaced the annotation-only scrape setup with a named `metrics` container port and a matching `PodMonitor`.

## Review Notes
- The Flux metric names and labels used in the recording rules match the current Flux monitoring documentation: controller metrics such as `gotk_reconcile_duration_seconds_*` and `controller_runtime_reconcile_total`, and resource-state metrics such as `gotk_resource_info` from kube-state-metrics custom resource configuration.
- The `gotk_resource_info` queries assume kube-state-metrics is configured for Flux custom resource state metrics. Without that setup, those series will not exist.
- Local checks: all YAML code blocks in the post parsed successfully with PyYAML, and `validation.json` was validated with `jq`. `promtool` is not installed in this workspace, so Prometheus rule validation was performed by documentation review and syntax inspection rather than by running `promtool check rules`.
