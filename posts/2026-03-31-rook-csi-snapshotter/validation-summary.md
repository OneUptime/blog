# Validation Summary: How to Use Rook-Ceph CSI Snapshotter for Data Protection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI drivers for RBD and CephFS)
- Kubernetes CSI Snapshot Framework (VolumeSnapshot, VolumeSnapshotClass, VolumeSnapshotContent)
- Kubernetes external-snapshotter (release-8.0)
- Ceph RBD (RADOS Block Device) snapshots
- CephFS subvolume snapshots
- Kubernetes PersistentVolumeClaim cloning
- Kubernetes CronJob for scheduled snapshots

## Sources Consulted
- Rook Ceph CSI Snapshots documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Volume Cloning documentation: https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/
- kubernetes-csi/external-snapshotter repository (release-8.0 branch): https://github.com/kubernetes-csi/external-snapshotter/tree/release-8.0
- Rook example VolumeSnapshotClass YAMLs in the Rook repository

## Issues Found
1. **Incorrect snapshot consistency claim in CronJob section**: The text stated "Use a CronJob to take application-consistent snapshots on a schedule." CSI volume snapshots are crash-consistent by default, not application-consistent. Application consistency requires the application to flush buffers and quiesce I/O before the snapshot is taken, which the CronJob example does not do. Fixed the text to say "crash-consistent" and added a note about what application consistency requires.

## Review Notes
- All external-snapshotter URLs reference the `release-8.0` branch, which is a valid release. Readers using older Kubernetes versions may need to use an earlier release branch.
- The VolumeSnapshotClass YAML uses `driver` and `deletionPolicy` at the top level (not under `spec`), which is correct for the `snapshot.storage.k8s.io/v1` API version.
- The CSI driver names (`rook-ceph.rbd.csi.ceph.com` and `rook-ceph.cephfs.csi.ceph.com`) assume the default Rook operator namespace `rook-ceph`. Users with a custom namespace will need to adjust.
- The `rbd snap ls replicapool/csi-vol-abc123` command uses a placeholder image name (`csi-vol-abc123`), which is appropriate for illustrative purposes.
- The CronJob example requires a ServiceAccount (`snapshot-sa`) with appropriate RBAC permissions to create VolumeSnapshot resources, which is mentioned but not fully detailed. This is acceptable for a tutorial.
- The scheduled snapshot CronJob does not include a retention/cleanup mechanism. The summary mentions "set retention policies" but no example is provided. This is a minor gap but not an error.
