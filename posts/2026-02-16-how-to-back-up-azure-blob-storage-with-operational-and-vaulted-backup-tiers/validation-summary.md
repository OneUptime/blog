# Validation Summary: How to Back Up Azure Blob Storage with Operational and Vaulted Backup Tiers

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Azure Blob Storage
- Azure Backup for Azure Blobs
- Operational backup
- Vaulted backup
- Azure Backup vaults
- Azure CLI `az dataprotection`
- Azure RBAC
- Blob point-in-time restore, versioning, soft delete, change feed, and object replication

## Sources Consulted
- Microsoft Learn: Overview of Azure Blob backup - https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview
- Microsoft Learn: Support matrix for Azure Blobs backup - https://learn.microsoft.com/en-us/azure/backup/blob-backup-support-matrix
- Microsoft Learn: Back up Azure Blobs in a storage account using Azure CLI - https://learn.microsoft.com/en-us/azure/backup/backup-blobs-storage-account-cli
- Microsoft Learn: Quickstart - Configure vaulted backup for Azure Blobs using Azure CLI - https://learn.microsoft.com/en-us/azure/backup/quick-blob-vaulted-backup-cli
- Microsoft Learn: Restore Azure Blobs via Azure CLI - https://learn.microsoft.com/en-us/azure/backup/restore-blobs-storage-account-cli
- Microsoft Learn Azure CLI reference: `az dataprotection backup-vault` - https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-vault
- Microsoft Learn Azure CLI reference: `az dataprotection backup-policy` - https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-policy
- Microsoft Learn Azure CLI reference: `az dataprotection backup-instance` and `backup-instance restore` - https://learn.microsoft.com/en-us/cli/azure/dataprotection/backup-instance

## Issues Found
- The post described operational backup as using same-account snapshots. Updated this to describe the documented blob data protection capabilities: point-in-time restore, versioning, soft delete, change feed, and delete lock.
- The post referred to vaulted blob backup as copying data to a Recovery Services vault. Corrected this to Backup vault, which is the supported resource type for Azure Blob backup.
- The prerequisites allowed General Purpose v2 or BlobStorage accounts. Corrected this to standard General Purpose v2 accounts, matching the Azure Blobs backup support matrix.
- The operational backup scope and restore text said "all blobs." Corrected this to block blobs, because Azure Blob backup restores block blobs and does not restore page blobs, append blobs, or premium blobs.
- The backup instance creation example used a hand-written request body that did not match the documented Azure CLI workflow. Replaced it with `az dataprotection backup-instance initialize` followed by `az dataprotection backup-instance create`.
- The restore command used `--restore-request` with an inline request body. Corrected it to the documented `initialize-for-data-recovery` step and `restore trigger --restore-request-object restore.json`.
- The vaulted policy schedule omitted `timeZone` and did not explain that Azure Backup ignores any repeat count in the ISO 8601 `R` prefix. Added the `timeZone` field and a short note.
- The vaulted container configuration section assigned `Storage Blob Data Reader`, which is not the documented primary role assignment flow for Blob backup. Replaced it with `az dataprotection backup-instance initialize-backupconfig` and clarified that the Backup vault still needs Storage Account Backup Contributor.
- The cost guidance suggested tiering old versions to archive storage. Adjusted this because archive-tier block blobs are not supported for restore and lifecycle policies must not conflict with backup retention.
- Cross-region wording was tightened to specify geo-redundant vault storage with cross-region restore enabled.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI commands were validated against current Microsoft Learn Azure CLI reference pages rather than local `az --help` output.
