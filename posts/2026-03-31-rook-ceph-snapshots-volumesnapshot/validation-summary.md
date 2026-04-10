# Validation Summary: How to Use Ceph Snapshots with Rook (VolumeSnapshot)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI-based storage orchestrator for Kubernetes)
- Kubernetes VolumeSnapshot API (snapshot.storage.k8s.io/v1)
- Ceph RBD (RADOS Block Device) snapshots
- CephFS subvolume snapshots
- kubernetes-csi/external-snapshotter controller
- Kubernetes CronJob (batch/v1)

## Sources Consulted
- Rook documentation on snapshots: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- kubernetes-csi/external-snapshotter GitHub repository: https://github.com/kubernetes-csi/external-snapshotter (verified default branch is `main`, not `master`)
- Ceph RBD snapshot documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
1. **External-snapshotter URLs used `master` branch instead of `main`**: All five `kubectl apply` URLs in the Prerequisites section referenced `https://raw.githubusercontent.com/kubernetes-csi/external-snapshotter/master/...`. The `kubernetes-csi/external-snapshotter` repository renamed its default branch from `master` to `main`. The old `master` URLs would 404. Fixed all five URLs to use `main`.

## Review Notes
- The VolumeSnapshotClass YAML for both RBD and CephFS correctly uses `snapshot.storage.k8s.io/v1`, the GA API version available since Kubernetes 1.20.
- The CSI driver names (`rook-ceph.rbd.csi.ceph.com` and `rook-ceph.cephfs.csi.ceph.com`) are correct for standard Rook-Ceph deployments.
- The secret names (`rook-csi-rbd-provisioner` and `rook-csi-cephfs-provisioner`) match the defaults created by the Rook operator.
- The CronJob heredoc approach for scheduled snapshots is functional but note that the service account (`snapshot-sa`) must be pre-created with appropriate RBAC permissions to create VolumeSnapshot resources, which is not covered in the post.
- The post does not cover restoring from a snapshot (creating a new PVC from a VolumeSnapshot), which would be a natural follow-up topic but is not required for the stated scope.
