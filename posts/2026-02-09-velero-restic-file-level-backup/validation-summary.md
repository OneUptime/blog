# Validation Summary: Configure Velero Restic Integration for File-Level Backup of Persistent Volumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Velero File System Backup
- Velero node-agent
- Kopia
- Kubernetes Persistent Volumes
- Kubernetes Deployments, Pods, DaemonSets, ConfigMaps, and Schedules
- AWS Velero plugin

## Sources Consulted
- Velero File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero Customize Installation documentation: https://velero.io/docs/v1.17/customize-installation/
- Velero Node-agent Concurrency documentation: https://velero.io/docs/v1.17/node-agent-concurrency/
- Velero Backup Reference documentation: https://velero.io/docs/v1.17/backup-reference/
- Velero Repository Maintenance documentation: https://velero.io/docs/v1.17/repository-maintenance/
- Velero Upgrade to 1.18 documentation: https://velero.io/docs/main/upgrade-to-1.18/
- Velero AWS plugin compatibility documentation: https://github.com/vmware-tanzu/velero-plugin-for-aws

## Issues Found
- The post described new Velero backups as Restic-based. Current Velero documentation deprecates Restic from v1.15, disables Restic backups in v1.17 and v1.18, and directs new installations to use the default Kopia uploader. Updated the article to describe Velero File System Backup with node-agent and Kopia, while preserving a Restic deprecation note.
- The post claimed HostPath volumes work with file-level backup. Velero documents HostPath volumes as unsupported. Updated the supported-volume wording and use-case list.
- The install example used an older AWS plugin version. Updated it to `velero/velero-plugin-for-aws:v1.14.0`, which is compatible with Velero v1.18.
- The pod example annotated a ConfigMap volume for file-level backup. ConfigMaps are Kubernetes API objects and are excluded by the opt-out file-system backup path. Simplified the example to a PVC-backed volume.
- The performance section claimed `--exclude-resources='events,pods/log'` excludes temporary files. That flag excludes Kubernetes resources, not files inside volumes, and `pods/log` is not a normal backup resource. Replaced it with volume exclusion annotation and a valid `events` resource exclusion.
- The concurrency example used unsupported environment variables (`VELERO_RESTIC_TIMEOUT` and `GOMAXPROCS`) for Velero upload tuning. Replaced it with `--parallel-files-upload` and the documented node-agent concurrency ConfigMap.
- The large-volume timeout example used an invalid `fsBackupTimeout` field in a `Backup` custom resource. Replaced it with the documented Velero server `--fs-backup-timeout` argument.
- The troubleshooting timeout example used the unsupported `VELERO_RESTIC_TIMEOUT` environment variable. Replaced it with the documented `--fs-backup-timeout` argument.
- The hybrid backup example implied automatic fallback to file-level backup for unsupported snapshots. Updated the comment to clarify that file-level backup still requires annotations or `defaultVolumesToFsBackup=true`.
- The repository health section used old Restic-specific commands and resources (`velero restic repo get`, `resticrepositories`). Replaced them with `velero repo get` and `backuprepositories`.
- The security section claimed Restic AES-256 behavior directly. Updated it to describe Velero File System Backup repository credentials through `velero-repo-credentials`.
- The maintenance section proposed a CronJob that only listed backups and backup locations, not repository maintenance. Replaced it with Velero's documented automatic repository maintenance and `--default-repo-maintain-frequency`.

## Review Notes
The corrected article is no longer specifically a Restic integration guide because Restic is deprecated and disabled for new backups in current Velero releases. The post directory slug still contains `restic`, but the technical content now reflects current Velero File System Backup behavior.
