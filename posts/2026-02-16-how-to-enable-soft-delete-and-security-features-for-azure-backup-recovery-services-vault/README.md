# How to Enable Soft Delete and Security Features for Azure Backup Recovery Services Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Backup, Soft Delete, Security, Recovery Services Vault, Ransomware Protection, MUA, Immutable Vault

Description: Learn how to enable soft delete, immutable vaults, multi-user authorization, and other security features for Azure Backup Recovery Services vaults to protect against ransomware and accidental deletion.

---

Backup data is a prime target for attackers. If ransomware encrypts your production data and also manages to delete your backups, you are in serious trouble. Azure Backup includes several security features specifically designed to protect backup data from both accidental deletion and malicious attacks. Soft delete, immutable vaults, and multi-user authorization create layers of defense that make it extremely difficult for anyone - including a compromised admin account - to permanently destroy your backups.

This guide covers how to enable and configure each of these security features.

## The Threat Model

Understanding why these features exist helps you configure them appropriately:

**Accidental deletion** - An admin mistakenly stops protection on a VM and deletes backup data. Without soft delete, that data is gone permanently.

**Compromised admin credentials** - An attacker gains access to an Azure account with Contributor permissions. They could stop backups and delete all recovery points, leaving you with encrypted production data and no backups.

**Insider threat** - A disgruntled employee with vault access intentionally destroys backup data.

**Ransomware** - Sophisticated ransomware variants now specifically target backup systems before encrypting production data.

Azure Backup's security features address each of these scenarios.

## Feature Overview

| Feature | What It Does | Default State |
|---------|-------------|---------------|
| Soft delete | Retains deleted backup data for 14 additional days | Enabled |
| Enhanced soft delete | Extends retention to 14-180 days, prevents disabling | Configurable |
| Immutable vault | Prevents any operation that could remove recovery points | Disabled |
| Multi-user authorization (MUA) | Requires two-person approval for critical operations | Disabled |
| Encryption | Customer-managed keys for backup encryption | Platform-managed by default |

## Step 1: Enable and Configure Soft Delete

Soft delete is enabled by default on all new Recovery Services vaults. When backup data is deleted (either by stopping protection with delete data or by explicitly deleting recovery points), the data enters a "soft deleted" state instead of being permanently removed.

During the soft delete retention period:
- The data is not accessible for restore
- No storage charges are incurred for soft-deleted data
- The data can be undeleted (restored to active state)
- After the retention period, data is permanently deleted

### Check Current Soft Delete Settings

```bash
# Check soft delete status on a vault
az backup vault backup-properties show \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --query "softDeleteFeatureState"
```

### Enable Enhanced Soft Delete

Enhanced soft delete extends the default 14-day retention and adds the "always-on" option to prevent anyone from disabling it:

```bash
# Enable enhanced soft delete with 30-day retention
# Once set to AlwaysON, it cannot be disabled
az backup vault backup-properties set \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --soft-delete-feature-state AlwaysON \
    --soft-delete-duration 30
```

The `AlwaysON` state is irreversible. Once enabled, no one (including subscription owners) can disable soft delete or reduce the retention period. Use this for production vaults where backup data integrity is critical.

### Recover Soft-Deleted Backup Data

If backup data was accidentally deleted, undelete it before the retention period expires:

```powershell
# Find soft-deleted backup items
$vault = Get-AzRecoveryServicesVault -Name "rsv-backup-eastus2-001" -ResourceGroupName "rg-backup-eastus2"
Set-AzRecoveryServicesVaultContext -Vault $vault

# List soft-deleted items
$softDeletedItems = Get-AzRecoveryServicesBackupItem `
    -BackupManagementType AzureVM `
    -WorkloadType AzureVM `
    -VaultId $vault.Id |
    Where-Object { $_.DeleteState -eq "ToBeDeleted" }

# Undelete each item
foreach ($item in $softDeletedItems) {
    Write-Output "Undeleting: $($item.Name)"
    Undo-AzRecoveryServicesBackupItemDeletion `
        -Item $item `
        -VaultId $vault.Id `
        -Force
}

Write-Output "Soft-deleted items restored"
```

## Step 2: Configure Immutable Vaults

Immutable vaults take protection further than soft delete. They prevent any operation that could result in the loss of recovery points before their intended expiry.

With an immutable vault:
- Backup policies cannot be modified to reduce retention
- Protection cannot be stopped with "delete data"
- Recovery points cannot be manually deleted before expiry
- The vault itself cannot be deleted if it contains protected items

### Enable Immutability

```bash
# Enable immutability on the vault in a locked state
# WARNING: Once locked, immutability cannot be disabled

# First, enable in unlocked state (can be reverted)
az backup vault backup-properties set \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --immutability-state Unlocked

# After testing, lock it permanently
# THIS IS IRREVERSIBLE - test thoroughly before locking
az backup vault backup-properties set \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --immutability-state Locked
```

Start with the "Unlocked" state to test and verify your configuration. Once you are confident, move to "Locked." The locked state is permanent and cannot be reverted.

### Immutability Considerations

Before enabling immutability, ensure:

- Your backup policies have the correct retention periods (you cannot reduce them later)
- You do not need to stop protection with delete data for any reason
- Your team understands the operational implications

Immutability does not prevent:
- Adding new backup items
- Taking new backups
- Restoring from recovery points
- Increasing retention periods (making policies more protective is allowed)

## Step 3: Set Up Multi-User Authorization (MUA)

MUA adds a second approval step for critical backup operations. Even if an attacker compromises one admin account, they cannot destroy backups without approval from a second person.

MUA uses Azure Resource Guard, a separate resource that must be in a different subscription or under a different administrator.

### Create the Resource Guard

```bash
# Create a Resource Guard in a separate subscription or resource group
# The Resource Guard owner should be different from the vault admin
az backup resource-guard create \
    --resource-group rg-security-governance \
    --name rg-backup-guard-001 \
    --location eastus2
```

### Associate the Resource Guard with the Vault

```bash
# Associate the Resource Guard with the Recovery Services vault
# After this, critical operations require approval from the Resource Guard owner

az backup vault backup-properties set \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --resource-guard-operation-requests "/subscriptions/<security-sub-id>/resourceGroups/rg-security-governance/providers/Microsoft.DataProtection/resourceGuards/rg-backup-guard-001"
```

### Protected Operations

With MUA enabled, the following operations require Resource Guard approval:

- Disabling soft delete
- Disabling MUA protection
- Reducing retention in backup policies
- Changing immutability from Unlocked to Disabled
- Stopping protection with delete data

When someone attempts one of these operations, they must request a Just-In-Time (JIT) access token from the Resource Guard owner. The owner reviews the request and either approves or denies it.

## Step 4: Configure Encryption with Customer-Managed Keys

By default, Azure Backup encrypts data using platform-managed keys. For additional control, use customer-managed keys (CMK) stored in Azure Key Vault:

```bash
# Enable customer-managed key encryption on the vault
# The key must be stored in an Azure Key Vault

# First, enable a managed identity on the vault
az backup vault identity assign \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --system-assigned

# Grant the vault's managed identity access to the Key Vault
az keyvault set-policy \
    --name kv-backup-keys \
    --object-id "<vault-managed-identity-object-id>" \
    --key-permissions get wrapKey unwrapKey

# Configure the vault to use the customer-managed key
az backup vault encryption update \
    --resource-group rg-backup-eastus2 \
    --name rsv-backup-eastus2-001 \
    --encryption-key-id "https://kv-backup-keys.vault.azure.net/keys/backup-encryption-key/version" \
    --infrastructure-encryption Enabled
```

CMK encryption gives you full control over the encryption keys. You can rotate keys on your schedule and revoke access if needed. However, if you lose access to the Key Vault or the key, you cannot restore backup data, so protect the key vault with extreme care.

## Step 5: Enable Monitoring and Alerts

Security features are only effective if you know when they are triggered. Configure alerts for:

- Soft delete events (someone deleted backup data)
- MUA access requests (someone is trying to perform a critical operation)
- Backup policy modifications
- Vault property changes

```bash
# Create an action group for security alerts
az monitor action-group create \
    --resource-group rg-backup-eastus2 \
    --name ag-backup-security \
    --short-name BkpSec \
    --action email security-team security@company.com

# Enable diagnostic logging for the vault
az monitor diagnostic-settings create \
    --resource "/subscriptions/<sub-id>/resourceGroups/rg-backup-eastus2/providers/Microsoft.RecoveryServices/vaults/rsv-backup-eastus2-001" \
    --name "backup-security-logs" \
    --workspace "/subscriptions/<sub-id>/resourceGroups/rg-monitoring/providers/Microsoft.OperationalInsights/workspaces/la-central" \
    --logs '[{"category": "CoreAzureBackup", "enabled": true}, {"category": "AddonAzureBackupJobs", "enabled": true}, {"category": "AddonAzureBackupPolicy", "enabled": true}]'
```

## Recommended Security Configuration by Environment

### Production / Compliance Vaults
- Soft delete: AlwaysON with 30+ day retention
- Immutability: Locked
- MUA: Enabled with Resource Guard in separate subscription
- Encryption: Customer-managed keys
- Monitoring: Full diagnostic logging

### Standard Business Vaults
- Soft delete: AlwaysON with 14-day retention
- Immutability: Unlocked (ready to lock if needed)
- MUA: Enabled
- Encryption: Platform-managed (sufficient for most scenarios)
- Monitoring: Alert-based

### Development / Test Vaults
- Soft delete: Enabled (default)
- Immutability: Disabled (flexibility needed for dev/test)
- MUA: Not needed
- Encryption: Platform-managed
- Monitoring: Basic alerts

## Wrapping Up

Azure Backup security is not a single feature but a set of layered defenses. Soft delete catches accidental deletions, immutable vaults prevent policy tampering, and multi-user authorization stops single-point-of-compromise attacks. Enable all three for your production backup vaults, and configure monitoring so you know when any security-relevant event occurs. The few minutes it takes to configure these features is negligible compared to the cost of losing your backup data during a real incident.
