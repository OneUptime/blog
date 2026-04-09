# Validation Summary: How to Configure Data Pool Settings for CephFS in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Ceph data pools (replicated and erasure coded)
- Kubernetes StorageClass for CephFS CSI
- CephFS layout pinning (directory-level pool routing)
- Ceph pool compression settings

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFilesystem StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Ceph CephFS layout documentation: https://docs.ceph.com/en/latest/cephfs/file-layouts/
- Ceph erasure coding documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph pool compression documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression

## Issues Found
1. **Incorrect pool name in `setfattr` command (line 126)**: The command used `hdd-data` as the pool value, but Rook automatically prefixes pool names with the filesystem name. Since the filesystem is named `myfs` and the data pool is named `hdd-data`, the actual Ceph pool name is `myfs-hdd-data`. This was inconsistent with the rest of the post, which correctly uses the full prefixed pool names (e.g., `myfs-hdd-data` in the compression CLI commands, `myfs-replicated-data` in the StorageClass). Fixed `setfattr -n ceph.dir.layout.pool -v hdd-data` to `setfattr -n ceph.dir.layout.pool -v myfs-hdd-data`, and updated the follow-up text accordingly.

## Review Notes
- The `setfattr`/`getfattr` commands are shown after exec-ing into the rook-ceph-tools pod, but those commands require a mounted CephFS filesystem which the tools pod does not have by default. The post does include a comment noting "Mount the filesystem (or use a client pod)" which partially addresses this, so no change was made.
- All YAML CRD structures (CephFilesystem, StorageClass) are correct for current Rook versions.
- The erasure coding overhead math (50% for 4+2 EC vs 200% for 3-way replication) is correct.
- The CSI provisioner name `rook-ceph.cephfs.csi.ceph.com` and default secret names are correct for Rook.
- The EC profile name `myfs-ec-data-ec-profile` follows Rook's naming convention correctly.
