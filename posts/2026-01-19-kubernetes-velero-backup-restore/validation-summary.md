# Validation Summary: How to Back Up and Restore Kubernetes Clusters with Velero

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Velero
- Velero AWS plugin
- CSI VolumeSnapshots
- Velero File System Backup
- Kopia and Restic
- MinIO and S3-compatible object storage
- Prometheus metrics and ServiceMonitor
- Kubernetes YAML manifests

## Sources Consulted
- Velero v1.18 Basic Install: https://velero.io/docs/v1.18/basic-install/
- Velero v1.18 CSI Support: https://velero.io/docs/v1.18/csi/
- Velero v1.18 File System Backup: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 Backup API Type: https://velero.io/docs/v1.18/api-types/backup/
- Velero v1.18 Schedule API Type: https://velero.io/docs/v1.18/api-types/schedule/
- Velero v1.13 Restore API Type: https://velero.io/docs/v1.13/api-types/restore/
- Velero v1.13 Backup Hooks: https://velero.io/docs/v1.13/backup-hooks/
- Velero v1.18.0 GitHub release: https://github.com/vmware-tanzu/velero/releases/tag/v1.18.0
- Velero AWS plugin v1.14.0 GitHub release: https://github.com/vmware-tanzu/velero-plugin-for-aws/releases/tag/v1.14.0
- Velero v1.13.0 metrics source: https://raw.githubusercontent.com/vmware-tanzu/velero/v1.13.0/pkg/metrics/metrics.go

## Issues Found
- The post pinned Velero v1.13.0 and AWS plugin v1.9.0. Updated examples to Velero v1.18.0 and AWS plugin v1.14.0 to match current releases.
- The CSI install example used `velero/velero-plugin-for-csi:v0.7.0`. Current Velero includes CSI support from v1.14 onward, so the example now enables `EnableCSI` without installing the separate CSI plugin.
- File system backup examples required the node-agent, but the install commands did not enable it. Added `--use-node-agent` to the relevant install commands.
- The MinIO deployment referenced `minio-pvc` without defining it and assumed the `velero` namespace already existed. Added the namespace and PVC to make the manifest complete.
- The volume snapshot Backup example set both `snapshotVolumes: true` and `defaultVolumesToFsBackup: true`. Current Velero treats filesystem backup and snapshots as mutually exclusive per volume, so this was changed to `defaultVolumesToFsBackup: false`.
- The architecture and prerequisites described GCS and Azure Blob as S3-compatible storage. Updated wording to "object storage" and listed S3-compatible storage separately where appropriate.
- The full-cluster backup comment incorrectly said cluster-scoped resources such as persistent volumes are excluded. Updated the comment to reflect Velero's default inclusion of cluster-scoped resources when all namespaces are included.
- The file system backup section listed Restic before Kopia without noting Restic's deprecation. Updated the wording to identify Kopia as the default uploader and Restic as deprecated.
- The metrics list included `velero_backup_storage_location_last_reconciliation_status`, which was not present in the Velero v1.13 metrics source used by the original examples. Replaced it with `velero_backup_last_status`.

## Review Notes
The commands and manifests were checked against official Velero documentation and release information, but they were not executed against a live Kubernetes cluster because no cluster credentials or Velero CLI were available in the local environment.
