# Validation Summary: How to Identify Root Cause of Ceph Performance Degradation

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- Prometheus (monitoring/metrics)
- Linux system tools (iostat, smartctl, ethtool, mtr)

## Sources Consulted
- Ceph Troubleshooting OSDs documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- iostat(1) man page: https://man7.org/linux/man-pages/man1/iostat.1.html
- Ceph OSD admin socket commands (source): https://github.com/ceph/ceph/blob/main/doc/rados/troubleshooting/troubleshooting-osd.rst

## Issues Found

1. **`ceph daemon osd.0 ops` is not a documented admin socket command.** Replaced with `ceph daemon osd.0 dump_historic_ops`, which complements the already-listed `dump_ops_in_flight` command. Together they cover both in-flight and historical operations.

2. **`iostat` argument order was incorrect.** The command `iostat -xz 1 10 /dev/sdb` had the device after the interval/count. Per the iostat(1) man page, the correct syntax is `iostat [options] [device...] [interval [count]]`. Fixed to `iostat -xz /dev/sdb 1 10`.

3. **`%util` column name was wrong.** The blog referenced `util%` but the actual iostat column name is `%util`. Fixed.

4. **`ceph osd set-backfillfull-ratio 0.90` was mislabeled as a recovery throttling command.** This command sets a capacity threshold (the ratio at which an OSD is considered too full to accept backfill data), not a recovery speed throttle. It was grouped under a "Throttle recovery" comment alongside the actual throttling commands (`osd_recovery_max_active` and `osd_max_backfills`). Removed it from that section to avoid misleading readers.

## Review Notes
- The Prometheus metric names `ceph_osd_apply_latency_ms` and `ceph_osd_commit_latency_ms` are correct for the Ceph MGR Prometheus module.
- The `ceph osd perf` field names `apply_latency_ms` and `commit_latency_ms` match the JSON output format. The human-readable table shows `apply_latency(ms)` and `commit_latency(ms)` instead, but the blog's usage is acceptable since JSON output is commonly used in scripting.
- The 50ms latency threshold is a reasonable general guideline. For SSD-backed deployments, a lower threshold (e.g., 20ms) may be more appropriate, but the blog's value is not incorrect as a starting point.
- The `rados bench` commands are correct and useful for baselining pool performance.
