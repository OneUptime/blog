# Validation Summary: How to Create CephFS Volumes for Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph / CephFS
- Rook-Ceph Operator
- Kubernetes (PVC, StorageClass, Deployments)
- CSI (Container Storage Interface) driver for CephFS

## Sources Consulted
- Rook CephFS documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/
- Rook CephFS StorageClass example: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-storage/#provision-storage
- Rook CephFilesystem CRD reference: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Ceph mount options documentation: https://docs.ceph.com/en/latest/man/8/mount.ceph/

## Issues Found

1. **Incorrect `mountOptions: - discard` in StorageClass**: The `discard` mount option is a block-device option used for TRIM/unmap on RBD volumes (with ext4/xfs). CephFS is a network filesystem and does not support the `discard` mount option. Including it could cause mount failures depending on the CephFS client used. Removed the `mountOptions` section from the StorageClass. This option only appears in Rook's RBD StorageClass examples, not CephFS ones.

2. **Contradictory prerequisite**: The prerequisites listed "CephFS filesystem created via CephFilesystem CRD" but Step 1 of the guide walks through creating that exact resource. Removed the contradictory prerequisite to avoid confusing readers.

## Review Notes
- The CephFilesystem CRD, PVC, and Deployment manifests are all correct and follow Rook best practices.
- The StorageClass secret names (`rook-csi-cephfs-provisioner`, `rook-csi-cephfs-node`) and parameter names are correct for current Rook versions.
- The pool name `myfs-replicated` correctly follows Rook's naming convention of `<filesystem-name>-<data-pool-name>`.
- The RWX verification commands are a good practical demonstration of shared filesystem access across pods.
