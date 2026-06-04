# Validation Summary: How to Write PromQL Queries That Calculate Per-Pod Network Throughput

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PromQL
- Prometheus
- Kubernetes
- cAdvisor
- kube-state-metrics
- Prometheus alerting and recording rules

## Sources Consulted
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus querying basics, comments, offset, and query-performance guidance: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus configuration and Kubernetes service discovery metadata labels: https://prometheus.io/docs/operating/configuration/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Kubernetes CRI pod and container metrics documentation: https://kubernetes.io/docs/reference/instrumentation/cri-pod-container-metrics/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The post described cAdvisor counters as metrics that "always increase." I changed this to say they increase until reset, because Prometheus counters can reset and `rate()`/`increase()` account for monotonicity breaks.
- The post labeled 1024-based byte conversions as MB/s. I changed the affected text, comments, and alert annotation to MiB/s, because dividing by 1024 twice yields mebibytes, not decimal megabytes.
- The spike-detection query comment said "bytes" while the expression divided by 1024 twice. I updated the comment to describe MiB and the previous 5-minute average.
- The service aggregation section claimed Prometheus service discovery typically adds a `service` label. I changed this to require explicitly relabeled pod or service metadata, because Kubernetes service discovery exposes `__meta_*` labels for relabeling but does not automatically attach application or Kubernetes Service labels to cAdvisor metrics.
- The missing-metrics example used `or vector(0)` and claimed it returned zero for pods without metrics. I changed it to use `or on (namespace, pod) sum by (namespace, pod) (0 * kube_pod_info)`, which can produce zero-valued series for pods known to kube-state-metrics.
- The resource-request comparison divided pod-level network throughput by per-container CPU request series, which would not match correctly due to different labels. I changed the denominator to `sum by (namespace, pod) (kube_pod_container_resource_requests{resource="cpu", unit="core"})`.

## Review Notes
The PromQL examples were reviewed against current Prometheus documentation for function behavior, comments, offset modifiers, aggregation, vector matching, alerting rules, and recording rules. The queries are syntactically aligned with PromQL, but they were not executed against a live Prometheus server because this repository does not include a Prometheus test fixture or sample time series.
