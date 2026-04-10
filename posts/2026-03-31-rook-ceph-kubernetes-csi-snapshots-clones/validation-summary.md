# Validation Summary: How to Use Ceph with Kubernetes CSI Snapshots and Clones

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI driver for Kubernetes)
- Kubernetes CSI (Container Storage Interface)
- VolumeSnapshot API (`snapshot.storage.k8s.io/v1`)
- RBD (RADOS Block Device) snapshots and clones
- CephFS
- kubernetes-csi/external-snapshotter CRDs

## Sources Consulted
- Rook official documentation — Ceph CSI Snapshot guide: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Official Rook VolumeSnapshotClass example: https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/snapshotclass.yaml
- Kubernetes documentation — Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- kubernetes-csi/external-snapshotter repository: https://github.com/kubernetes-csi/external-snapshotter

## Issues Found
No technical issues found.

## Review Notes
- The VolumeSnapshotClass YAML matches the official Rook example (`deploy/examples/csi/rbd/snapshotclass.yaml`) exactly, including driver name, parameters, and deletion policy.
- The CRD installation URLs correctly use the `master` branch of the `kubernetes-csi/external-snapshotter` repository, which is the default branch.
- All Kubernetes API field names (`persistentVolumeClaimName`, `volumeSnapshotClassName`, `dataSource`, `apiGroup`) are correct for `snapshot.storage.k8s.io/v1`.
- The clone PVC correctly omits `apiGroup` for the core API group `PersistentVolumeClaim` data source.
- The `rbd snap ls` command syntax is correct for verifying snapshots at the Ceph level.
- The post only demonstrates RBD examples; CephFS snapshot/clone examples are not shown but are mentioned as supported, which is accurate.
