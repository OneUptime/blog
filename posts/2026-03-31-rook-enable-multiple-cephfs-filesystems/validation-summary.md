# Validation Summary: How to Enable Multiple CephFS Filesystems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (StorageClass, CRDs, kubectl)
- Ceph CSI driver (cephfs.csi.ceph.com)

## Sources Consulted
- Ceph official documentation on CephFS multiple filesystems: https://docs.ceph.com/en/latest/cephfs/multifs/
- Ceph official documentation on `ceph fs flag set`: https://docs.ceph.com/en/latest/man/8/ceph/#fs
- Rook documentation on CephFilesystem CRD: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook documentation on CephFS StorageClass: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph documentation on CephFS kernel mount options: https://docs.ceph.com/en/latest/man/8/mount.ceph/

## Issues Found
1. **Missing `--yes-i-really-mean-it` flag on `ceph fs flag set enable_multiple true`**: In Ceph Nautilus and Octopus (the minimum versions targeted by this post), multiple CephFS filesystems is an experimental feature. The command `ceph fs flag set enable_multiple true` fails with `Error EPERM` unless `--yes-i-really-mean-it` is appended. Fixed by adding the flag to the command.

2. **Invalid `discard` mount option in CephFS StorageClass**: The `mountOptions: [discard]` entry is not valid for CephFS. The `discard` (TRIM/UNMAP) option applies to block devices (e.g., Ceph RBD) and has no effect on CephFS mounts. This appeared to be a copy-paste error from an RBD StorageClass example. Fixed by removing the `mountOptions` block entirely.

## Review Notes
- In Ceph Pacific (16.2.x) and later, multiple CephFS filesystems became a fully supported (non-experimental) feature. The `--yes-i-really-mean-it` flag may no longer be required in those versions, but including it ensures backward compatibility with Nautilus/Octopus as stated in the prerequisites.
- When using the Rook CephFilesystem CRD approach, Rook may handle the `enable_multiple` flag automatically. The post correctly presents the CLI and CRD approaches as alternatives.
- The pool PG counts (32 and 64) specified in the manual pool creation commands are reasonable defaults but may need tuning based on cluster size. Ceph Nautilus+ has pg_autoscaler enabled by default which will adjust these automatically.
