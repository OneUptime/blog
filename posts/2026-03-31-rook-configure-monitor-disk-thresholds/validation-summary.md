# Validation Summary: How to Configure Monitor Disk Space Thresholds (MON_DISK_LOW, MON_DISK_CRIT)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (monitor daemon disk space management)
- Kubernetes (kubectl, PVC management, node debugging)
- RocksDB (monitor backing store)

## Sources Consulted
- Ceph official documentation on monitor health checks (MON_DISK_LOW, MON_DISK_CRIT, MON_DISK_BIG)
- Ceph configuration reference for `mon_data_avail_warn`, `mon_data_avail_crit`, and `mon_data_size_warn`
- Rook documentation on monitor PVC management and toolbox usage
- Ceph CLI reference for `ceph config set`, `ceph config show`, `ceph tell`, and `ceph health detail`

## Issues Found
- **Incorrect count of thresholds**: The introductory paragraph stated "two configurable thresholds" but then listed three items (MON_DISK_LOW, MON_DISK_CRIT, and MON_DISK_BIG). Changed "two" to "three" to match the actual list.

## Review Notes
- All `ceph config set` commands use the correct option names and value types (percentages for avail_warn/avail_crit, bytes for size_warn).
- The `ceph tell mon.a compact` command is correct for triggering RocksDB compaction on a monitor.
- The default values cited (30% for warn, 5% for crit, 15 GiB for size_warn) are accurate for current Ceph releases.
- The PVC expansion approach via `kubectl patch pvc` is valid but requires the StorageClass to support volume expansion (`allowVolumeExpansion: true`). This is not mentioned in the post but is an operational prerequisite rather than a technical error.
- The `mon_data_size_warn` value of `20000000000` is described as "20 GB" which is correct in decimal (SI) notation. Ceph internally uses binary units (GiB), so this is approximately 18.63 GiB. The description is acceptable as written.
