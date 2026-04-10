# Validation Summary: How to Understand Supported Features of the CephFS Kernel Driver

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- CephFS (Ceph distributed filesystem)
- Linux kernel CephFS client driver
- ceph-fuse (FUSE-based CephFS client)
- msgr2 (Ceph messenger v2 protocol)
- fscrypt (Linux filesystem-level encryption)

## Sources Consulted
- Official Ceph documentation: CephFS Kernel Features (docs.ceph.com/en/latest/cephfs/kernel-features/)
- Official Ceph documentation: msgr2 protocol (docs.ceph.com/en/latest/rados/configuration/msgr2/)
- Linux kernel source: fs/ceph/ module and Makefile
- mount.ceph man page (mount options including secretfile, ms_mode, wsync/nowsync)
- Linux kernel git history for CephFS merge (2.6.34, May 2010)

## Issues Found
1. **`secretfile` pointing to a keyring file (consequential error):** The original mount command used `secretfile=/etc/ceph/ceph.client.admin.keyring`, but the `secretfile` kernel mount option expects a file containing only the raw base64-encoded secret key, not a full keyring file (which has INI-style `[client.admin]` headers). Using a keyring file with `secretfile=` will fail with an "Invalid argument" error. Fixed by adding a `ceph-authtool --print-key` step to extract the raw key into a separate file, and updated the mount command to use that file. Also added a clarifying note about the `secretfile` requirement.

## Review Notes
- **Basic CephFS mount and CephX listed as 3.10+:** CephFS was actually merged into the Linux kernel in 2.6.34 (May 2010), so technically basic mount and CephX have been available since then. However, 3.10+ is a reasonable practical minimum for production use (RHEL 7 baseline), and no Rook-Ceph deployment would use kernels that old. Left as-is since it is a safe recommendation.
- **Async dirops listed as 5.8+:** The initial async directory operations support (wsync/nowsync mount options) was introduced in kernel 5.7 per the mount.ceph man page. 5.8 added related features like `crush_location` and `read_from_replica`. The 5.8 claim is slightly imprecise but reasonable; not changed as the difference is minor.
- **Snapshots listed as 4.17+:** The official Ceph docs recommend kernel >= 4.17 for snapshot use, which aligns with the post. Earlier kernels had partial snapshot support but 4.17 is the recommended minimum.
- The feature matrix is a useful reference but users should always consult the official Ceph documentation for the most current compatibility information, as kernel backports (e.g., RHEL kernels) may include features from newer upstream versions.
