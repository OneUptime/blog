# Validation Summary: How to Set Up Prometheus for Kubernetes Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus (server, configuration, PromQL)
- Kubernetes (Deployment, Service, ConfigMap, RBAC, ServiceAccount, ClusterRole)
- Helm 3 (kube-prometheus-stack, kube-state-metrics, prometheus-node-exporter charts)
- kube-state-metrics
- Node Exporter
- cAdvisor / kubelet
- Alertmanager, Grafana (referenced)

## Sources Consulted
- Prometheus Kubernetes service discovery & example config — https://github.com/prometheus/prometheus/blob/main/documentation/examples/prometheus-kubernetes.yml
- prometheus-community Helm charts (kube-prometheus-stack, kube-state-metrics, prometheus-node-exporter) — https://github.com/prometheus-community/helm-charts
- Kubernetes Deprecated API Migration Guide — https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes 1.22 API removals blog — https://kubernetes.io/blog/2021/07/14/upcoming-changes-in-kubernetes-1-22/
- kube-prometheus issue on ingress RBAC apiGroup — https://github.com/prometheus-operator/kube-prometheus/issues/993
- kube-state-metrics metrics reference (kube_deployment_*, kube_pod_container_status_restarts_total) — https://github.com/kubernetes/kube-state-metrics/tree/main/docs

## Issues Found
- **Deprecated `extensions` API group for ingresses in the ClusterRole.** The RBAC manifest granted ingress read access via `apiGroups: ["extensions"]`. The `extensions/v1beta1` Ingress API was deprecated in Kubernetes 1.14 and **removed in v1.22**; the Ingress resource now lives under `networking.k8s.io`. On any current cluster (the post targets v1.19+ and is dated late 2025) this rule would not grant access to ingresses, producing "cannot list resource ingresses.networking.k8s.io" errors. Changed `apiGroups: ["extensions"]` to `apiGroups: ["networking.k8s.io"]` to match the current API group used by the official Prometheus/kube-prometheus reference configs.

## Review Notes
- The `kube-prometheus-stack`, `kube-state-metrics`, and `prometheus-node-exporter` Helm chart names and the `prometheus-community` repo URL are all correct and current.
- The Helm `--set` paths (`prometheus.prometheusSpec.retention`, `...storageSpec.volumeClaimTemplate.spec.resources.requests.storage`) are valid for the kube-prometheus-stack chart.
- The scrape config (relabel rules for apiservers, nodes, and annotation-based pod discovery) follows the canonical Prometheus example, including the standard `([^:]+)(?::\d+)?;(\d+)` address-rewrite regex.
- `prom/prometheus:v2.47.0` is a real, valid image tag. It is not the latest (Prometheus 3.x has since been released), but the manual-deployment example remains correct as written; readers may wish to use a newer tag.
- All PromQL queries are valid and reference correct metric names (`node_cpu_seconds_total`, `node_memory_MemAvailable_bytes`, `node_memory_MemTotal_bytes`, `kube_pod_container_status_restarts_total`, `container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, `kube_deployment_status_replicas_available`, `kube_deployment_spec_replicas`).
- The manual deployment uses an `emptyDir` volume for storage; the post correctly notes persistent storage as a best practice for production, so this is acceptable for a tutorial baseline.
