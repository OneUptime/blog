# Validation Summary: Configure Velero Backup Encryption at Rest Using AWS KMS or Azure Key Vault

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Velero
- Kubernetes
- AWS S3
- AWS KMS
- AWS CloudTrail
- Azure Blob Storage
- Azure Key Vault
- Azure Monitor / Log Analytics
- Google Cloud Storage with Cloud KMS
- Restic / Velero File System Backup

## Sources Consulted
- Velero File System Backup documentation: https://velero.io/docs/v1.16/file-system-backup/
- Velero AWS plugin BackupStorageLocation documentation: https://github.com/velero-io/velero-plugin-for-aws/blob/main/backupstoragelocation.md
- Velero Azure plugin documentation: https://github.com/velero-io/velero-plugin-for-microsoft-azure
- Velero GCP plugin BackupStorageLocation documentation: https://raw.githubusercontent.com/velero-io/velero-plugin-for-gcp/main/backupstoragelocation.md
- AWS S3 SSE-KMS documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-kms-encryption.html
- AWS KMS automatic key rotation documentation: https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable.html
- AWS KMS CloudTrail logging documentation: https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
- AWS CLI put-bucket-versioning documentation: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- Azure Storage customer-managed keys documentation: https://learn.microsoft.com/en-us/azure/storage/common/customer-managed-keys-configure-existing-account
- Azure Storage customer-managed keys role assignment example: https://learn.microsoft.com/en-us/azure/storage/files/customer-managed-keys
- Azure Key Vault logging documentation: https://learn.microsoft.com/en-us/azure/key-vault/general/logging
- Azure CLI Log Analytics query documentation: https://learn.microsoft.com/en-us/cli/azure/monitor/log-analytics

## Issues Found
- The AWS KMS key policy included an `Allow CloudWatch Logs` statement and the monitoring section described enabling KMS logging with `aws kms put-key-policy`. AWS KMS API activity is audited through CloudTrail, not enabled by a CloudWatch Logs service principal in the KMS key policy. Removed the unnecessary policy statement and changed the logging example to create and start a CloudTrail trail.
- The Azure storage account customer-managed key setup granted Key Vault permissions to the Velero service principal. Azure Storage uses the storage account's managed identity to access the Key Vault key. Updated the storage account creation to assign an identity, grant that identity the `Key Vault Crypto Service Encryption User` role on the vault, and set `--encryption-key-version ""` for automatic key version updates.
- The Restic repository secret example used `restic-repo-credentials`, but current Velero file-system backup documentation uses `velero-repo-credentials` with the `repository-password` key. Updated the command and added the caveat that the password must be set before the first repository is created.
- The AWS KMS manual rotation comment incorrectly described creating a new KMS key as creating a new key version. Updated the example to use `aws kms rotate-key-on-demand` for key material rotation and kept alias movement as the separate replacement-key approach.
- The Azure Key Vault audit query used the Azure activity log, which is not the correct place to query Key Vault `AuditEvent` diagnostic logs sent to Log Analytics. Replaced it with `az monitor log-analytics query`.
- The compliance example used `enableBucketVersioning` as if it were a Velero AWS BackupStorageLocation config key. Removed that invalid field and added the correct `aws s3api put-bucket-versioning` command.
- The compliance comment claimed the Velero config used "FIPS-validated encryption." Reworded it to accurately describe AWS KMS server-side encryption without implying FIPS endpoint configuration.

## Review Notes
- The Velero plugin versions in the article are pinned to v1.9.0. The commands are still representative, but newer plugin versions exist and the current Azure plugin documentation recommends AAD-based storage access for many installations.
- Current Velero releases deprecate the Restic path in favor of Kopia for new file-system backup installations, so future updates should consider rewriting that section around Kopia.
