# Validation Summary: How to Configure Velero Backup Storage Locations with Multiple Cloud Providers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Velero
- Kubernetes custom resources
- AWS S3
- Azure Blob Storage
- Google Cloud Storage
- Prometheus alerting

## Sources Consulted
- Velero Backup Storage Locations and Volume Snapshot Locations: https://velero.io/docs/v1.18/locations/
- Velero BackupStorageLocation API type: https://velero.io/docs/v1.18/api-types/backupstoragelocation/
- Velero Schedule API type: https://velero.io/docs/v1.17/api-types/schedule/
- Velero AWS plugin BackupStorageLocation configuration: https://raw.githubusercontent.com/velero-io/velero-plugin-for-aws/main/backupstoragelocation.md
- Velero Azure plugin BackupStorageLocation configuration: https://raw.githubusercontent.com/velero-io/velero-plugin-for-microsoft-azure/main/backupstoragelocation.md
- Velero GCP plugin BackupStorageLocation configuration: https://raw.githubusercontent.com/velero-io/velero-plugin-for-gcp/main/backupstoragelocation.md
- Velero metrics source: https://raw.githubusercontent.com/velero-io/velero/main/pkg/metrics/metrics.go
- Velero provider plugin releases: https://api.github.com/repos/velero-io/velero-plugin-for-aws/releases/latest, https://api.github.com/repos/velero-io/velero-plugin-for-microsoft-azure/releases/latest, https://api.github.com/repos/velero-io/velero-plugin-for-gcp/releases/latest
- AWS CLI put-bucket-replication reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS CLI put-bucket-lifecycle-configuration reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Azure CLI storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account?view=azure-cli-latest
- Google Cloud gsutil IAM permissions for defstorageclass: https://docs.cloud.google.com/storage/docs/access-control/iam-gsutil

## Issues Found
- Velero does not natively replicate a single backup to multiple BackupStorageLocations. Updated the architecture explanation to say that redundant copies require separate backups/schedules or provider-side replication.
- The provider plugin versions were outdated. Updated AWS, Azure, and GCP plugin examples from v1.9.0 to v1.14.1, the latest release available on June 3, 2026.
- The direct BackupStorageLocation YAML examples used short provider names for plugin-backed CRs. Updated them to the plugin provider names shown in current plugin configuration docs.
- The Azure BackupStorageLocation example omitted the recommended `useAAD: "true"` setting for current Azure plugin authentication. Added it to the config.
- The GCP BackupStorageLocation example combined service-account-key credentials with `config.serviceAccount`, which is intended for workload identity style authentication. Removed the unnecessary `serviceAccount` config from the key-file example.
- Schedule templates placed backup labels directly under `template.labels`. Updated them to `template.metadata.labels`, matching the current Velero BackupSpec schema.
- The replication section implied Velero-level replication and omitted S3 versioning. Clarified that replication is provider-side and added versioning commands for the S3 source and destination buckets.
- The Prometheus alert used a non-existent Velero metric name and label. Updated it to `velero_backup_location_status_gauge` with the `backup_location_name` label.
- The storage-class examples used invalid BackupStorageLocation config keys (`s3StorageClass`, `storageAccountAccessTier`, and `storageClass`). Replaced them with provider-native bucket or storage-account commands for S3 lifecycle transitions, Azure access tier, and GCS default storage class.

## Review Notes
The post is technically valid after the corrections. Future improvements could add prerequisite IAM/RBAC examples for each cloud provider and bucket/container creation steps, but those omissions do not make the corrected examples invalid.
