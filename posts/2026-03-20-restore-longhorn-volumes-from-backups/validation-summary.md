# Validation Summary: How to Restore Longhorn Volumes from Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClass
- Longhorn Backup, BackupVolume, BackupTarget, and Volume custom resources
- S3-compatible, NFS, Azure Blob, and GCP Cloud Storage backup targets

## Sources Consulted
- Longhorn 1.11.1 Restore from a Backup: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/restore-from-a-backup/
- Longhorn 1.11.1 Storage Class Parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn 1.11.1 Setting a Backup Target: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn 1.11.1 Synchronize Backup Volumes Manually: https://longhorn.io/docs/1.11.1/snapshots-and-backups/backup-and-restore/synchronize_backup_volumes_manually/
- Longhorn 1.11.1 Disaster Recovery Volumes: https://longhorn.io/docs/1.11.1/snapshots-and-backups/setup-disaster-recovery-volumes/
- Longhorn 1.11.1 CRD definitions: https://raw.githubusercontent.com/longhorn/longhorn/v1.11.1/deploy/longhorn.yaml
- Longhorn Manager v1.11.1 source: https://github.com/longhorn/longhorn-manager/tree/v1.11.1
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The introduction said the article covered all restore methods. Changed this to "common restore methods" because Longhorn also documents additional restore paths such as CSI VolumeSnapshot-based restores and StatefulSet-specific restoration.
- The restore options table said an existing PVC could be replaced with backup data. Longhorn restores backups into a Longhorn volume or provisions a new PVC; it does not directly overwrite an existing PVC in place. Changed this to "New PVC".
- The Longhorn UI restore configuration listed Access Mode, Number of Replicas, and Storage Class fields. Current Longhorn restore documentation only documents the restore volume name at that step. Removed the unsupported fields.
- The backup URL discovery command used `backupvolumes.longhorn.io` and `grep URL`, but the current `BackupVolume` CR does not expose the backup URL. Changed the command to read `.status.url` from `backup.longhorn.io`.
- The PVC restore size comment said the requested size must match or exceed the original backup size. Current restore guidance and CRD behavior require using the backup volume size rather than requesting a larger replacement size. Changed the comment to use the original backup volume size.
- The kubectl restore method was labeled as a Backup custom resource, but the manifest creates a Longhorn `Volume`. Updated the heading to "Longhorn Volume Custom Resource".
- The Longhorn `Volume` restore example did not tell readers to get the exact backup volume size from `.status.volumeSize`. Added the command and changed the size comment to require the Backup CR value.
- The Longhorn `Volume` restore example omitted current documented fields `frontend: blockdev` and `dataEngine: v1`. Added both fields.
- The cross-cluster scan command patched the outdated/nonexistent `backup-target-poll-interval` setting. Replaced it with a `BackupTarget` sync request using `spec.syncRequestedAt`, and updated the UI instruction to use "Sync All Backup Volumes".

## Review Notes
No live Longhorn cluster was available in the workspace, so commands were validated against official Longhorn documentation, Kubernetes documentation, and the Longhorn v1.11.1 CRD schema rather than executed against a cluster.
