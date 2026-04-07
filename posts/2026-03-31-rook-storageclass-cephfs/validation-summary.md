# Validation Summary: How to Create a StorageClass for CephFS in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CephFS (distributed POSIX filesystem)
- Kubernetes StorageClass and PersistentVolumeClaim
- Ceph CSI Driver (CephFS provisioner)
- CephFS kernel driver vs FUSE

## Sources Consulted
- Rook official StorageClass example: `deploy/examples/csi/cephfs/storageclass.yaml` in the Rook GitHub repository (https://github.com/rook/rook)
- Rook CephFS Filesystem Storage documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/)
- Ceph CSI upstream CephFS StorageClass parameter documentation (https://github.com/ceph/ceph-csi)

## Issues Found
- **Removed invalid `rootPath: /volumes` parameter**: The `rootPath` parameter in a CephFS StorageClass is only used when `provisionVolume` is set to `"false"` (for pre-provisioned/static volumes). For standard dynamic provisioning (the default), the CSI driver computes the subvolume path automatically. Including `rootPath` in a dynamically provisioned StorageClass is incorrect and could cause confusion. Removed the parameter and its comment from the standard StorageClass example.

## Review Notes
- The comparison table states RBD only supports ReadWriteOnce. While this is the most common mode, RBD also supports ReadWriteOncePod and (with `multiNodeWritable` in newer versions) ReadWriteMany for specific use cases. The table is acceptable as a simplified overview for the target audience.
- The post does not mention the optional `subvolumeGroup` parameter, which can be used to control which CephFS subvolume group dynamically provisioned volumes are placed in. This is an advanced option and its omission is reasonable for an introductory guide.
- The default mounter behavior description ("uses the Ceph FUSE library by default") is slightly simplified — the CSI driver may auto-detect the best option. However, FUSE is the typical default fallback, so this is acceptable.
