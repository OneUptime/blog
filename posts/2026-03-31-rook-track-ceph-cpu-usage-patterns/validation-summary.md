# Validation Summary: How to Track Ceph CPU Usage Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSDs, MONs, MGR, MDS, RGW daemons)
- Kubernetes (kubectl top, resource requests/limits, CFS CPU throttling)
- Prometheus (PromQL queries, container CPU metrics, PrometheusRule CRD)
- cAdvisor (container-level CPU metrics)

## Sources Consulted
- Kubernetes documentation on `kubectl top`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes documentation on container resource management: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Prometheus cAdvisor metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph configuration reference for recovery tuning: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found

1. **Incorrect cAdvisor attribution**: The post stated container CPU metrics are "exposed via kube-state-metrics or Prometheus node exporter." This is wrong — `container_cpu_*` metrics come from cAdvisor, which is built into the kubelet. kube-state-metrics exposes `kube_*` metrics about Kubernetes object state, and node exporter exposes host-level `node_*` metrics. Fixed to: "built into the kubelet and scraped by Prometheus."

2. **Wrong metric name in CPU throttle ratio (two occurrences)**: The throttle ratio formula used `container_cpu_cfs_throttled_seconds_total` divided by `container_cpu_cfs_periods_total`. This is dimensionally incorrect — dividing seconds by a count of periods produces a meaningless value. The correct metric for the numerator is `container_cpu_cfs_throttled_periods_total` (a count of throttled CFS periods), which when divided by `container_cpu_cfs_periods_total` (total CFS periods) gives a ratio between 0 and 1. Fixed in both the Prometheus metrics section and the PrometheusRule alert expression.

## Review Notes
- The `op_latency_ms` perf counter name referenced when discussing `ceph tell osd.0 perf dump` output is a simplified reference. In practice the exact counter path varies by Ceph version (e.g., `op_latency` with subkeys for avg/sum/avgcount). The general guidance to inspect perf dump output is sound.
- The recovery tuning values (`osd_max_backfills 1`, `osd_recovery_max_active 1`) are deliberately conservative. Production clusters may need different values depending on workload.
- The `--sort-by=cpu` flag for `kubectl top pods` is correct and functional.
