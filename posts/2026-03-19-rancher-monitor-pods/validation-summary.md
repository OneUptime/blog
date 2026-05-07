# Validation Summary: How to Monitor Pod Resource Consumption in Rancher

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
- Prometheus Operator
- kube-state-metrics
- cAdvisor
- Metrics Server
- kubectl

## Sources Consulted
- Rancher Monitoring and Alerting: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher Built-in Dashboards: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Rancher Role-based Access Control for Monitoring: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/monitoring-and-alerting/rbac-for-monitoring
- Rancher Customizing Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/customize-grafana-dashboard
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- RKE2 Managing Packaged Components: https://docs.rke2.io/install/packaged_components
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#top
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- kube-prometheus dashboard definitions: https://github.com/prometheus-operator/kube-prometheus/blob/main/manifests/grafana-dashboardDefinitions.yaml

## Issues Found
1. **Metrics Server prerequisite was overstated**: The post treated Metrics Server as a general prerequisite for Rancher pod monitoring. Updated the prerequisite so Metrics Server is only required for Rancher usage columns and the `kubectl top` commands, which matches the Kubernetes `top` documentation and Rancher’s Prometheus/Grafana monitoring model.

2. **Rancher UI resource visibility needed a condition**: The post stated that pod CPU and memory usage always appears in the Rancher UI. Updated this to clarify that the usage columns depend on resource metrics being available.

3. **Single-pod CPU/request query could aggregate across namespaces**: The original PromQL filtered only on `pod="my-pod"`. Added `namespace="my-namespace"` and grouped by `(namespace, pod)` so the query is unambiguously pod-specific.

4. **Top-N pod queries could include non-pod series**: Added `pod!=""` to the top CPU and memory queries so they stay scoped to actual pod series.

5. **`Pods Without Memory Limits` query used an invalid set match**: The original `unless` expression compared `kube_pod_container_info` with `kube_pod_container_resource_limits` without vector matching, which does not work because the metrics have different label sets. Added `on (namespace, pod, container)` so the query correctly finds containers that have no memory limit.

6. **`Pods Not Ready` query was too broad**: Replaced the query with one that checks `kube_pod_status_ready{condition="false"}` and restricts results to `Pending`, `Running`, or `Unknown` pods, which better matches the section title and avoids phase-only ambiguity.

7. **`PodFrequentRestart` alert was container-scoped, not pod-scoped**: The original alert used `increase(kube_pod_container_status_restarts_total[1h]) > 5`, which fires per container. Changed it to `sum(... ) by (namespace, pod) > 5` so it actually measures pod-level restart frequency.

8. **`PodNotReady` alert did not match its name**: The original alert only matched `Pending|Unknown` pod phases, which misses running-but-unready pods. Updated the expression to use pod readiness plus phase filtering, and adjusted the annotation text to describe the corrected condition.

## Review Notes
- The built-in Rancher Grafana dashboard name `Kubernetes / Compute Resources / Pod` is current and matches the upstream `kube-prometheus` dashboard set that Rancher deploys.
- The PrometheusRule manifest is syntactically valid for `monitoring.coreos.com/v1`.
- The kube-state-metrics metrics used in the post are current and valid, but the upstream kube-state-metrics documentation notes that `kube_pod_container_resource_requests` and `kube_pod_container_resource_limits` are less precise than the scheduler-exposed `kube_pod_resource_*` metrics. For Rancher’s default monitoring stack, the current queries are still workable and common.
