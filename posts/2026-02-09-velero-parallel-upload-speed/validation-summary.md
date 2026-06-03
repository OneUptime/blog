# Validation Summary: How to Use Velero Parallel Upload Options to Speed Up Large Backup Operations

## Status
validated

## Post Type
Tutorial / Performance optimization guide

## Technologies Covered
- Kubernetes
- Velero
- Velero node-agent
- Velero file system backup and CSI snapshot data movement
- Kopia uploader
- AWS S3 and S3 Transfer Acceleration
- Prometheus / Prometheus Operator
- Bash
- Python

## Sources Consulted
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 Backup Reference: https://velero.io/docs/v1.18/backup-reference/
- Velero v1.18 Backup API Type: https://velero.io/docs/v1.18/api-types/backup/
- Velero v1.18 BackupStorageLocation API Type: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero v1.18 Customize Installation documentation: https://velero.io/docs/v1.18/customize-installation/
- Velero Node-agent Concurrency documentation: https://velero.io/docs/main/node-agent-concurrency/
- Velero AWS plugin documentation: https://github.com/velero-io/velero-plugin-for-aws

## Issues Found
- The post described `--parallel-files-upload` as a Velero server or node-agent startup flag. Changed the examples to configure it on `velero backup create` and `spec.uploaderConfig.parallelFilesUpload`, which is the documented scope.
- The AWS install command omitted the AWS plugin. Added `--plugins velero/velero-plugin-for-aws:v1.14.0`, which matches the Velero v1.18 plugin line.
- The post recommended Restic for current backups. Updated examples to use Kopia because current Velero documentation marks Restic backup usage as deprecated/disabled in newer releases.
- The node-agent DaemonSet example passed unsupported parallel upload arguments. Replaced it with a Schedule template using `uploaderConfig.parallelFilesUpload`.
- The S3 Transfer Acceleration endpoint included the bucket name in `s3Url`. Updated it to the accelerate endpoint with virtual-hosted style enabled.
- The performance shell script read a non-existent `.status.progress.totalBytes` field. Updated it to measure duration and backed-up items from the Backup status.
- The network tuning section used a ConfigMap that would not apply kernel TCP settings. Replaced it with explicit node-level `sysctl` commands and a note about platform approval.
- The Prometheus examples treated a histogram and item gauge as upload throughput metrics. Updated the duration alert to use `velero_backup_duration_seconds_bucket` with `histogram_quantile` and changed the item-count alert wording.
- The Python benchmark set an unused `PARALLEL_FILES_UPLOAD` environment variable on the Velero deployment. Updated it to pass `--parallel-files-upload` on each test backup.

## Review Notes
The examples are now aligned with Velero v1.18-era documentation. Operators should still test exact AWS plugin and Velero image versions together, because plugin compatibility is version-specific.
