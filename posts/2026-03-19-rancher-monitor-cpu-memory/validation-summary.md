# Validation Summary: How to Monitor Cluster CPU and Memory Usage in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Prometheus
- PromQL
- Grafana
- Prometheus Operator / PrometheusRule
- Metrics Server

## Sources Consulted
- Rancher documentation, Built-in Dashboards: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Rancher documentation, Persistent Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher documentation, Access Clusters: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Kubernetes documentation, `kubectl top pod`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes documentation, `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes documentation, Resource metrics pipeline: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- kube-state-metrics documentation, Pod Metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics documentation, Node Metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The Rancher menu path for the Prometheus UI was inaccurate. I changed `Monitoring > Prometheus` to `Monitoring > Prometheus Graph` to match current Rancher documentation.
- The persistent Grafana dashboard example used the wrong namespace. I changed the ConfigMap namespace from `cattle-monitoring-system` to `cattle-dashboards`, which is the default namespace Rancher Monitoring watches for `grafana_dashboard` ConfigMaps.
- The persistent Grafana dashboard example embedded an API-style JSON wrapper (`"dashboard": { ... }`) instead of the exported dashboard JSON model Rancher expects in the ConfigMap data. I replaced the example with the correct documented pattern: store the exported dashboard JSON model directly in the ConfigMap.
- The note about `kubectl top` said Rancher typically deploys Metrics Server by default. That is too broad across Rancher-managed cluster types. I corrected the note to state the actual requirement: Metrics Server must be installed and working in the cluster.

## Review Notes
- The PromQL metric names used in the post are valid against current `kube-state-metrics` and node-exporter naming. However, `kube-state-metrics` notes that kube-scheduler exposes more precise pod request and limit metrics (`kube_pod_resource_request` and `kube_pod_resource_limit`) when the scheduler resource metrics endpoint is enabled.
- `kubectl` is not installed in this workspace, so CLI flags were verified against the upstream Kubernetes command reference rather than local `--help` output.
