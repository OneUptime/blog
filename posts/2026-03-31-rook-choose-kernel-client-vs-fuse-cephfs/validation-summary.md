# Validation Summary: How to Choose Between Kernel Client and FUSE for CephFS

## Status
validated

## Post Type
Guide

## Technologies Covered
- CephFS (Ceph File System)
- CephFS kernel client (`mount -t ceph`)
- ceph-fuse (FUSE-based CephFS client)
- Ceph CSI driver for Kubernetes
- Linux FUSE subsystem

## Sources Consulted
- mount.ceph man page (Ceph Reef): https://docs.ceph.com/en/reef/man/8/mount.ceph/
- ceph-fuse man page (Ceph latest): https://docs.ceph.com/en/latest/man/8/ceph-fuse/
- Ceph OS Recommendations (Octopus): https://docs.ceph.com/en/octopus/start/os-recommendations/
- Mount CephFS using FUSE: https://docs.ceph.com/en/reef/cephfs/mount-using-fuse/
- ceph-csi StorageClass documentation: https://github.com/ceph/ceph-csi/blob/devel/examples/cephfs/storageclass.yaml
- Ceph tracker issue #1296 (inotify support): https://tracker.ceph.com/issues/1296
- Ceph Logging and Debugging: https://docs.ceph.com/en/reef/rados/troubleshooting/log-and-debug/

## Issues Found

1. **Misleading inotify claim (line 25)**: The post stated the kernel client "Supports all standard Linux tools (inotify, sendfile, etc.)". CephFS does not support distributed inotify — inotify events are only triggered by local operations on the same client, not by changes from other CephFS clients. This is a fundamental limitation of network/distributed filesystems. Changed to "Supports standard Linux tools (sendfile, mmap, etc.) through direct VFS integration" to remove the misleading inotify reference.

2. **Incorrect ceph-fuse flag (line 63)**: The post used `--keyring` as the option for specifying the keyring file with ceph-fuse. Per the ceph-fuse man page, the documented short option is `-k <path>`. While `--keyring` may work as a passthrough generic Ceph option, `-k` is the canonical documented flag. Changed `--keyring` to `-k`.

## Review Notes
- The kernel mount command uses the older `mon:port:/` device syntax, which is correct for Octopus/Pacific/Quincy. Ceph Reef introduced a new syntax (`user@fsid.fsname=/`), but the old syntax remains supported.
- The performance numbers (2.5 GB/s read, 1.8 GB/s write for kernel) are clearly labeled as approximate and hardware-dependent, which is appropriate. The ~35-40% gap between kernel and FUSE aligns with the 20-40% claim.
- The Ceph CSI claim ("uses kernel client internally") is a simplification — CSI auto-detects and prefers the kernel client when available, but can fall back to FUSE. This is acceptable for a recommendation guide.
- The post targets Octopus-era Ceph. Readers using Reef or later should consult updated mount syntax documentation.
