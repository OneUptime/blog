# Validation Summary: Velero CSI Snapshots vs. File-System Backups: Which Protects Your PVCs Better?

## Status
validated

## Post Type
Technical guide and comparison

## Technologies Covered

- Kubernetes
- Velero 1.18
- Container Storage Interface (CSI)
- Kubernetes `VolumeSnapshot`, `VolumeSnapshotContent`, and `VolumeSnapshotClass`
- Velero File System Backup (FSB)
- Kopia backup repositories
- Velero CSI Snapshot Data Movement
- Velero node agent
- CSI Volume Group Snapshots

## Sources Consulted

- [Velero 1.18: Container Storage Interface Snapshot Support](https://velero.io/docs/v1.18/csi/)
- [Velero 1.18: File System Backup](https://velero.io/docs/v1.18/file-system-backup/)
- [Velero 1.18: CSI Snapshot Data Movement](https://velero.io/docs/v1.18/csi-snapshot-data-movement/)
- [Velero 1.18: Customize Velero Install](https://velero.io/docs/v1.18/customize-installation/)
- [Velero 1.18: Restore Reference](https://velero.io/docs/v1.18/restore-reference/)
- [Velero 1.18: Backup Reference](https://velero.io/docs/v1.18/backup-reference/)
- [Velero 1.18: Backup Hooks](https://velero.io/docs/v1.18/backup-hooks/)
- [Velero 1.18: Volume Group Snapshots](https://velero.io/docs/v1.18/volume-group-snapshots/)
- [Kubernetes: Volume Snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Velero v1.18.1 release](https://github.com/vmware-tanzu/velero/releases/tag/v1.18.1), including the release CLI's `backup create --help` and `backup describe --help` output

## Issues Found

- The CSI workflow attributed creation of both `VolumeSnapshot` and `VolumeSnapshotContent` objects to Velero and implied that the common snapshot controller calls the storage backend. Changed the explanation to state that Velero creates the `VolumeSnapshot`, the snapshot controller creates and binds the `VolumeSnapshotContent`, and the external-snapshotter sidecar invokes the CSI driver.
- The FSB restore explanation said Velero dynamically provisions a PVC. Changed it to reflect the documented workflow: Velero creates the PVC, Kubernetes dynamically provisions the PV, and Velero populates the mounted volume.
- The snapshot data-movement cleanup explanation tied snapshot deletion directly to a single upload reaching a terminal state. Changed it to the documented lifecycle in which Velero removes the temporary CSI snapshot after the backup completes.
- The cross-provider restore explanation only required an unspecified functioning StorageClass. Clarified that the target needs a working StorageClass with the source class's name or a restore-time storage-class mapping.
- The CSI Snapshot Data Movement documentation link used the unstable `main` documentation while the post discusses Velero 1.18. Pinned the link to the Velero 1.18 documentation.

## Review Notes

- The `velero backup create` example was checked against the Velero 1.18.1 CLI. `--include-namespaces`, `--snapshot-move-data`, and `--wait` are valid, current flags. `velero backup describe --details` is also valid.
- The FSB annotations and the `velero.io/backup-name` selectors for `PodVolumeBackup` and `DataUpload` resources match the Velero 1.18 documentation.
- Velero 1.18 documentation classifies FSB as beta. The Restic backup path is disabled in Velero 1.17 and 1.18, while restores of existing Restic backups remain supported; the post's Kopia-based description is correct for new 1.18 FSB backups.
- CSI Volume Group Snapshot use remains conditional on compatible CRDs, external-snapshotter, and CSI-driver support. Velero 1.18.1 uses the VolumeGroupSnapshot v1beta2 API and documents external-snapshotter v8.2.0 or later as a prerequisite.
