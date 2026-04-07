# Validation Summary: How to Set CephFS Mount Prerequisites

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes-based Ceph orchestrator)
- CephFS (Ceph distributed filesystem)
- Linux kernel CephFS driver (`ceph.ko`)
- `ceph-common` userspace package
- `ceph-fuse` FUSE client
- Kubernetes (`kubectl`) for extracting Ceph config and credentials

## Sources Consulted
- Ceph official documentation on CephFS mount prerequisites: https://docs.ceph.com/en/latest/cephfs/mount-prerequisites/
- Ceph official documentation on CephFS kernel mount: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Rook documentation on CephFS: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Debian/Ubuntu `ceph-common` package contents
- Ceph messenger v2 (msgr2) protocol documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/

## Issues Found
- **`ceph-fuse` listed under `ceph-common` package contents**: The post claimed `ceph-common` provides the `ceph-fuse` client. This is incorrect — `ceph-fuse` is a separate package on both Debian/Ubuntu and RHEL/CentOS/Fedora. Fixed by removing `ceph-fuse` from the `ceph-common` bullet list and adding a separate note about installing the `ceph-fuse` package for FUSE-based mounts.

## Review Notes
- The `rook-csi-cephfs-node` secret key name (`adminKey`) may vary across Rook versions. Some versions use `userKey` and `userID` instead. The post's approach is valid for common Rook deployments but readers should verify the actual key names in their environment.
- The `mount.ceph --version` command in the checklist may not produce version output on all distributions — it typically prints a usage/help message instead, but this still serves to confirm the binary is installed.
- The kernel version guidance (4.x minimum, 5.4+ recommended) is reasonable. CephFS has been in the mainline kernel since 2.6.34, but practical stability improvements and msgr2 support came later.
