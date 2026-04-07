# Validation Summary: How to Speed Up Ceph Rebalancing Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- CRUSH (Controlled Replication Under Scalable Hashing)
- Prometheus (monitoring)
- PromQL (Prometheus query language)

## Sources Consulted
- Ceph official documentation — OSD configuration reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph official documentation — Placement Group concepts: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation — CRUSH map management: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation — Balancer module: https://docs.ceph.com/en/latest/mgr/balancer/
- Ceph official documentation — Monitoring OSD and PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/

## Issues Found

1. **Typo in JSON field name `misplace_bytes`**: The field in `ceph -s --format json` output is `misplaced_bytes` (with a 'd'). The script would silently return 0 due to the `.get()` default. Fixed to `misplaced_bytes`.

2. **Deprecated `osd_recovery_sleep` config option**: Since Ceph Nautilus, `osd_recovery_sleep` was replaced by device-specific options `osd_recovery_sleep_hdd` and `osd_recovery_sleep_ssd`. The aggressive tuning section used the deprecated option while the restore section correctly used `osd_recovery_sleep_hdd`. Fixed the aggressive section to use both `osd_recovery_sleep_hdd 0` and `osd_recovery_sleep_ssd 0`.

3. **Incorrect use of `ceph osd perf` for recovery rate**: `ceph osd perf` outputs commit and apply latency statistics, not recovery throughput. It does not contain a `recovering_bytes_per_sec` field. Replaced with `ceph -s --format json` which reports `recovering_bytes_per_sec` in the `pgmap` section during active recovery.

4. **Incorrect PromQL query for rebalancing ETA**: The original query used `ceph_cluster_stats{type="misplaced_bytes"}` (not a real metric name) divided by `ceph_osd_op_w_in_bytes_sum` (client write bytes, not recovery throughput). The trailing `> 0` would also turn the result into a boolean. Fixed to use `ceph_cluster_total_bytes_misplaced / on() ceph_osd_recovery_bytes`.

5. **Incomplete restore section**: The restore settings were missing `osd_recovery_sleep_ssd` and `osd_backfill_scan_max` which were changed in the aggressive section. Added both to the restore block.

## Review Notes
- The `osd_backfill_scan_max` default is already 512 in modern Ceph, so setting it to 512 in the aggressive section has no effect. However, it doesn't cause harm and documents the parameter, so it was left as-is.
- The `ceph progress json` subcommand syntax may vary by Ceph version; `ceph progress --format json` is an alternative syntax that works in all recent versions.
- The PromQL recovery rate metric availability depends on having the Prometheus MGR module enabled and active recovery in progress.
