# Validation Summary: How to View Performance Metrics in the Ceph Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) and Ceph Dashboard
- Prometheus (metrics collection and querying)
- Grafana (metrics visualization)
- kubectl (Kubernetes CLI)
- PromQL (Prometheus query language)

## Sources Consulted
- Ceph documentation on CLI commands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph documentation on `ceph tell` vs `ceph daemon`: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Prometheus documentation on `histogram_quantile` and `quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found

1. **`ceph daemon` used from tools pod (line 71-72)**: The command `ceph daemon mds.myfs-a perf dump` connects via a local Unix admin socket, which is not available inside the Rook toolbox pod. Changed to `ceph tell mds.myfs-a perf dump`, which sends the command over the Ceph monitor network and works from any host with a ceph.conf and keyring.

2. **Invalid histogram PromQL for OSD apply latency (line 95-96)**: The metric `ceph_osd_apply_latency_ms` is exported by the Ceph MGR Prometheus module as a gauge (one value per OSD), not as a Prometheus histogram with `_bucket` suffixes. Therefore `histogram_quantile(0.99, ceph_osd_apply_latency_ms_bucket)` is invalid — the metric `ceph_osd_apply_latency_ms_bucket` does not exist. Changed to `quantile(0.99, ceph_osd_apply_latency_ms)`, which computes the 99th percentile across all OSD gauge values at query time.

## Review Notes
- The Grafana dashboard IDs (2842, 5336, 7845) are community-maintained and may become outdated. Rook also bundles its own Grafana dashboards that can be deployed via the monitoring CRDs — this could be mentioned as an alternative in a future update.
- The "Dashboard > Clients" navigation path and per-client IOPS breakdown described in the Client I/O Breakdown section may not be present in all Ceph Dashboard versions. The Ceph Dashboard client view varies across releases.
- The `ceph iostat` command used in the post was introduced in later Ceph releases; readers on older versions (pre-Nautilus) may not have it available.
