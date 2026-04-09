# Validation Summary: How to Fix BLUESTORE_DISK_SIZE_MISMATCH Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (BlueStore storage backend)
- ceph-bluestore-tool CLI
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, PVC expansion)
- ceph-volume LVM

## Sources Consulted
- Ceph official documentation: ceph-bluestore-tool man page (https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/)
- Ceph health checks documentation (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph OSD management documentation (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- Ceph ceph-volume LVM documentation (https://docs.ceph.com/en/latest/ceph-volume/lvm/create/)
- Rook source code for OSD expand-bluefs init container (https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/spec.go)
- Ceph PR #27519 introducing BLUESTORE_DISK_SIZE_MISMATCH health check
- Ceph PR #32043 documenting bluestore_block_size as a dev/test tunable

## Issues Found
- **Incorrect command in "Checking All OSDs" section (lines 135-139):** The original post used `ceph daemon osd.$osd config get bluestore_block_size` in a for loop to manually check OSDs for mismatches. This is misleading because `bluestore_block_size` is a configuration tunable that controls the size of file-backed block devices in development/test environments (default changed from 1T to 100G). On production systems with real block devices, this value does not reflect the actual recorded device size and would return the same default for every OSD regardless of any mismatch. Replaced with `ceph osd metadata $osd | grep bluestore_bdev_size`, which queries the actual recorded block device size per OSD from the OSD metadata.

## Review Notes
- All other commands (`ceph-bluestore-tool bluefs-bdev-expand`, `show-label`, `ceph osd purge`, `ceph-volume lvm create`) are correct and match official documentation.
- The health check name `BLUESTORE_DISK_SIZE_MISMATCH` is confirmed in Ceph source and docs.
- Rook's automatic `bluefs-bdev-expand` behavior via the `expand-bluefs` init container is confirmed in Rook source code.
- The `ceph-bluestore-tool show-label` command uses `--path` syntax which works by inferring device paths from symlinks in the OSD directory; this is a valid and common usage pattern.
- The `ceph daemon` command used in the original for loop also requires running on the same host as the OSD (it uses the admin socket), which further limits its usefulness for checking all OSDs across a cluster. The replacement using `ceph osd metadata` works from any node with access to the Ceph monitors.
