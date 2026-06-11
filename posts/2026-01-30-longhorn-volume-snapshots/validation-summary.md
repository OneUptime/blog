# Validation Summary: How to Build Longhorn Volume Snapshots

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- Kubernetes CSI VolumeSnapshot API
- kubectl
- Prometheus metrics
- YAML manifests

## Sources Consulted
- Longhorn CSI Snapshot Support: https://longhorn.io/docs/1.12.0/snapshots-and-backups/csi-snapshot-support/
- Longhorn CSI VolumeSnapshot Associated with Longhorn Snapshot: https://longhorn.io/docs/1.12.0/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn Enable CSI Snapshot Support: https://longhorn.io/docs/1.12.0/snapshots-and-backups/csi-snapshot-support/enable-csi-snapshot-support/
- Longhorn Recurring Snapshots and Backups: https://longhorn.io/docs/1.12.0/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn Snapshot Space Management: https://longhorn.io/docs/1.12.0/snapshots-and-backups/snapshot-space-management/
- Longhorn Metrics for Monitoring: https://longhorn.io/docs/1.12.0/monitoring/metrics/
- Kubernetes Volume Snapshots: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClasses: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/

## Issues Found
- The snapshot-controller installation commands used unpinned `master` branch raw GitHub URLs. Replaced them with the Longhorn-documented approach of installing matching external-snapshotter CRDs and controller manifests from a specific release with `kubectl create -k`.
- The "Creating Snapshots with kubectl" section said to use Longhorn custom resources directly, but the example actually calls the Longhorn API through `kubectl exec`. Reworded the section to describe the API and CSI options accurately.
- The restore PVC example omitted Longhorn's requirement that the restored PVC storage request match the `VolumeSnapshot` size. Added this note after the restore command.
- The snapshot space usage command described `.status.actualSize` as a snapshot count. Changed the wording and column name to actual space usage.
- The Prometheus metrics list included `longhorn_snapshot_count`, which is not listed in the current Longhorn metrics documentation. Replaced it with `longhorn_snapshot_actual_size_bytes`.

## Review Notes
The post is now technically consistent with current Longhorn 1.12.0 and Kubernetes VolumeSnapshot documentation. The Longhorn API examples rely on Longhorn's internal API surface; for portable Kubernetes workflows, the CSI `VolumeSnapshot` examples are preferable.
