# Validation Summary: How to Backup and Restore Kubernetes Clusters with Velero

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes
- Kubernetes persistent volumes
- CSI snapshots
- Velero File System Backup
- Kopia
- S3-compatible object storage
- MinIO
- AWS Velero plugin

## Sources Consulted
- Velero v1.18 install CLI documentation: https://velero.io/docs/v1.18/velero-install/
- Velero v1.18 upgrade documentation, including v1.18.0 and AWS plugin v1.14.0 image references: https://velero.io/docs/main/upgrade-to-1.18/
- Velero v1.18 File System Backup documentation: https://velero.io/docs/v1.18/file-system-backup/
- Velero v1.18 resource filtering documentation: https://velero.io/docs/v1.18/resource-filtering/
- Velero v1.18 restore reference: https://velero.io/docs/v1.18/restore-reference/
- Velero v1.18 BackupStorageLocation API documentation: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero MinIO evaluation install documentation: https://velero.io/docs/v1.13/contributions/minio/
- Velero v1.18 Go API reference for BackupStorageLocationSpec and annotations: https://pkg.go.dev/github.com/vmware-tanzu/velero@v1.18.0/pkg/apis/velero/v1

## Issues Found
- The install commands used Velero v1.13.0 and AWS plugin v1.9.0, while current Velero documentation references v1.18.0 and AWS plugin v1.14.0. Updated the CLI download and plugin image versions.
- The MinIO setup included `--snapshot-location-config region=us-east-1`, which creates/configures a volume snapshot location even though the example is using MinIO as S3-compatible object storage with file-system backup. Replaced it with `--use-volume-snapshots=false`, matching Velero's MinIO and File System Backup guidance for storage without a snapshot provider.
- The architecture and lifecycle diagrams implied that CSI snapshots, Restic, and Kopia are all volume snapshot plugin outputs stored directly in the backup archive. Updated the diagrams to separate CSI/native snapshots from node-agent File System Backup and Kopia object-storage data.
- The persistent volume backup diagram listed "Kopia/Restic" for File System Backup. Updated it to "Kopia" because Restic is in Velero's deprecation path and current releases disable new Restic-path backups.
- The introductory claim said Velero works with any Kubernetes distribution. Narrowed this to "many Kubernetes distributions" to avoid overclaiming beyond Velero's documented compatibility requirements.

## Review Notes
- The remaining Velero CLI flags for backup creation, scheduling, restore filtering, namespace mapping, existing resource policy, backup logs, restore logs, and backup storage location listing are consistent with the official Velero documentation.
- The BackupStorageLocation YAML fields, including `spec.default`, `objectStorage.bucket`, `objectStorage.prefix`, `config`, and `credential`, match the Velero v1.18 API shape.
