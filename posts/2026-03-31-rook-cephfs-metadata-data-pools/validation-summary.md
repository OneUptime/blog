# Validation Summary: How to Configure CephFilesystem Metadata Pool and Data Pools in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (StorageClass, CSI provisioner)
- Erasure coding (Ceph EC pools)

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph CephFS documentation: https://docs.ceph.com/en/latest/cephfs/
- Ceph pool compression settings: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression
- Ceph CLI reference for `ceph fs set`: https://docs.ceph.com/en/latest/cephfs/administration/

## Issues Found
No technical issues found.

## Review Notes
- All YAML configurations use correct Rook CephFilesystem CRD field names and structure.
- The pool naming convention (`<filesystem-name>-<pool-name>`) used in StorageClass `pool` parameters correctly reflects how Rook names the underlying Ceph pools.
- The CSI secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) are the correct Rook defaults.
- The `deviceClass` field for targeting SSD vs HDD OSDs is correctly placed at the pool level.
- Erasure coding configuration with `dataChunks` and `codingChunks` uses the correct Rook field names.
- The compression parameters (`compression_mode`, `compression_algorithm`) are valid Ceph BlueStore pool-level settings.
- The `ceph fs set <name> default_data_pool <pool>` command is the correct way to change the default data pool in CephFS.
- The claim that metadata pool loss corrupts the entire filesystem is accurate — CephFS metadata is critical and non-recoverable without the metadata pool.
