# Validation Summary: How to Enable Soft Delete and Security Features for Azure Backup Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Backup
- Recovery Services vaults
- Enhanced soft delete
- Immutable vaults
- Multi-user authorization (MUA)
- Azure Resource Guard
- Azure Key Vault customer-managed keys
- Azure CLI
- Azure PowerShell
- Azure Monitor diagnostic settings and action groups

## Sources Consulted
- Azure CLI reference for Recovery Services vault backup properties: https://learn.microsoft.com/en-us/cli/azure/backup/vault/backup-properties
- Azure CLI reference for Recovery Services vault update and immutability settings: https://learn.microsoft.com/en-us/cli/azure/backup/vault
- Azure Backup enhanced soft delete overview: https://learn.microsoft.com/en-us/azure/backup/backup-azure-enhanced-soft-delete-about
- Azure Backup soft delete configuration and recovery: https://learn.microsoft.com/en-us/azure/backup/backup-azure-enhanced-soft-delete-configure-manage
- Azure Backup immutable vault concept: https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-concept
- Azure Backup immutable vault management: https://learn.microsoft.com/en-us/azure/backup/backup-azure-immutable-vault-how-to-manage
- Azure Backup multi-user authorization concept: https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization-concept
- Azure Backup MUA configuration guide: https://learn.microsoft.com/en-us/azure/backup/multi-user-authorization
- Azure CLI reference for Resource Guard: https://learn.microsoft.com/en-us/cli/azure/dataprotection/resource-guard
- Azure CLI reference for Recovery Services vault encryption: https://learn.microsoft.com/en-us/cli/azure/backup/vault/encryption
- Azure Backup customer-managed key encryption: https://learn.microsoft.com/en-us/azure/backup/encryption-at-rest-with-cmk
- Azure PowerShell reference for Undo-AzRecoveryServicesBackupItemDeletion: https://learn.microsoft.com/en-us/powershell/module/az.recoveryservices/undo-azrecoveryservicesbackupitemdeletion
- Azure Monitor action group CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/action-group
- Azure Monitor diagnostic settings CLI reference: https://learn.microsoft.com/en-us/cli/azure/monitor/diagnostic-settings

## Issues Found
- Corrected enhanced soft delete CLI value from `AlwaysON` to the documented `AlwaysOn`.
- Removed the claim that `AlwaysOn` prevents reducing the retention period, because official documentation only states that always-on soft delete cannot be disabled.
- Corrected the soft delete cost statement: the default 14-day vaulted backup retention has no extra charge, but retention beyond 14 days incurs regular backup charges.
- Clarified that a soft-deleted item must be undeleted before restoring from recovery points.
- Corrected immutable vault CLI commands from `az backup vault backup-properties set` to `az backup vault update`.
- Corrected Resource Guard creation from the nonexistent `az backup resource-guard create` command to `az dataprotection resource-guard create`.
- Corrected MUA vault association from `az backup vault backup-properties set --resource-guard-operation-requests` to `az backup vault resource-guard-mapping update --resource-guard-id`.
- Clarified Resource Guard placement requirements: it should be owned by a different administrator, is recommended to be isolated in another subscription or tenant, and must be in the same region as the vault.
- Reworded the MUA approval description to describe JIT permissions such as the Backup MUA Operator role rather than a JIT access token.
- Added the required `--mi-system-assigned` flag to the CMK encryption update command.
- Added CMK prerequisites that the vault must be configured before protecting items and that Key Vault soft delete and purge protection must be enabled.

## Review Notes
Azure CLI was not installed in the local environment, so CLI syntax was verified against current Microsoft Learn CLI reference pages rather than local `az --help` output.
