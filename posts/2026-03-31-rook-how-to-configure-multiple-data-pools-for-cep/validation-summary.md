# Validation Summary: How to Configure Multiple Data Pools for CephFS in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (CRDs, StorageClasses, PVCs)
- Ceph CSI driver (cephfs.csi.ceph.com)
- Erasure coding and replicated pool configurations

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.github.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Rook CephFS StorageClass example: https://github.com/rook/rook/blob/master/deploy/examples/csi/cephfs/storageclass.yaml
- Rook filesystem-ec example: https://github.com/rook/rook/blob/master/deploy/examples/filesystem-ec.yaml
- Rook filesystem example: https://github.com/rook/rook/blob/master/deploy/examples/filesystem.yaml
- Ceph File Layouts documentation: https://docs.ceph.com/en/reef/cephfs/file-layouts/
- Ceph Pools documentation: https://docs.ceph.com/en/reef/rados/operations/pools/

## Issues Found
No technical issues found.

## Review Notes
- The `dataPools` array fields (`name`, `failureDomain`, `replicated`, `erasureCoded`, `parameters`, `deviceClass`) are all valid and correctly used.
- `requireSafeReplicaSize: true` is a valid field under `replicated` configuration.
- `compression_mode` values `none` and `aggressive` are both valid (other valid values are `passive` and `force`).
- `preserveFilesystemOnDelete: true` is correctly used as a safety measure.
- `metadataServer` fields `activeCount` and `activeStandby` are valid.
- Pool naming convention `<fsName>-<poolName>` (e.g., `myfs-ec-pool`) is correct for Rook.
- The `pool` parameter in the CephFS StorageClass is valid for directing provisioned volumes to a specific data pool.
- The `ceph.dir.layout.pool` extended attribute used with `setfattr` is the correct way to set directory-level pool layout in CephFS.
- CSI secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) and provisioner name (`rook-ceph.cephfs.csi.ceph.com`) are all correct defaults.
- The `ssd-pool` with `replicated.size: 2` does not set `requireSafeReplicaSize: false`, which means it defaults to `true`. With only 2 replicas this is still valid (the safe minimum is 2 for a host failure domain with at least 2 hosts), but operators should ensure they have sufficient hosts.
