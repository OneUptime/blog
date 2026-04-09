# Validation Summary: How to Monitor ceph_osd_apply_latency_ms Metric

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- Ceph (OSD performance metrics)
- Rook (Ceph operator for Kubernetes)
- Prometheus (metric querying and alerting)
- Grafana (dashboard visualization)
- Kubernetes (kubectl commands for debugging)

## Sources Consulted
- Ceph documentation on OSD performance counters and `ceph osd perf` command: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph MGR Prometheus module metric exports: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus documentation on `rate()` vs `deriv()` functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus metric types (gauge vs counter): https://prometheus.io/docs/concepts/metric_types/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- **`rate()` used on a gauge metric**: The PromQL query `rate(ceph_osd_apply_latency_ms[5m])` was incorrect. `ceph_osd_apply_latency_ms` is a gauge (instantaneous latency value), not a counter. The `rate()` function computes per-second increase of counters and produces meaningless results on gauges. Changed to `deriv(ceph_osd_apply_latency_ms[5m])`, which correctly computes the per-second derivative of a gauge using simple linear regression.

## Review Notes
- The explanation of apply vs commit latency is a reasonable simplification. Apply latency measures when the operation is visible (applied to the data store's working state), and commit latency measures when it is durable on disk. The stated relationship (apply < commit) is correct for BlueStore.
- The `kubectl debug node/` commands omit the `--image` flag, which is typically required. This is environment-dependent and the reader would need to choose an image with the necessary tools (iostat, smartctl, dmesg). This is acceptable for a conceptual guide.
- The PromQL join query using `ceph_osd_metadata` with `group_left(device_class)` is a correct pattern for enriching metrics with info-metric labels.
- Alert thresholds (100ms warning, 500ms critical) are reasonable defaults for production Ceph clusters.
