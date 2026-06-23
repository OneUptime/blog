# Validation Summary: How to Get CPU and Memory Usage in Kubernetes Pods with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Kubernetes
- kubelet / cAdvisor metrics
- kube-state-metrics
- Prometheus recording rules and alerting rules
- Grafana dashboard queries

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics ReplicaSet metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/replicaset-metrics.md

## Issues Found
- The deployment-level aggregation query grouped by `kube_pod_owner{owner_kind="ReplicaSet"}` directly, which returns ReplicaSet owner names rather than Deployment names. Updated the query to use `label_replace()` to create a `replicaset` label from the pod owner metric, then join to `kube_replicaset_owner{owner_kind="Deployment"}` and aggregate by the Deployment `owner_name`.
- Several memory, throttling, dashboard, and high-cardinality examples filtered only `container!=""`, which can still include non-workload series in common Kubernetes/cAdvisor setups. Updated those examples to use both `container!=""` and `container!="POD"` consistently.
- The filter explanation said `container!=""` excludes the pause container and `container!="POD"` excludes the pod-level cgroup. Updated the wording to the more accurate general guidance that the two filters exclude non-application container and cgroup series.

## Review Notes
The core metric names, PromQL patterns, recording rule structure, and alerting rule structure match the consulted Prometheus, cAdvisor, Kubernetes, and kube-state-metrics documentation. kube-state-metrics currently recommends scheduler-exposed `kube_pod_resource_request` and `kube_pod_resource_limit` metrics as more precise than `kube_pod_container_resource_requests` and `kube_pod_container_resource_limits`, but the metrics used in the post remain documented and stable.
