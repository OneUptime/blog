# Validation Summary: How to Restore Volumes from Snapshots with Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook
- Ceph (RBD and CephFS)
- Kubernetes CSI (Container Storage Interface)
- Kubernetes VolumeSnapshots (snapshot.storage.k8s.io/v1)
- PersistentVolumeClaims with dataSource

## Sources Consulted
- Rook official documentation on snapshots and restores: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes CSI snapshot restore documentation: https://kubernetes-csi.github.io/docs/snapshot-restore-feature.html
- Kubernetes API reference for VolumeSnapshotContent (cluster-scoped resource): https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/volume-snapshot-content-v1/

## Issues Found
1. **Cross-Namespace Restore section was incorrect**: The original section suggested running `kubectl apply -f snapshot-content.yaml -n target-namespace` to apply a `VolumeSnapshotContent` to a target namespace. This is wrong because `VolumeSnapshotContent` is a **cluster-scoped** resource and does not belong to any namespace — the `-n` flag has no effect on it. The described workflow was also oversimplified and would not actually achieve a cross-namespace restore. **Fix**: Replaced the section with the correct pre-provisioned static snapshot binding workflow: (1) extract the snapshot handle from the original VolumeSnapshotContent, (2) create a new VolumeSnapshotContent referencing the handle and pointing to a new VolumeSnapshot in the target namespace, (3) create the corresponding VolumeSnapshot in the target namespace, (4) use that snapshot as a dataSource in the target namespace PVC.

## Review Notes
- The RBD and CephFS restore PVC examples are correct and follow Rook's recommended patterns.
- The CSI driver name in the cross-namespace example (`rook-ceph.rbd.csi.ceph.com`) is specific to RBD; for CephFS cross-namespace restores, users would need to use `rook-ceph.cephfs.csi.ceph.com` instead. This is implicit but could be noted in a future update.
- The `deletionPolicy: Retain` in the cross-namespace VolumeSnapshotContent is important to prevent the underlying snapshot from being deleted when the new content object is removed.
