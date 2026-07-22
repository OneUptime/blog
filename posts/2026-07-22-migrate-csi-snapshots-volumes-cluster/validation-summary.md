# Validation Summary: Migrate CSI Snapshots and Persistent Volumes Between Kubernetes Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Container Storage Interface (CSI) volumes and volume handles
- Kubernetes VolumeSnapshot, VolumeSnapshotContent, and VolumeSnapshotClass APIs
- Pre-provisioned CSI snapshot import and volume restoration
- CSI volume group snapshots
- Velero CSI Snapshot Data Movement
- Velero File System Backup
- kubectl CLI

## Sources Consulted
- Kubernetes Volume Snapshots documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CSI Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/#csi
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes CSI Developer Documentation, VolumeSnapshot API: https://kubernetes-csi.github.io/docs/api/volume-snapshot.html
- Kubernetes CSI Developer Documentation, Snapshot and Restore Feature: https://kubernetes-csi.github.io/docs/snapshot-restore-feature
- Kubernetes CSI Developer Documentation, Volume Group Snapshot and Restore: https://kubernetes-csi.github.io/docs/group-snapshot-restore-feature.html
- Kubernetes 1.20 Volume Snapshot GA and snapshot import guidance: https://kubernetes.io/blog/2020/12/10/kubernetes-1.20-volume-snapshot-moves-to-ga/#importing-an-existing-volume-snapshot-with-kubernetes
- Velero 1.18 CSI Snapshot Data Movement documentation: https://velero.io/docs/v1.18/csi-snapshot-data-movement/
- Velero 1.18 Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero 1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/

## Issues Found
No technical issues found.

## Review Notes
- The `snapshot.storage.k8s.io/v1` manifests use the correct pre-provisioned binding fields: `snapshotHandle`, `sourceVolumeMode`, `volumeSnapshotRef`, and `volumeSnapshotContentName`.
- The PVC restore manifest correctly uses a `VolumeSnapshot` data source, preserves `volumeMode`, and requests capacity no smaller than the snapshot's known restore size.
- The `kubectl` inventory, patch, JSONPath, wait, and inspection commands use valid current syntax. In particular, changing a `VolumeSnapshotContent` deletion policy to `Retain` before deleting its bound `VolumeSnapshot` preserves both the content object and the underlying storage snapshot.
- The Velero descriptions match version 1.18 behavior: CSI Snapshot Data Movement uses an intermediate volume and data mover to transfer snapshot data through backup storage, while File System Backup reads volumes mounted by pods. The documented StorageClass mapping mechanism is also current for Velero 1.18.
- Snapshot sharing, copying, encryption, regional compatibility, and handle format remain provider- and driver-specific, as the post correctly states. The placeholder driver name, snapshot handle, StorageClass, capacity, and namespaces must be replaced with environment-specific values.
- The first Velero link in the post targets the rolling `main` documentation, which is marked as development documentation. Its relevant content currently agrees with the pinned Velero 1.18 documentation consulted during this review, but the rolling page may change independently in the future.
