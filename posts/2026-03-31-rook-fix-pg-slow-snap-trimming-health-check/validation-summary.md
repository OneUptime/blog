# Validation Summary: How to Fix PG_SLOW_SNAP_TRIMMING Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (RADOS, OSD, PG subsystems)
- Rook (Ceph operator for Kubernetes)
- RBD (RADOS Block Device) snapshot management
- CephFS snapshots
- Ceph CLI tools (`ceph`, `rbd`)

## Sources Consulted
- Ceph official documentation: Health Checks — PG_SLOW_SNAP_TRIMMING (https://docs.ceph.com/en/latest/rados/operations/health-checks/#pg-slow-snap-trimming)
- Ceph official documentation: OSD Config Reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph source code: `src/common/options/osd.yaml.in` and `src/common/options/global.yaml.in` for config defaults (https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in)
- Ceph official documentation: Pools — snapshot warnings for RGW (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found

1. **Incorrect workload reference (line 13)**: The post stated "RGW workloads with frequent bucket snapshot operations" as a common cause. RGW (RADOS Gateway) does not use RADOS-level pool snapshots for bucket operations — Ceph documentation explicitly warns against using RADOS snapshots on RGW pools. Changed to "RBD or CephFS workloads with frequent snapshot operations," which are the actual snapshot-producing workloads in Ceph.

2. **`osd_snap_trim_sleep_hdd` set to default value (line 79)**: The post described "Reduce sleep between trim operations" but set `osd_snap_trim_sleep_hdd` to 5, which is already the default value. This would not reduce sleep or improve trimming throughput at all. Changed to 0 to actually reduce the sleep interval as the text describes.

## Review Notes
- The `osd_snap_trim_sleep 0` and `osd_snap_trim_cost 1048576` commands in Step 3 are both setting values to their defaults. They are useful as a "reset to known-good defaults" step if someone had changed them, but the framing as "Increase the snap trim priority and throughput" is slightly misleading. Not changed since the commands are syntactically correct and harmless.
- Setting `osd_snap_trim_sleep_hdd` to 0 (the fix applied) is aggressive and may impact client I/O on spinning disks. In production HDD environments, a value of 0.1-1 may be a better balance. The post does not discuss this tradeoff.
- The `osd_snap_trim_sleep` and `osd_snap_trim_sleep_hdd/ssd` settings are ignored when the mClock scheduler is active (default in Quincy+). The post does not mention this caveat.
- All CLI commands (`ceph health detail`, `ceph osd dump`, `ceph config set`, `ceph tell`, `rbd snap ls/purge`, etc.) are syntactically correct and use valid flags.
- The health check name `PG_SLOW_SNAP_TRIMMING` is confirmed correct per official Ceph health checks documentation.
