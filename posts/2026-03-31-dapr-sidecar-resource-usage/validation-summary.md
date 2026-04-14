# Validation Summary: How to Monitor Dapr Sidecar Resource Usage

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar / daprd)
- Kubernetes (kubectl top, pod annotations, container resource limits)
- Prometheus (PromQL queries, alerting rules)
- cAdvisor (container resource metrics)
- Grafana (dashboard panels)
- Go runtime metrics (heap, goroutines, GC)

## Sources Consulted
- Dapr official documentation: Arguments and Annotations overview (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr official documentation: Production guidelines on Kubernetes (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/)
- Kubernetes documentation: kubectl top (https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/)
- cAdvisor metrics documentation (https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md)
- Prometheus alerting rules documentation (https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)

## Issues Found
1. **Incorrect metric name for CPU throttling**: The post used `container_cpu_throttled_seconds_total` which does not exist. The correct cAdvisor metric is `container_cpu_cfs_throttled_seconds_total` (with "cfs" for Completely Fair Scheduler). A query using the incorrect name would return no data on a real cluster. Fixed on line 50.

2. **Incorrect metrics source attribution**: The post stated that container-level metrics come from "kube-state-metrics and cAdvisor". All `container_*` metrics (`container_cpu_usage_seconds_total`, `container_memory_working_set_bytes`, etc.) come exclusively from cAdvisor, exposed via the kubelet. kube-state-metrics provides Kubernetes object-level metrics (e.g., `kube_pod_*`, `kube_deployment_*`), not container resource usage metrics. Fixed the attribution to "cAdvisor (exposed via the kubelet)" on line 42.

## Review Notes
- The Dapr sidecar resource annotations (`dapr.io/sidecar-cpu-request`, `dapr.io/sidecar-memory-request`, `dapr.io/sidecar-cpu-limit`, `dapr.io/sidecar-memory-limit`) are all confirmed correct per official Dapr documentation.
- The Go runtime metrics (`go_memstats_heap_inuse_bytes`, `go_goroutines`, `go_gc_duration_seconds`) are standard Go/Prometheus metrics and are correctly referenced.
- The Prometheus alerting rule YAML syntax is correct and follows standard Prometheus alerting rule format.
- The `kubectl top pod --containers` command and its flag usage are correct.
- The Grafana panel recommendation to use "Gauge" visualization with "bytes (IEC)" unit is reasonable for memory usage display, though "Time series" is more common for tracking usage over time.
