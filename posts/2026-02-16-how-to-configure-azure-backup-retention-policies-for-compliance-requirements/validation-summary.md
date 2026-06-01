# Validation Summary: How to Configure Azure Backup Retention Policies for Compliance Requirements

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Backup
- Azure Recovery Services vaults
- Azure Backup policies and retention rules
- Azure CLI
- Azure SQL Database Long-Term Retention
- Azure Files backup
- Azure Blob backup
- Azure Backup immutable vaults
- Azure Backup multi-user authorization with Resource Guard

## Sources Consulted
- Microsoft Learn: Azure Backup architecture overview - https://learn.microsoft.com/en-us/azure/backup/backup-architecture
- Microsoft Learn: Azure VM backup FAQ - https://learn.microsoft.com/en-us/azure/backup/backup-azure-vm-backup-faq
- Microsoft Learn: Azure Files backup overview - https://learn.microsoft.com/en-us/azure/backup/azure-file-share-backup-overview
- Microsoft Learn: Azure Files backup support matrix - https://learn.microsoft.com/en-us/azure/backup/azure-file-share-support-matrix
- Microsoft Learn: Azure Blob backup overview - https://learn.microsoft.com/en-us/azure/backup/blob-backup-overview
- Microsoft Learn: Azure SQL Database long-term retention overview - https://learn.microsoft.com/en-us/azure/azure-sql/database/long-term-retention-overview
- Microsoft Learn: Azure CLI az backup vault reference - https://learn.microsoft.com/en-us/cli/azure/backup/vault
- Microsoft Learn: Azure CLI az backup vault backup-properties reference - https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties
- Microsoft Learn: Azure CLI az sql db ltr-policy reference - https://learn.microsoft.com/en-us/cli/azure/sql/db/ltr-policy
- Microsoft Learn: Immutable vault for Azure Backup - https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept
- Microsoft Learn: Multiuser authorization using Resource Guard - https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization-concept
- Microsoft Learn: Configure multi-user authorization using Resource Guard - https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization
- Microsoft Learn: Azure CLI az dataprotection resource-guard reference - https://learn.microsoft.com/en-us/cli/azure/dataprotection/resource-guard

## Issues Found
- The retention tier descriptions said weekly and monthly retention usually keep the first backup of the week or month. Azure Backup retention rules are based on the configured day, day of month, or week of month, so the wording was corrected.
- The Azure Files section implied daily and yearly retention were primary and weekly/monthly retention had unspecified limitations. Azure Files supports daily, weekly, monthly, and yearly retention, with different maximums for snapshot and Vault-standard tiers, so the section was corrected.
- The Azure Blob section said vaulted backup supports the full retention tier structure. Vaulted blob backup supports daily, weekly, monthly, and yearly retention rules, but with a maximum retention of 10 years, so the statement was made precise.
- The immutable vault section said immutable vaults prevent disabling soft-delete. Official immutable vault restrictions focus on blocking operations that delete recovery points before expiry or reduce retention; the bullet was changed to policy replacement with lower retention.
- The MUA section described a second user approving critical operations. Resource Guard works as a separate authorization mechanism for critical operations, so the wording was corrected to avoid implying a built-in approval workflow.
- The cost section said a 7-year yearly retention policy for a 1 TB database means storing at least 7 copies. That is too broad because storage consumption depends on workload type, backup tier, and churn, so the example was generalized.

## Review Notes
The Azure CLI commands shown use current command groups and parameters according to Microsoft Learn. The Resource Guard command is part of the Azure CLI dataprotection extension, which is automatically installed by recent Azure CLI versions when the command is first run.
