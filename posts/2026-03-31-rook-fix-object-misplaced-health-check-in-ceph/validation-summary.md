# Validation Summary: How to Fix OBJECT_MISPLACED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- CRUSH map (Ceph's data placement algorithm)
- OSD (Object Storage Daemon) management
- PG (Placement Group) backfill operations

## Sources Consulted
- Ceph Health Checks Documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph Monitor Config Reference: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph Source Code (MgrCommands.h): https://github.com/ceph/ceph/blob/main/src/mgr/MgrCommands.h
- Ceph health-checks.rst source: https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst

## Issues Found

1. **Backfill scan values were set to defaults (Step 2)**: `osd_backfill_scan_min` was set to 64 and `osd_backfill_scan_max` to 512, which are the default values. Setting them to defaults does not speed up backfill. Changed to 128 and 1024 respectively to actually increase scan throughput.

2. **Incorrect config key for backfill full ratio (Step 3)**: The command `ceph config set osd osd_backfill_full_ratio 0.85` used the wrong config key/method. The backfill full ratio is a cluster-wide OSDMap setting managed by the monitor. Changed to `ceph osd set-backfillfull-ratio 0.85`, which is the correct command.

3. **Inefficient method for finding remapped PGs (Step 4)**: `ceph pg dump_stuck | grep remapped` is indirect because `dump_stuck` only accepts `inactive`, `unclean`, `stale`, `undersized`, and `degraded` as filter types -- `remapped` is not a valid stuck-type argument. Changed to `ceph pg ls remapped`, which directly lists PGs in the remapped state.

## Review Notes
- The overall explanation of OBJECT_MISPLACED is accurate and well-written. The Ceph docs confirm objects are accessible but not in their CRUSH-preferred locations.
- The `ceph pg force-backfill` command syntax is correct and also supports multiple PG IDs.
- The `norecover` flag checked in Step 1 is a valid flag but is not unset in the fix commands. This is acceptable since `norecover` blocks recovery (not backfill specifically), though in practice users may want to unset it as well. The post focuses on backfill-related flags which is appropriate for this context.
- The default value of `osd_max_backfills` is 1, so setting it to 4 is a meaningful increase as described.
