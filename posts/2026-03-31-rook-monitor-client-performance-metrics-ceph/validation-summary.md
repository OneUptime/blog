# Validation Summary: How to Monitor Client Performance Metrics in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- RBD (RADOS Block Device)
- Ceph Manager (MGR) modules
- Prometheus (MGR module for metrics export)
- Grafana (dashboards for visualization)
- Ceph admin socket

## Sources Consulted
- Ceph official documentation — Prometheus MGR module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph official documentation — rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph official documentation — Perf Counters: https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph source code (OSD.cc) — admin socket command registration confirming `ops` is an alias for `dump_ops_in_flight`
- Grafana.com dashboard registry — verified dashboard IDs 5336 (Ceph OSD Single) and 7845 (ZFS, not Ceph)
- Red Hat Ceph Storage documentation — performance counters reference

## Issues Found
1. **Incorrect Grafana dashboard ID 7845**: The post referenced Grafana dashboard IDs 5336 and 7845 as official Ceph dashboards. Dashboard 5336 is correct (Ceph - OSD Single), but dashboard 7845 is actually a ZFS dashboard, not a Ceph dashboard. Changed to IDs 2842 (Ceph Cluster overview) and 5336, both of which are well-known Ceph dashboards.

2. **Incorrect command in summary**: The summary section referenced `rbd perf iostat` but the correct command (as shown earlier in the post) is `rbd perf image iostat`. Fixed to match the accurate command shown in the body of the post.

## Review Notes
- The `ceph tell osd.* ops` command is valid — `ops` is a registered alias for `dump_ops_in_flight` in the Ceph OSD source code. The comment "Show long-running operations" is slightly misleading since it shows all in-flight operations (not exclusively long-running ones), but this is a minor editorial nuance rather than a technical error.
- The Prometheus metric names (`ceph_osd_op_r_latency_sum`, `ceph_osd_op_w_latency_sum`, `ceph_pool_rd_bytes`, `ceph_pool_wr_bytes`) were verified as correct. These follow the Ceph perf counter histogram export convention.
- The default Prometheus MGR module port 9283 was confirmed correct per official documentation.
- The `perf dump` JSON path `.osd.op_latency` used with jq was verified against real perf dump output.
