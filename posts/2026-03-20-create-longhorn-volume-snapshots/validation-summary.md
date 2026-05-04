# Validation Summary: How to Create Longhorn Volume Snapshots

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Longhorn (Rancher's distributed block storage for Kubernetes)
- Kubernetes (PersistentVolumeClaim, CSI snapshots)
- `longhorn.io/v1beta2` Snapshot CRD
- Kubernetes VolumeSnapshot API (`snapshot.storage.k8s.io/v1`)
- kubernetes-csi/external-snapshotter

## Sources Consulted
- Longhorn 1.10.1 docs — Create a Snapshot: https://longhorn.io/docs/1.10.1/snapshots-and-backups/setup-a-snapshot/
- Longhorn 1.10.1 docs — CSI VolumeSnapshot Associated with Longhorn Snapshot: https://longhorn.io/docs/1.10.1/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-snapshot/
- Longhorn 1.11.0 docs — CSI VolumeSnapshot Associated with Longhorn Backup (for `type` parameter semantics): https://longhorn.io/docs/1.11.0/snapshots-and-backups/csi-snapshot-support/csi-volume-snapshot-associated-with-longhorn-backup/
- kubernetes-csi/external-snapshotter releases (verified v6.3.3 tag exists): https://github.com/kubernetes-csi/external-snapshotter/tree/v6.3.3
- Longhorn extended CSI snapshot support release notes (v1.3.0): https://longhorn.github.io/longhorn-tests/manual/release-specific/v1.3.0/extend_csi_snapshot_support/

## Issues Found
- **Missing `parameters.type: snap` in VolumeSnapshotClass.** The original `volume-snapshot-class.yaml` example omitted the `parameters` block. Per the Longhorn docs, the `type` parameter must be set to `snap` to create a Longhorn (in-cluster) snapshot via the CSI VolumeSnapshot API. When `type` is unset, the default behavior is to create a backup (`type: bak`), which requires a configured backup target and is not what this post is teaching. I added the `parameters: { type: snap }` block with an explanatory comment so the example actually creates a snapshot rather than silently attempting a backup.

## Review Notes
- The `longhorn.io/v1beta2` Snapshot CRD example (`spec.volume`, `spec.createSnapshot: true`) matches the official Longhorn docs.
- CSI driver name `driver.longhorn.io` is correct.
- The PVC `dataSource` block restoring from a `VolumeSnapshot` is structured correctly (correct `apiGroup`, `kind`, `name`).
- The external-snapshotter v6.3.3 CRD URLs are valid; that tag exists. v6.3.3 is, however, on the older v6 line — newer v8.x releases are available (e.g., v8.5.0). If targeting recent Kubernetes versions, readers may want a newer release, though v6.3.3 still works for the snapshot v1 API. Left as-is since it is technically correct.
- The post recommends stopping the pod before reverting, which matches Longhorn's requirement that the volume be detached/in maintenance mode for revert operations.
- The Snapshot vs Backup comparison table is accurate at a high level.
