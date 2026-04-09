# Validation Summary: How to Fix BLUEFS_LOW_SPACE Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, BlueFS, OSD management)
- Rook (Kubernetes Ceph operator)
- RocksDB (BlueStore metadata backend)
- Prometheus (monitoring/alerting)
- Kubernetes (PVC management, pod lifecycle)

## Sources Consulted
- Ceph official documentation on BlueStore configuration: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/
- Ceph `ceph-bluestore-tool` man page and CLI reference for `bluefs-bdev-migrate` and `bluefs-bdev-expand` subcommands
- Ceph MGR Prometheus module metric naming conventions (perf counter subsystem prefixes: `bluefs` vs `bluestore`)
- Ceph health check documentation for BLUEFS-related warnings
- Cross-referenced with other validated Ceph blog posts in this repository for consistency

## Issues Found
1. **Incorrect config option name (`bluestore_wal_size`)**: The post used `bluestore_wal_size` in the `ceph config set` command, but this option does not exist in Ceph. The correct option is `bluestore_block_wal_size`. Additionally, this option only takes effect during OSD creation (provisioning time), not at runtime. Changed the command to use the correct option name and clarified that it applies to new OSD deployments only.

2. **Wrong tool for removing dedicated WAL device (`bluefs-bdev-expand`)**: The "Removing the Dedicated WAL Device" section used `ceph-bluestore-tool bluefs-bdev-expand` to "absorb WAL function," but `bluefs-bdev-expand` expands an existing device's usable space (e.g., after growing the underlying LVM volume). It does not migrate data between devices. Replaced with `ceph-bluestore-tool bluefs-bdev-migrate` with proper `--devs-source` (WAL device) and `--dev-target` (DB device) arguments, which correctly moves WAL data to the DB device before the symlink is removed.

3. **Incorrect Prometheus metric prefix (`ceph_bluestore_wal_*`)**: The monitoring alert rule used `ceph_bluestore_wal_total_bytes` and `ceph_bluestore_wal_used_bytes`. WAL device space metrics are exported by the BlueFS perf counter subsystem, not the BlueStore subsystem, so the correct metric names are `ceph_bluefs_wal_total_bytes` and `ceph_bluefs_wal_used_bytes`.

## Review Notes
- The `ceph tell osd.7 compact` command and `bluefs-bdev-migrate` usage in the "Moving WAL Data" section are correct and well-documented.
- The `ceph daemon osd.X perf dump` commands in the Emergency Assessment section require admin socket access, which means they must be run on the host where the OSD daemon is running (or from inside the OSD container in Rook). The toolbox pod approach shown may not have direct admin socket access to all OSDs depending on the Rook deployment topology. This is a minor usability note, not an error.
- The Rook PVC expansion approach assumes the StorageClass supports volume expansion (`allowVolumeExpansion: true`). This is worth noting but not an error in the post.
