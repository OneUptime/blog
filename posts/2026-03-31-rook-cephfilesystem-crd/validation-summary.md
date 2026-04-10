# Validation Summary: How to Use CephFilesystem CRD in Rook

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- CephFS (Ceph Filesystem)
- CephFilesystem CRD (`ceph.rook.io/v1`)
- Kubernetes StorageClass, PVC, and Deployment resources
- Ceph MDS (Metadata Server) daemons
- Ceph CSI driver for CephFS

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFS filesystem storage guide: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephBlockPool CRD documentation (shared pool spec fields): https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
No technical issues found.

## Review Notes
- The API version (`ceph.rook.io/v1`), kind, and all CRD spec fields (`metadataPool`, `dataPools`, `metadataServer`, `preserveFilesystemOnDelete`) are accurate and match the official Rook documentation.
- The minimal and full CephFilesystem YAML examples use correct field names and valid values. The full example correctly places a replicated pool before an erasure-coded pool, which is required by CephFS (the default data pool must be replicated).
- Pool parameters (`compression_mode: none`, `compression_mode: aggressive`, `compression_algorithm: zstd`) are valid Ceph pool parameters passed through the `parameters` map.
- The `requireSafeReplicaSize`, `erasureCoded.dataChunks`, and `erasureCoded.codingChunks` fields are all valid with sensible values.
- The StorageClass uses the correct provisioner (`rook-ceph.cephfs.csi.ceph.com`), correct secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`), and correct pool naming convention (`myfs-replicated` derived from filesystem name `myfs` + data pool name `replicated`).
- The PVC correctly uses `ReadWriteMany` access mode, which is the key differentiator for CephFS over block storage.
- The Deployment YAML is valid Kubernetes syntax and correctly references the PVC.
- All verification commands (`ceph fs ls`, `ceph fs status`, `ceph mds stat`, MDS pod label selector `app=rook-ceph-mds`) are correct.
- The architecture diagram accurately represents CephFS components: metadata pool (inodes, dirs, xattrs), data pool (file data), and MDS daemons (active + standby).
- Rook internally recommends a minimum of 4096MB memory for MDS daemons; the full example sets a 4Gi limit which meets this recommendation.
