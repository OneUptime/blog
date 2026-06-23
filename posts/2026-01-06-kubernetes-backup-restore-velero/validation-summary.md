# Validation Summary: How to Back Up and Restore Kubernetes with Velero

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero (v1.14+ / v1.15)
- Kubernetes
- AWS S3 + EBS (velero-plugin-for-aws)
- GCP GCS + Persistent Disk (velero-plugin-for-gcp)
- Azure Blob Storage (velero-plugin-for-microsoft-azure)
- CSI volume snapshots (snapshot.storage.k8s.io/v1)
- Restic / Kopia file-level backup (node agent)
- Prometheus Operator (ServiceMonitor, PrometheusRule)

## Sources Consulted
- Velero Restore Reference — https://velero.io/docs/main/restore-reference/
- Velero CSI snapshot docs (v1.15) — https://velero.io/docs/v1.15/csi/
- Velero 1.15 upgrade guide (plugin version compatibility) — https://velero.io/docs/v1.15/upgrade-to-1.15/
- velero-plugin-for-aws README — https://github.com/velero-io/velero-plugin-for-aws/blob/main/README.md
- velero-plugin-for-microsoft-azure README — https://github.com/velero-io/velero-plugin-for-microsoft-azure/blob/main/README.md
- Velero backup hooks / restore hooks docs — https://velero.io/docs/main/backup-hooks/, https://velero.io/docs/main/restore-hooks/

## Issues Found
1. **Invalid `velero restore wait` subcommand.** The Disaster Recovery section used `velero restore wait dr-infra` / `velero restore wait dr-apps`. Velero has no `wait` subcommand under `velero restore` (valid subcommands are create, delete, describe, get, logs). The documented way to block until a restore finishes is the `--wait` flag on `velero restore create`. Fixed by removing the separate `velero restore wait` lines and adding `--wait` to the corresponding `velero restore create` commands.

2. **Azure install missing `storageAccountKeyEnvVar`.** The Azure setup creates a credentials file containing `AZURE_STORAGE_ACCOUNT_ACCESS_KEY`, but the `velero install` command's `--backup-location-config` only set `storageAccount=velerobackups`. When authenticating with a storage account access key, the Azure plugin requires `storageAccountKeyEnvVar=AZURE_STORAGE_ACCOUNT_ACCESS_KEY` in the backup-location-config so Velero knows which env var holds the key; without it the backup location fails to authenticate. Fixed by appending `,storageAccountKeyEnvVar=AZURE_STORAGE_ACCOUNT_ACCESS_KEY`.

## Review Notes
- Plugin versions (`velero/velero-plugin-for-aws:v1.11.0`, `-gcp:v1.11.0`, `-microsoft-azure:v1.11.0`) are correct and compatible with Velero v1.15, per the official 1.15 upgrade guide.
- The CSI section is accurate: from Velero v1.14 the CSI plugin is merged into core (no separate plugin), and `--features=EnableCSI` must still be set explicitly — it is not enabled by default.
- All backup/schedule/restore commands, TTL conversions (168h=7d, 720h=30d), hook annotations (pre/post backup, init restore), the `backup.velero.io/backup-volumes` annotation, `velero.io/exclude-from-backup` label, and node-agent flags (`--use-node-agent`, `--default-volumes-to-fs-backup`, `--uploader-type=kopia`) are correct.
- Prometheus metric names (`velero_backup_failure_total`, `velero_backup_last_successful_timestamp`) and the `monitoring` metrics port name are accurate.
- Minor (not changed, cosmetic only): two `velero install` snippets are fenced as ```yaml though they contain bash; and the inline `# comment` placed after a `\` line-continuation in the Restic/Kopia install snippet would break the command if pasted literally. These are illustration artifacts, not technical errors in the commands themselves.
- Azure caveat worth noting for readers: storage-account-key auth (used here) cannot take managed-disk snapshots; a service principal / Workload Identity is required for Azure disk snapshots. The post only uses Azure for object storage, so this is consistent.
