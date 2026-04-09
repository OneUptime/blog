# Validation Summary: How to Fix BLUEFS_SPILLOVER Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore, BlueFS, RocksDB internals)
- Rook (Kubernetes Ceph operator)
- `ceph-bluestore-tool` CLI
- Ceph OSD admin socket commands
- Kubernetes PVC management

## Sources Consulted
- Ceph source code: `src/os/bluestore/BlueFS.cc` (admin socket command registrations)
- Ceph source code: `src/os/bluestore/BlueStore.cc` (BLUEFS_SPILLOVER health check)
- Ceph source code: `src/os/bluestore/bluestore_tool.cc` (bluefs-bdev-migrate, bluefs-bdev-new-wal definitions)
- Official ceph-bluestore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Red Hat Ceph Storage 5 Administration Guide (BlueStore administration)
- IBM Storage Ceph 7.1.0 documentation (BlueFS statistics)

## Issues Found

### Issue 1: Incorrect admin socket command for BlueFS stats
- **What was wrong:** `ceph daemon osd.3 bluestore bluefs stats` used an incorrect `bluestore` prefix.
- **What was changed:** Corrected to `ceph daemon osd.3 bluefs stats`.
- **Why:** In the Ceph source code (`BlueFS.cc`), the `bluefs stats` command is registered without the `bluestore` prefix. The `bluestore` prefix is only used for `bluestore bluefs device info`.

### Issue 2: Incorrect admin socket command for device info
- **What was wrong:** `ceph daemon osd.3 bluestore bluefs device-info` used a hyphen instead of a space.
- **What was changed:** Corrected to `ceph daemon osd.3 bluestore bluefs device info`.
- **Why:** The admin socket command is registered as `bluestore bluefs device info` (with a space), not `device-info` (with a hyphen).

### Issue 3: Wrong ceph-bluestore-tool command in Option 3
- **What was wrong:** Option 3 ("Remove the DB Device") used `ceph-bluestore-tool bluefs-bdev-new-wal`, which creates a NEW WAL device — the opposite of what was intended.
- **What was changed:** Replaced with `ceph-bluestore-tool bluefs-bdev-migrate --devs-source block.db --dev-target block`, which migrates data from the DB device back to the main block device and removes the source DB device on success.
- **Why:** `bluefs-bdev-new-wal` adds a WAL device and fails if one already exists. The correct tool for merging a DB device back into the main block is `bluefs-bdev-migrate`, as documented in the official ceph-bluestore-tool man page.

## Review Notes
- The `BLUEFS_SPILLOVER` health check name is confirmed correct (introduced in Ceph Nautilus v14.2.0). The example `ceph health detail` output is illustrative rather than exact — real output wording varies slightly by version, but the concept is accurately conveyed.
- The 4% DB sizing rule of thumb is a commonly cited guideline. For heavy write workloads or workloads with compression/deduplication, a larger DB device (5-6%) may be needed.
- There is a known Ceph bug (tracker #40434) where `bluefs-bdev-migrate` from DB to main block can result in a broken OSD in some versions. The post could benefit from a warning about this, but it is not a factual error in the current text.
- The Rook CephCluster YAML snippet uses `storageClassDeviceSets` with `volumeClaimTemplates`, which is the correct Rook CRD structure for provisioning separate metadata devices.
