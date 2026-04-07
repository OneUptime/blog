# Validation Summary: How to Tune osd_max_backfills for Faster Recovery in Ceph

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (OSD recovery, backfill operations)
- Rook (Kubernetes Ceph operator)
- Kubernetes ConfigMaps

## Sources Consulted
- Ceph official documentation on OSD configuration options (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph recovery tuning documentation (https://docs.ceph.com/en/latest/rados/operations/control/)
- Rook documentation on Ceph configuration overrides (https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/)

## Issues Found

1. **Non-existent parameter `osd_recovery_ops_per_osd`**: This is not a valid Ceph configuration parameter. Replaced with `osd_recovery_max_single_start`, which controls how many recovery operations can be started per recovery cycle (default: 1).

2. **Invalid `ceph pg dump_stuck backfilling` command**: `backfilling` is not a valid argument for `dump_stuck`. Valid arguments are `inactive`, `unclean`, `stale`, `undersized`, and `degraded`. Changed to `ceph pg ls backfilling`, which correctly lists PGs in the backfilling state.

3. **`osd_backfill_scan_min` and `osd_backfill_scan_max` set to values below defaults**: The post set these to 8 and 64 in the "maximize recovery" section, but the defaults are 64 and 512 respectively. Setting them lower would slow recovery, not speed it up. Changed to 128 and 1024 to actually increase scan throughput during maintenance windows.

4. **Incorrect Rook configuration format**: The post showed a `spec.cephConfig` field on the CephCluster CR, which does not exist. The correct method for setting arbitrary Ceph config overrides in Rook is via the `rook-config-override` ConfigMap with standard Ceph INI-format configuration. Updated the YAML snippet accordingly.

## Review Notes
- The `ceph pg dump | awk '/^[0-9]/ {sum+=$21}'` command for counting degraded objects uses a hardcoded column index ($21) that may vary between Ceph versions. Users should verify the correct column for their version.
- The `osd_recovery_max_active` default changed across Ceph versions (was 3 in older versions, may differ in newer releases). The post doesn't specify version requirements, which is acceptable for a general tuning guide.
