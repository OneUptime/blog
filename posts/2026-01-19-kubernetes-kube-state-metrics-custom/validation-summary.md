# Validation Summary: How to Create Custom Kubernetes Metrics with kube-state-metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kube-state-metrics
- Prometheus
- Prometheus Operator `PrometheusRule` and `ServiceMonitor` resources
- Helm
- Grafana
- Go client-go and Prometheus Go client

## Sources Consulted
- kube-state-metrics README: https://github.com/kubernetes/kube-state-metrics
- kube-state-metrics Custom Resource State Metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- kube-state-metrics v2.10.1 Custom Resource State Metrics documentation: https://raw.githubusercontent.com/kubernetes/kube-state-metrics/v2.10.1/docs/customresourcestate-metrics.md
- prometheus-community kube-state-metrics Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-state-metrics/values.yaml
- Prometheus Operator API documentation: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Prometheus Go client documentation: https://pkg.go.dev/github.com/prometheus/client_golang/prometheus
- Kubernetes client-go documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes

## Issues Found
- The post described kube-state-metrics as being extended with "custom collectors." The upstream custom resource feature is Custom Resource State Metrics, not custom collectors in the kube-state-metrics binary. Updated the wording and diagram label.
- The custom resource state examples omitted `kind: CustomResourceStateMetrics`, which is part of the documented configuration format. Added it to both the Helm values example and ConfigMap example.
- The Helm example enabled custom resource state metrics without adding RBAC for CRDs and Argo CD Applications. Added `rbac.extraRules` for `customresourcedefinitions.apiextensions.k8s.io` and `applications.argoproj.io`.
- The manifest-based custom config section did not call out that the kube-state-metrics ServiceAccount needs `list` and `watch` permissions for CRDs and each configured custom resource. Added a short note before the Deployment example.
- The Argo CD sync status example used a Gauge against the string value `status.sync.status`, which would fail for values like `Synced` and `OutOfSync`. Changed it to a `StateSet`, which is the documented pattern for enum-like status fields.
- The examples queried custom resource metric names without kube-state-metrics' default custom resource prefix. Added `metricNamePrefix: ""` to the custom resource configs so the emitted metrics match the dashboard and alert queries shown in the post.
- `namespacesDenylist` was shown as an empty YAML list even though the Helm chart documents it as a comma-separated string value. Changed it to an empty string.
- The "Custom Metrics via Sidecar" section deployed a standalone exporter Deployment rather than a sidecar in the kube-state-metrics Pod. Renamed the section to "Custom Metrics via Exporter."

## Review Notes
The pinned kube-state-metrics image `v2.10.1` is older than the current upstream release, but the custom resource state feature, flags, and metric types used in the article are still valid. The Grafana JSON is illustrative rather than a complete importable dashboard model.
