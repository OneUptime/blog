# Validation Summary: How to Back Up and Restore PVC-Based Clusters in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CSI snapshot integration)
- Kubernetes (VolumeSnapshot, VolumeSnapshotClass, PersistentVolumeClaim, CronJob)
- CSI external-snapshotter
- Ceph RBD (block storage)

## Sources Consulted
- Rook Ceph CSI Snapshot Documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Ceph-CSI/ceph-csi-snapshot/
- Rook RBD snapshotclass.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/csi/rbd/snapshotclass.yaml
- external-snapshotter CRD directory: https://github.com/kubernetes-csi/external-snapshotter/tree/master/client/config/crd
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Volume Snapshot Classes documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/

## Issues Found
- **Incorrect branch name in external-snapshotter CRD URLs**: The three `kubectl apply` commands for installing CRDs referenced the `main` branch (`/external-snapshotter/main/client/config/crd/...`), but the `kubernetes-csi/external-snapshotter` repository uses `master` as its default branch. The `main` URLs return HTTP 404. Fixed by replacing `main` with `master` in all three URLs.

## Review Notes
- The VolumeSnapshotClass YAML correctly uses `driver`, `deletionPolicy`, and `parameters` as top-level fields (not nested under `spec`), matching the Kubernetes API for this resource kind.
- The CSI driver name `rook-ceph.rbd.csi.ceph.com` and secret name `rook-csi-rbd-provisioner` match the official Rook examples for the default `rook-ceph` namespace deployment.
- The CronJob YAML uses a YAML literal block scalar (`|`) for the shell script, which correctly strips leading indentation so the heredoc and its content render as valid shell/YAML at runtime.
- The PVC restore using `dataSource` with `kind: VolumeSnapshot` and `apiGroup: snapshot.storage.k8s.io` matches the canonical Kubernetes documentation pattern.
- The `snapshot.storage.k8s.io/v1` API version is correct (GA since Kubernetes 1.20).
