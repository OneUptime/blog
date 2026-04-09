# Validation Summary: How to Fix WAL_DEVICE_STALLED_READ_ALERT Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, BlueFS, OSD management)
- Rook (Kubernetes Ceph operator)
- NVMe (APST power management, nvme-cli, SMART diagnostics)
- Linux storage tools (fio, iostat, smartctl)
- Kubernetes (kubectl, PVCs, StorageClasses)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph BlueStore Configuration Reference (Reef): https://docs.ceph.com/en/reef/rados/configuration/bluestore-config-ref/
- Ceph BlueStore Configuration Reference (Octopus): https://docs.ceph.com/en/octopus/rados/configuration/bluestore-config-ref/
- Red Hat Ceph Storage 4 BlueStore documentation: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/4/html/administration_guide/osd-bluestore
- NVMe Base Specification (Feature ID 0x0C for APST)
- ceph-bluestore-tool man page / documentation for bluefs-bdev-migrate subcommand

## Issues Found
1. **Incorrect config option name (`bluestore_wal_size`)**: The post used `bluestore_wal_size` in the `ceph config set` command, but this option does not exist. The correct option name is `bluestore_block_wal_size`. Fixed on line 102.

## Review Notes
- `WAL_DEVICE_STALLED_READ_ALERT` is a confirmed real Ceph health check, added relatively recently for detecting stalled reads on BlueStore WAL devices. Related tuning parameters include `bdev_stalled_read_warn_lifetime` and `bdev_stalled_read_warn_threshold`.
- The `bluestore_block_wal_size` option controls WAL size at OSD creation time. Changing it on an existing OSD and restarting may not resize the WAL device retroactively; it primarily affects new OSD deployments. The post could be clearer about this distinction, but the advice is not incorrect in the context of recreating or reprovisioning an OSD.
- The NVMe APST disable via `set-feature -f 0x0c -v 0` is volatile and does not persist across reboots. The post correctly shows the persistent kernel parameter approach as an alternative.
- The `ceph-bluestore-tool bluefs-bdev-migrate` command and flags (`--devs-source`, `--dev-target`) are correct. After migration, the `block.wal` symlink removal step is appropriate.
- All other commands (`ceph health detail`, `ceph osd metadata`, `iostat`, `fio`, `smartctl`, `nvme smart-log`, `nvme error-log`, kubectl commands) are syntactically correct and appropriate for the described use cases.
