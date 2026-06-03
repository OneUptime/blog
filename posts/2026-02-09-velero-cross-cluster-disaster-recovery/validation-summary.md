# Validation Summary: How to Implement Cross-Cluster Velero Restore for Disaster Recovery Scenarios

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Velero
- Kubernetes
- AWS S3 backup storage
- Kubernetes CronJob
- PrometheusRule / PromQL
- Kubernetes storage classes and persistent volumes

## Sources Consulted
- Velero v1.18 Backup Storage Locations documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero v1.18 Backup Storage Locations and Volume Snapshot Locations documentation: https://velero.io/docs/v1.18/locations/
- Velero v1.18 Restore API documentation: https://velero.io/docs/v1.18/api-types/restore/
- Velero v1.18 Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 CLI source for `restore create` flags: https://github.com/vmware-tanzu/velero/blob/v1.18.0/pkg/cmd/cli/restore/create.go
- Velero v1.18 CLI source for `install` validation: https://github.com/vmware-tanzu/velero/blob/v1.18.0/pkg/cmd/cli/install/install.go
- Velero v1.18 metrics source: https://github.com/vmware-tanzu/velero/blob/v1.18.0/pkg/metrics/metrics.go

## Issues Found
- The primary cluster installed Velero without the `primary-cluster` bucket prefix, while the DR cluster `BackupStorageLocation` read from that prefix. Added `--prefix primary-cluster` to the primary install command so the backup path matches the restore-side BSL.
- The DR install command combined `--no-default-backup-location` with `--bucket` and `--backup-location-config`, which Velero rejects. Removed the default-location flags and set `--use-volume-snapshots=false` for a restore-side install that creates the AWS plugin and node-agent without creating a default BSL.
- The post stated that `snapshotVolumes: true` and `defaultVolumesToFsBackup: true` create both snapshot and file-level backups for the same volumes. Updated the wording because Velero treats File System Backup and volume snapshots as mutually exclusive per volume.
- The restore examples used an unsupported `velero restore create --storage-class-mappings` flag. Removed those flags and kept the documented `velero.io/change-storage-class: RestoreItemAction` ConfigMap approach.
- The Restore hook YAML used `post` and `timeout`, but the current Restore API uses `postHooks` and `execTimeout` for exec restore hooks. Updated those field names.
- The monitoring example used nonexistent or incorrectly labeled Velero metrics, including `velero_restore_last_successful_timestamp` and `velero_backup_total{location=...}`. Replaced them with current Velero metrics and labels from the v1.18 metrics source.
- The multi-region example claimed a single Velero schedule backs up to both regions. Updated the comment to clarify that the schedule writes to one `BackupStorageLocation` and S3 replication copies the backup to the second region.
- The runbook snippet had malformed nested Markdown fences and the post ended with an empty bash code block. Corrected the fenced Markdown block and removed the empty code block.

## Review Notes
- The examples use `velero/velero-plugin-for-aws:v1.9.0` and `velero/velero:v1.12.0`, which are not the latest Velero components as of this review. They are version-specific examples rather than deprecated APIs, so no change was required.
- Cross-region or cross-provider restores that rely on cloud volume snapshots require storage-provider support and may need snapshot copy/replication outside Velero. The post now avoids implying that snapshots are universally portable.
