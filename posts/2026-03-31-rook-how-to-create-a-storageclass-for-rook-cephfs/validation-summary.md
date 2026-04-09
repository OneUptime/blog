# Validation Summary: How to Create a StorageClass for Rook CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph orchestrator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Kubernetes StorageClass, PersistentVolumeClaim, Pod
- Ceph CSI driver (cephfs.csi.ceph.com)

## Sources Consulted
- Rook CephFS StorageClass documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- CephFS kernel mount options: https://docs.ceph.com/en/latest/man/8/mount.ceph/

## Issues Found
1. **`mountOptions: - discard` removed from StorageClass** — The `discard` mount option enables TRIM/unmap operations on block devices and is appropriate for RBD (block storage) StorageClasses. CephFS is a distributed filesystem, not a block device, and does not support the `discard` mount option. The official Rook CephFS StorageClass examples do not include this option. Removed the `mountOptions` block entirely.

2. **"CephFilesystem CRD" changed to "CephFilesystem resource"** — CephFilesystem is a Custom Resource (CR) instance, not a Custom Resource Definition (CRD). The CRD defines the schema; the actual deployed object is a CR. Changed "CRD" to "resource" for accuracy.

## Review Notes
- The provisioner name `rook-ceph.cephfs.csi.ceph.com` follows the correct `{namespace}.cephfs.csi.ceph.com` pattern.
- The secret names `rook-csi-cephfs-provisioner` and `rook-csi-cephfs-node` are the correct default names created by the Rook operator.
- The pool name `myfs-replicated` is valid and follows the `{fsName}-{poolName}` convention used when a data pool is named "replicated" in the CephFilesystem spec.
- The default StorageClass annotation `storageclass.kubernetes.io/is-default-class` is correct.
- All kubectl commands are syntactically correct and use appropriate flags.
- The PVC correctly uses `ReadWriteMany` access mode, which is a key advantage of CephFS over RBD.
