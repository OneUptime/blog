# Validation Summary: How to Create a StorageClass for Rook RBD Block Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes StorageClass and PersistentVolumeClaim
- Rook CSI driver for RBD provisioning

## Sources Consulted
- Rook official documentation: Block Storage (RBD) StorageClass examples — https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Rook CephBlockPool CRD documentation — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Kubernetes StorageClass documentation — https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaim documentation — https://kubernetes.io/docs/concepts/storage/persistent-volumes/

## Issues Found
No technical issues found.

## Review Notes
- The StorageClass does not explicitly set `volumeBindingMode`. This defaults to `Immediate`, which is valid. Some production deployments prefer `WaitForFirstConsumer` for topology-aware scheduling, but omitting it is not an error.
- The `csi.storage.k8s.io/fstype` parameter is not set, which defaults to `ext4`. This is fine for most use cases.
- All CSI secret names (`rook-csi-rbd-provisioner`, `rook-csi-rbd-node`) match the defaults created by the Rook operator.
- The `mountOptions: [discard]` is a good practice for SSD-backed clusters to support TRIM operations.
