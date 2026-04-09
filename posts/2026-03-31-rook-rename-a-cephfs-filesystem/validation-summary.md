# Validation Summary: How to Rename a CephFS Filesystem

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS)
- Rook (Ceph Operator for Kubernetes)
- Kubernetes (StorageClass, CRDs, kubectl)

## Sources Consulted
- Ceph official documentation for `ceph fs rename`: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph Quincy v17.2.0 release notes (confirms `fs rename` introduction)
- Ceph source code `src/mon/FSCommands.cc` (RenameFilesystemHandler) for prerequisite enforcement
- Ceph mount.ceph man page: https://docs.ceph.com/en/latest/man/8/mount.ceph/
- Ceph FUSE mount documentation: https://docs.ceph.com/en/latest/cephfs/mount-using-fuse/
- Ceph config option definitions (`src/common/options/mds-client.yaml.in`) for `client_fs` verification
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/reef/cephfs/fs-volumes/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Rook CephFS StorageClass example: `deploy/examples/csi/cephfs/storageclass.yaml`

## Issues Found

### 1. Missing prerequisite: Mirroring must be disabled
- **What was wrong:** The prerequisites section omitted that mirroring must be disabled on the filesystem before renaming. The Ceph source code enforces this check (`fs->mirror_info.mirrored`) and returns `-EPERM` if mirroring is enabled.
- **What was changed:** Added "Mirroring must be disabled on the filesystem" to the prerequisites list.
- **Why:** This is an enforced requirement in the code, not just a best practice. Omitting it would cause users to encounter an unexplained error.

### 2. Dangerous error: `preserveFilesystemOnDelete` value inverted
- **What was wrong:** The blog advised deleting the old `CephFilesystem` CRD with `preserveFilesystemOnDelete: false`. Setting this to `false` causes Rook to **destroy the underlying Ceph filesystem and its pools/data** when the CRD is deleted. In a migration/rename scenario, this would result in data loss.
- **What was changed:** Corrected to `preserveFilesystemOnDelete: true` with a clarifying note that this preserves the underlying data and pools.
- **Why:** This was a critical error that could lead to data loss. The correct value is `true`, which tells Rook to preserve the filesystem data even after the CRD resource is deleted.

## Review Notes
- The `ceph fs rename` command also updates application tags on the data and metadata pools (not just the filesystem name in the FSMap). The blog's description of it as a "metadata-only operation" is slightly imprecise but acceptable for a tutorial context.
- The prerequisites about unmounting clients and active MDS daemons are good best practices but are not strictly enforced in Ceph Quincy. Enforcement of the "filesystem must be offline" requirement was added in Ceph Reef (PR #61410). The current wording using "should" rather than "must" is appropriate.
- The `kubectl rollout restart` command for the operator works in practice but is not the officially documented approach (Rook docs use scale-down/scale-up). It is functionally equivalent and acceptable.
- The `client_fs` ceph.conf option is correct for Ceph Octopus and later. The older `client_mds_namespace` option still works but is at dev-level and considered legacy.
- The `fs=` kernel mount option is correct. The older `mds_namespace=` synonym is deprecated.
