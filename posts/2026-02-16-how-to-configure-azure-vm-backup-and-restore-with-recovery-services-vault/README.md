# How to Configure Azure VM Backup and Restore with Recovery Services Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Virtual Machine, Backup, Recovery Services Vault, Disaster Recovery, Azure CLI, Data Protection

Description: How to set up Azure VM backup using Recovery Services Vault, configure backup policies, and restore VMs from backup snapshots.

---

Backups are one of those things that feel unnecessary until you need them. A misconfigured script that wipes data, a ransomware attack, or a botched deployment can all lead to data loss. Azure Backup with Recovery Services Vault provides application-consistent backups of your VMs with configurable retention, point-in-time recovery, and cross-region restore capabilities.

In this guide, I will walk through setting up backups from scratch, configuring retention policies, and restoring a VM when disaster strikes.

## How Azure VM Backup Works

Azure Backup uses a snapshot-based approach. When a backup runs:

1. Azure installs or invokes a backup extension on the VM.
2. On Windows, the extension coordinates with VSS (Volume Shadow Copy Service) for application-consistent snapshots. On Linux, it takes filesystem-consistent snapshots (or application-consistent if you configure pre/post scripts).
3. A snapshot of all disks is taken.
4. The snapshot data is transferred to the Recovery Services vault for long-term storage.
5. Local snapshots are retained for a configurable period (1-5 days) for faster restores.

The entire process is incremental after the first full backup, meaning only changed blocks are transferred.

## Creating a Recovery Services Vault

The vault is where your backup data is stored:

```bash
# Create a Recovery Services vault
az backup vault create \
  --resource-group myResourceGroup \
  --name myRecoveryVault \
  --location eastus
```

Choose the vault location carefully. Ideally, it should be in the same region as the VMs being backed up to minimize data transfer costs and speed up backups.

## Enabling Backup on a VM

Enable backup with the default policy:

```bash
# Enable backup on a VM using the default policy
az backup protection enable-for-vm \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --vm myVM \
  --policy-name DefaultPolicy
```

The DefaultPolicy backs up daily at a set time and retains:
- Daily backups for 30 days
- Weekly backups for 12 weeks
- Monthly backups for 12 months
- Yearly backups for 10 years (optional)

## Creating a Custom Backup Policy

For most production workloads, you will want a custom policy:

```bash
# Create a custom backup policy
az backup policy create \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --name ProductionPolicy \
  --backup-management-type AzureIaasVM \
  --policy '{
    "schedulePolicy": {
      "schedulePolicyType": "SimpleSchedulePolicy",
      "scheduleRunFrequency": "Daily",
      "scheduleRunTimes": ["2026-02-16T02:00:00Z"]
    },
    "retentionPolicy": {
      "retentionPolicyType": "LongTermRetentionPolicy",
      "dailySchedule": {
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 30,
          "durationType": "Days"
        }
      },
      "weeklySchedule": {
        "daysOfTheWeek": ["Sunday"],
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 12,
          "durationType": "Weeks"
        }
      },
      "monthlySchedule": {
        "retentionScheduleFormatType": "Weekly",
        "retentionScheduleWeekly": {
          "daysOfTheWeek": ["Sunday"],
          "weeksOfTheMonth": ["First"]
        },
        "retentionTimes": ["2026-02-16T02:00:00Z"],
        "retentionDuration": {
          "count": 12,
          "durationType": "Months"
        }
      }
    },
    "timeZone": "Eastern Standard Time"
  }'
```

This policy:
- Runs daily at 2:00 AM Eastern.
- Keeps daily backups for 30 days.
- Keeps Sunday backups for 12 weeks.
- Keeps the first Sunday of each month for 12 months.

Apply the custom policy to a VM:

```bash
# Apply the custom policy to a VM
az backup protection enable-for-vm \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --vm myVM \
  --policy-name ProductionPolicy
```

## Triggering an On-Demand Backup

You do not have to wait for the scheduled backup. Trigger one immediately:

```bash
# Get the backup item details
CONTAINER=$(az backup container list \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --backup-management-type AzureIaasVM \
  --query "[?properties.friendlyName=='myVM'].name" \
  --output tsv)

ITEM=$(az backup item list \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --backup-management-type AzureIaasVM \
  --query "[0].name" \
  --output tsv)

# Trigger an on-demand backup with 30-day retention
az backup protection backup-now \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --item-name $ITEM \
  --retain-until $(date -u -v+30d +%Y-%m-%d) \
  --backup-management-type AzureIaasVM
```

## Monitoring Backup Jobs

Check the status of backup jobs:

```bash
# List recent backup jobs
az backup job list \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --output table
```

For a specific job:

```bash
# Show details of a specific backup job
az backup job show \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --name <job-id>
```

## Listing Recovery Points

To see what restore points are available:

```bash
# List all available recovery points for a VM
az backup recoverypoint list \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --item-name $ITEM \
  --backup-management-type AzureIaasVM \
  --output table
```

Each recovery point shows the date, type (snapshot or vault), and consistency level.

## Restoring a VM

Azure Backup offers several restore options:

### Option 1: Restore to a New VM

This creates a brand new VM from the backup:

```bash
# Get the recovery point name
RP_NAME=$(az backup recoverypoint list \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --item-name $ITEM \
  --backup-management-type AzureIaasVM \
  --query "[0].name" \
  --output tsv)

# Restore as a new VM
az backup restore restore-disks \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --item-name $ITEM \
  --rp-name $RP_NAME \
  --storage-account mystorageaccount \
  --target-resource-group targetResourceGroup
```

This restores the disks to the target resource group. You then create a VM from the restored disks:

```bash
# Create a VM from the restored OS disk
az vm create \
  --resource-group targetResourceGroup \
  --name myRestoredVM \
  --attach-os-disk myVM-osDisk-restored \
  --os-type Linux \
  --size Standard_D4s_v5
```

### Option 2: Replace Existing VM Disks

This replaces the disks on the original VM with the backup data:

```bash
# Restore by replacing existing disks
az backup restore restore-disks \
  --resource-group myResourceGroup \
  --vault-name myRecoveryVault \
  --container-name $CONTAINER \
  --item-name $ITEM \
  --rp-name $RP_NAME \
  --restore-mode AlternateLocation \
  --storage-account mystorageaccount \
  --target-resource-group myResourceGroup
```

### Option 3: Restore Individual Files

If you only need specific files, Azure Backup lets you mount the recovery point as a drive:

1. In the Azure portal, go to the Recovery Services vault.
2. Click "Backup Items" > "Azure Virtual Machine."
3. Select the VM and click "File Recovery."
4. Select a recovery point.
5. Download and run the provided script on any machine.
6. The script mounts the backup as a drive, letting you browse and copy individual files.
7. Unmount when done.

This is incredibly useful when you only need to recover a configuration file or a database dump, not the entire VM.

## Cross-Region Restore

For disaster recovery scenarios, you can enable cross-region restore on the vault:

```bash
# Enable cross-region restore on the vault
az backup vault backup-properties set \
  --resource-group myResourceGroup \
  --name myRecoveryVault \
  --cross-region-restore-flag true
```

With cross-region restore enabled, backup data is replicated to the Azure paired region. You can restore VMs in the secondary region if the primary region is unavailable. This doubles the storage cost for backups but provides geographic protection.

## Setting Up Backup Alerts

Configure alerts for backup failures:

```bash
# Create an alert for failed backup jobs
az monitor metrics alert create \
  --resource-group myResourceGroup \
  --name "Backup Failure Alert" \
  --scopes "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.RecoveryServices/vaults/myRecoveryVault" \
  --condition "count BackupHealthEvent > 0" \
  --action "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/microsoft.insights/actionGroups/myActionGroup" \
  --description "Alert when backup jobs fail"
```

In the portal, go to the vault > "Backup Alerts" to see any failed or warning-level jobs.

## Backup Cost Considerations

Azure Backup pricing has two components:

1. **Protected instance fee**: A monthly charge per VM being backed up. The fee depends on the size of the data being protected.
2. **Storage consumed**: The actual backup storage used, charged per GB per month. Incremental backups minimize this.

To estimate costs:
- A 100 GB VM with daily backups and 30-day retention typically costs $10-20/month.
- Enabling cross-region restore roughly doubles the storage cost.
- Longer retention periods mean more stored data and higher costs.

## Best Practices

1. **Test your restores regularly.** A backup that cannot be restored is not a backup. Do a test restore at least quarterly.
2. **Use application-consistent backups.** For databases, configure pre/post scripts to ensure consistency.
3. **Monitor backup health daily.** Failed backups can go unnoticed for weeks if you are not monitoring.
4. **Keep at least 30 days of daily retention.** This covers most scenarios where data loss is discovered late.
5. **Enable soft delete.** This prevents accidental or malicious deletion of backup data. Soft-deleted data is retained for 14 additional days.
6. **Use Azure Policy to enforce backup.** Apply a policy that automatically enables backup on all VMs.

## Wrapping Up

Azure VM Backup with Recovery Services Vault is a managed, set-it-and-forget-it solution that protects your VMs from data loss. The setup takes just a few commands, the daily backups are incremental and efficient, and when you need to restore, you have multiple options from full VM recovery to individual file retrieval. Invest the time to set it up properly, test your restores, and monitor for failures. When disaster strikes, you will be glad you did.
