# Validation Summary: How to Monitor Ceph OSD Latency Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD latency monitoring)
- Prometheus (metrics collection and PromQL queries)
- Grafana (dashboard visualization)
- Prometheus Operator (PrometheusRule CRD for alerting)
- Kubernetes (kubectl CLI, CRD configuration)
- Linux disk diagnostics (smartctl, iostat, dmesg)

## Sources Consulted
- Rook CephCluster CRD documentation (spec.monitoring fields) — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph MGR Prometheus module metric names — https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph OSD perf command documentation — https://docs.ceph.com/en/latest/man/8/ceph/
- Prometheus PromQL aggregation operators (topk, avg, quantile) — https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus Operator PrometheusRule CRD — https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- sysstat iostat man page — https://man7.org/linux/man-pages/man1/iostat.1.html
- smartmontools smartctl documentation — https://www.smartmontools.org/wiki/TOS/DOC

## Issues Found
No technical issues found.

## Review Notes
- The `quantile(0.95, ceph_osd_commit_latency_ms)` query computes the 95th percentile across all OSD values at a single point in time, not over a time window. With a small number of OSDs this may not be statistically meaningful as a "P95," but the PromQL is valid and the usage is a reasonable approximation for identifying outlier OSDs.
- In BlueStore, apply and commit latency tend to be very similar since both resolve at the WAL write stage. The post's distinction between the two is still accurate and useful for readers who may be running mixed FileStore/BlueStore environments or older Ceph versions.
- The `iostat -x 1 5 /dev/sdb` argument order places the device after the interval/count; the documented sysstat syntax puts devices before interval (`iostat -x /dev/sdb 1 5`). Both orderings work in practice with modern sysstat versions, so this was left as-is.
