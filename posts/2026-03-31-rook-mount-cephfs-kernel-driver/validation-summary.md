# Validation Summary: How to Mount CephFS Using the Kernel Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes Ceph orchestrator)
- CephFS (Ceph distributed filesystem)
- Linux kernel CephFS driver (`ceph.ko`)
- `mount.ceph` / `ceph-common` utilities
- CephX authentication
- Kubernetes (kubectl for extracting secrets)

## Sources Consulted
- [Mount CephFS using Kernel Driver - Ceph Documentation](https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/)
- [mount.ceph(8) man page - Ceph Documentation](https://docs.ceph.com/en/latest/man/8/mount.ceph/)
- [mount.ceph(8) - Debian Manpages](https://manpages.debian.org/unstable/ceph-common/mount.ceph.8.en.html)
- [Ceph Distributed File System - Linux Kernel Documentation](https://docs.kernel.org/filesystems/ceph.html)
- [Supported Features of the Kernel Driver - Ceph Documentation](https://docs.ceph.com/en/latest/cephfs/kernel-features/)

## Issues Found

### 1. `secretfile=` pointed to a keyring-format file (High severity)
**What was wrong:** The post created a full CephX keyring file (`/etc/ceph/ceph.client.admin.keyring`) with `[client.admin]` header and `key = ...` format, then passed it to the `secretfile=` mount option. The `secretfile=` option expects a file containing only the raw base64 secret key, not a keyring-format file. This would cause the mount to fail.

**What was changed:** Replaced the "Create a Keyring File" section with a "Create a Secret File" section that writes just the raw key to `/etc/ceph/admin.secret`. Updated all mount commands referencing `secretfile=` to point to the new path.

### 2. `rbytes` mount option description was misleading (Medium severity)
**What was wrong:** The post described `rbytes` as "Report accurate file sizes (vs. approximate)." In reality, `rbytes` controls how directory `st_size` is reported — it shows the recursive total byte sum of all files nested under a directory, not accuracy of individual file sizes.

**What was changed:** Updated the description to "Report recursive byte sum as directory size via st_size."

### 3. `ms_mode=secure` missing kernel version requirement (Low severity)
**What was wrong:** The post annotated `ms_mode=secure` as "(Ceph Nautilus+)" but omitted that the kernel CephFS driver only gained msgr2 support in Linux kernel 5.11+. Both the Ceph server version and the kernel version are requirements.

**What was changed:** Updated the annotation to "(kernel 5.11+, Ceph Nautilus+)."

## Review Notes
- The post uses the old-style `mount -t ceph` device syntax (`mon_ip:port:/path`). A newer syntax (`name@fsid.fs_name=/path` with `-o mon_addr=...`) is available on kernel 5.11+, but the old syntax remains valid and widely used.
- The `rook-csi-cephfs-node` secret field names (`adminID`, `adminKey`) may vary across Rook versions. Users should verify against their specific Rook deployment.
- The post correctly recommends the kernel driver over FUSE for production workloads, consistent with official Ceph documentation.
