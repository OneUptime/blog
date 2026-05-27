# Validation Summary: How to Create and Restore Volume Snapshots in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- CSI volume snapshots
- VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass CRDs
- PersistentVolumeClaim restore from snapshots
- kubectl
- Bash
- PostgreSQL backup hooks

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Volume Snapshot Classes documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes CSI external-snapshotter documentation: https://kubernetes-csi.github.io/docs/external-snapshotter.html
- Kubernetes releases and supported versions: https://kubernetes.io/releases/
- PostgreSQL 15 release notes: https://www.postgresql.org/docs/15/release-15.html
- PostgreSQL 16 Continuous Archiving and Point-in-Time Recovery documentation: https://www.postgresql.org/docs/16/continuous-archiving.html

## Issues Found
- The automated snapshot script used `jq` but the prerequisites did not mention it. Added `jq` as a prerequisite for users who run the rotation script.
- The pre-snapshot hook example used `pg_start_backup` and `pg_stop_backup`, which were renamed to `pg_backup_start` and `pg_backup_stop` in PostgreSQL 15, and implied that those functions freeze writes. Replaced that example with application-specific pre/post hooks and noted that PostgreSQL physical backups should use a PostgreSQL-aware backup tool or the current non-exclusive backup API.
- The pre-snapshot hook example applied `/config/snapshot-template.yaml` without defining that file and did not wait for the actual snapshot it created. Replaced it with an inline `VolumeSnapshot` manifest using a generated snapshot name and a `kubectl wait` command for that snapshot.
- The cross-namespace restore example used a broad `.items[0]` lookup for the source `VolumeSnapshotContent`. Changed it to read the bound content name from the source `VolumeSnapshot` first, then read the matching content's `snapshotHandle`.
- The pre-provisioned `VolumeSnapshotContent` example omitted `sourceVolumeMode`. Added `sourceVolumeMode: Filesystem`, which current Kubernetes documentation recommends populating for pre-provisioned snapshots.
- The cross-namespace restore comment described creating `VolumeSnapshotContent` "in the target namespace context", but `VolumeSnapshotContent` is cluster-scoped. Updated the comment to state that the content object is cluster-scoped and references the target namespace.

## Review Notes
The snapshot API examples use the GA `snapshot.storage.k8s.io/v1` resources and the documented `dataSource` restore flow. The external-snapshotter install commands point to a fixed v8.0.0 release; they are plausible, but future maintenance should consider updating them to the latest release tested with the target Kubernetes versions.
