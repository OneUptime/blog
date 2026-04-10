# Validation Summary: How to Set Up Cross-Namespace RBD Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (image mode)
- Kubernetes StorageClass, PersistentVolumeClaim
- Kubernetes RBAC (ClusterRoleBinding)
- Ceph CSI Driver (rook-ceph.rbd.csi.ceph.com)

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook RBD Mirroring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Rook StorageClass examples for RBD: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Ceph RBD mirror CLI reference: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/

## Issues Found
1. **Incorrect grep pattern in verification command**: The command `kubectl get pv | grep mirrored-pool` would not produce results because the default `kubectl get pv` output shows the StorageClass name (`rook-ceph-block-mirrored`) in its columns, not the Ceph pool name (`mirrored-pool`). Changed the grep pattern to `rook-ceph-block-mirrored` and updated the comment to say "mirrored StorageClass" instead of "mirrored pool" for clarity.

## Review Notes
- The post correctly includes `journaling` and `exclusive-lock` in imageFeatures, which are required for RBD image-mode mirroring.
- The RBAC section shows a ClusterRoleBinding that Rook typically creates automatically during operator setup. The post frames it as something to "ensure" exists, which is reasonable as a verification step, though users may not need to create it manually.
- The `rbd mirror image status` command in the verification section would need to be run from within a Ceph toolbox pod or a node with Ceph client tools and proper keyring access; this is not explicitly noted but is implied context for Rook users.
