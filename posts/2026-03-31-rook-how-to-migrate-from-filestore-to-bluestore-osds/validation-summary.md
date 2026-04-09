# Validation Summary: How to Migrate from FileStore to BlueStore OSDs

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- BlueStore (Ceph OSD storage backend)
- FileStore (legacy Ceph OSD storage backend)
- kubectl (Kubernetes CLI)
- Bash scripting

## Sources Consulted
- Ceph documentation on BlueStore: https://docs.ceph.com/en/latest/rados/configuration/storage-devices/#bluestore
- Ceph documentation on OSD management commands (`ceph osd out`, `ceph osd purge`, `ceph osd metadata`): https://docs.ceph.com/en/latest/rados/operations/
- Ceph documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Rook documentation on OSD management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Rook documentation on cleaning devices: https://rook.io/docs/rook/latest/Storage-Configuration/ceph-teardown/

## Issues Found

### 1. Automation script: incorrect order of operations
**What was wrong:** The automation script asked the user to wipe the disk *before* stopping the OSD deployment and purging the OSD from the cluster. This meant the OSD daemon would still be running and actively using the disk when the user was asked to wipe it, which is unsafe and would likely fail or cause data corruption.

**What was changed:** Reordered the script so that the OSD deployment is deleted and the OSD is purged from the cluster *before* prompting the user to wipe the disk. This matches the correct order described in the manual steps earlier in the post.

### 2. Automation script: non-existent `num_pg_active_unclean` JSON field
**What was wrong:** The script parsed `ceph pg stat --format json` output looking for a field called `num_pg_active_unclean`, which does not exist in the `ceph pg stat` JSON output. This would cause the Python script to always return `0` (the default), making the rebalance check ineffective — it would always immediately proceed regardless of actual PG state.

**What was changed:** Replaced the check with proper parsing of the `num_pg_by_state` array from `ceph pg stat --format json`. The fix counts PGs that are not in `active+clean` state by checking whether both `active` and `clean` appear in each PG state name.

## Review Notes
- The manual steps (Steps 1-5) are correctly ordered and technically accurate.
- The `ceph osd metadata osd.X` syntax (using the `osd.` prefix rather than just a numeric ID) is used throughout. While some Ceph commands strictly expect a numeric ID, modern Ceph versions generally handle the `osd.` prefix gracefully for most commands.
- The disk wiping commands (`wipefs`, `sgdisk`, `dd`) match the Rook documentation's recommended approach for cleaning devices.
- The claim that BlueStore provides ~20-30% throughput improvement is a reasonable approximation based on community benchmarks, though actual results vary by workload.
- FileStore support was fully removed in Ceph Reef (18.x), so this migration guide is particularly relevant for clusters upgrading from older Ceph versions.
