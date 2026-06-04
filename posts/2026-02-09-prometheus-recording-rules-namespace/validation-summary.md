# Validation Summary: Create Prometheus Recording Rules for Kubernetes Namespace-Level Aggregations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus recording rules
- PromQL
- Prometheus Operator `PrometheusRule` CRD
- Kubernetes metrics
- kube-state-metrics
- cAdvisor / kubelet metrics
- Grafana dashboard queries

## Sources Consulted
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus recording rule naming best practices: https://prometheus.io/docs/practices/rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes metrics reference for kubelet volume stats: https://kubernetes.io/docs/reference/instrumentation/metrics/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- CPU examples did not consistently exclude the infra container series. Added `container!="POD"` to the basic rule, dashboard query, verification query, and workload-level CPU aggregation.
- The introductory CPU recording rule name did not reflect the documented recording-rule naming convention for a `rate()` aggregation. Renamed it to `namespace:container_cpu_usage_seconds:sum_rate`.
- CPU and memory request/limit aggregations filtered only by `resource`. Added `unit="core"` and `unit="byte"` filters to match kube-state-metrics labels and avoid mixing units.
- CPU utilization comments described ratios as percentages. Updated comments to say ratio, matching the PromQL output and the alert usage of `humanizePercentage`.
- Memory working set was described as "actual usage minus cache" and as what the OOM killer considers. Updated the wording to reflect cAdvisor's working set behavior more accurately: it excludes inactive file-backed memory and is useful for dashboards, but is not exactly the OOM killer's calculation.
- Network rules filtered on `container!="",container!="POD"`, which can drop pod-level cAdvisor network series where the useful labels are `namespace` and `pod`. Changed the network queries to filter on `pod!=""`.
- Filesystem rules used cAdvisor `container_fs_*` metrics while claiming to track persistent volume consumption. Replaced them with Kubernetes kubelet volume stats: `kubelet_volume_stats_used_bytes` and `kubelet_volume_stats_capacity_bytes`.
- Pod phase and scheduled-condition examples used `count`, which counts all emitted phase/condition series, including zero-valued inactive states. Changed them to `sum(... == 1)` so only active states are counted.
- Verification commands did not URL-encode the full PromQL safely, and the comparison used an unfiltered CPU query. Updated them to use `curl --data-urlencode` and the same CPU filters as the recording rule.

## Review Notes
- `kube_pod_container_resource_requests` and `kube_pod_container_resource_limits` are valid kube-state-metrics metrics, but the kube-state-metrics documentation recommends scheduler-provided `kube_pod_resource_request` / `kube_pod_resource_limit` metrics when available because they are more precise.
- The workload aggregation example uses pod-name parsing for deployment-style pod names. It is syntactically valid PromQL, but future improvements could use owner metrics from kube-state-metrics for broader workload coverage.
