# How to Set Up Azure NetApp Files Backup and Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NetApp Files, Backup, Restore, Disaster Recovery, Data Protection, Snapshot

Description: Learn how to configure automated backups for Azure NetApp Files volumes and restore data from backups when disaster strikes.

---

Azure NetApp Files provides a built-in backup feature that stores volume backups in Azure Storage, separate from the NetApp infrastructure. This gives you an additional layer of protection beyond snapshots. While snapshots are stored within the same volume and protect against accidental file deletion, backups provide long-term recovery and can be restored to new Azure NetApp Files volumes in the same region.

This guide covers how to configure backup policies, create manual and automated backups, and restore volumes from those backups.

## Snapshots vs. Backups

Before diving into the setup, it is important to understand the difference between snapshots and backups in Azure NetApp Files:

**Snapshots**:
- Stored within the volume itself
- Nearly instant creation (under a second)
- Consume space only for changed blocks (incremental)
- Protect against accidental file deletion
- Do NOT protect against volume or infrastructure failure

**Backups**:
- Stored in Azure Storage, separate from the volume
- Take longer to create (minutes to hours depending on data size)
- Provide longer-term recovery and restore to a new volume in the same region
- First backup is a full copy; subsequent backups are incremental
- Can be used to restore to a new volume

For a complete data protection strategy, you should use both. Snapshots for quick recovery of individual files, and backups for disaster recovery.

## Prerequisites

To use Azure NetApp Files backup, you need:

- An existing Azure NetApp Files account with at least one capacity pool and volume
- The Microsoft.NetApp resource provider registered in your subscription
- A backup vault configured in the NetApp account

## Step 1: Register the NetApp Resource Provider

Azure NetApp Files requires the Microsoft.NetApp resource provider to be registered:

```bash
# Register the Azure NetApp Files resource provider
az provider register --namespace Microsoft.NetApp --wait

# Verify registration status
az provider show \
  --namespace Microsoft.NetApp \
  --query "registrationState"
```

Registration can take up to 30 minutes. Wait until the state shows "Registered" before proceeding.

## Step 2: Create a Backup Vault

Backup vaults are required to store and manage your backups. Create one within your NetApp account:

```bash
# Create a backup vault in the NetApp account
az netappfiles account backup-vault create \
  --resource-group rg-netapp \
  --account-name na-production \
  --backup-vault-name vault-backups \
  --location eastus2
```

The backup vault is a logical construct. Your actual backup data is stored in Azure-managed storage that is separate from the NetApp infrastructure.

## Step 3: Enable Backups on a Volume

Once the vault is created, enable backups on the volume you want to protect:

```bash
# Assign the backup vault to the volume
az netappfiles volume update \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata \
  --backup-vault-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/backupVaults/vault-backups"
```

After enabling backups, the system does not immediately create a backup. You need to either create one manually or set up a backup policy.

## Step 4: Create a Manual Backup

To create an on-demand backup, create a manual backup under the backup vault. Azure NetApp Files automatically creates a point-in-time snapshot and transfers it to Azure storage.

If you want the backup to use an existing snapshot, create or identify that snapshot first:

```bash
# Create a snapshot of the volume
az netappfiles snapshot create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata \
  --snapshot-name snap-manual-20260216 \
  --location eastus2
```

Now create a backup from the existing snapshot:

```bash
# Create a backup from the snapshot
az netappfiles account backup-vault backup create \
  --resource-group rg-netapp \
  --account-name na-production \
  --backup-vault-name vault-backups \
  --backup-name backup-manual-20260216 \
  --volume-resource-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-appdata" \
  --snapshot-name snap-manual-20260216 \
  --use-existing-snapshot true
```

The first backup takes the longest because it copies all data. Subsequent backups are incremental and only copy changed blocks.

## Step 5: Configure a Backup Policy

For automated protection, create a backup policy that runs on a schedule:

```bash
# Create a backup policy with daily, weekly, and monthly schedules
az netappfiles account backup-policy create \
  --resource-group rg-netapp \
  --account-name na-production \
  --backup-policy-name policy-standard \
  --location eastus2 \
  --daily-backups 7 \
  --weekly-backups 4 \
  --monthly-backups 12 \
  --enabled true
```

This policy keeps:
- 7 daily backups (rolling 1-week window)
- 4 weekly backups (rolling 1-month window)
- 12 monthly backups (rolling 1-year window)

Now assign this policy to your volume:

```bash
# Assign the backup policy to a volume
az netappfiles volume update \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata \
  --backup-policy-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/backupPolicies/policy-standard" \
  --backup-vault-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/backupVaults/vault-backups" \
  --policy-enforced true
```

## Step 6: Monitor Backup Status

Check the status of your backups to ensure they are completing successfully:

```bash
# List all backups for a volume
az netappfiles account backup-vault backup list \
  --resource-group rg-netapp \
  --account-name na-production \
  --backup-vault-name vault-backups \
  --filter "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-appdata" \
  --output table

# Get details of a specific backup
az netappfiles account backup-vault backup show \
  --resource-group rg-netapp \
  --account-name na-production \
  --backup-vault-name vault-backups \
  --backup-name backup-manual-20260216

# Get the latest backup status for the volume
az netappfiles volume latest-backup-status current show \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata
```

For individual backup resources, check the provisioning state, such as **Creating**, **Succeeded**, **Failed**, or **Deleting**. For the latest backup status on a volume, check the `healthy`, `relationshipStatus`, and `errorMessage` fields returned by `latest-backup-status`.

## Step 7: Restore a Volume from Backup

When you need to restore, you create a new volume from a backup. Azure NetApp Files does not support in-place restore - the backup always restores to a new volume.

```bash
# Restore a volume from backup to a new volume
az netappfiles volume create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-appdata-restored \
  --location eastus2 \
  --service-level Premium \
  --usage-threshold 1024 \
  --file-path "appdata-restored" \
  --vnet vnet-production \
  --subnet snet-netapp \
  --protocol-types CIFS \
  --backup-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/backupVaults/vault-backups/backups/backup-manual-20260216"
```

The restore operation creates a new volume and populates it with data from the backup. The time required depends on the backup size; volumes larger than 10 TiB can take multiple hours to transfer from the backup media.

## Step 8: Redirect Clients to the Restored Volume

After the restore completes, you need to redirect your clients to the new volume. The approach depends on your setup:

**Option A: Update DNS** - If your clients connect via a DNS name, update the DNS record to point to the new volume's IP address:

```powershell
# On a Windows DNS server, update the record
# This redirects clients to the restored volume without reconfiguring each client
Remove-DnsServerResourceRecord -ZoneName "corp.contoso.com" -Name "anfsmb" -RRType "A" -Force
Add-DnsServerResourceRecord -ZoneName "corp.contoso.com" -Name "anfsmb" -A -IPv4Address "10.0.10.5"
```

**Option B: Remount on clients** - If clients connect directly, update the mount path:

```powershell
# Disconnect the old share and connect to the restored volume
net use S: /delete
net use S: \\anfsmb.corp.contoso.com\appdata-restored /persistent:yes
```

## Automating Backup Monitoring with Azure Monitor

Set up alerts to catch backup failures early. The following creates an alert rule that triggers when a backup fails:

```bash
# Create an action group for notifications
az monitor action-group create \
  --resource-group rg-netapp \
  --name ag-netapp-alerts \
  --short-name netapp \
  --email-receivers name="OpsTeam" email="ops@company.com"

# Create an alert rule for backup failures
az monitor metrics alert create \
  --resource-group rg-netapp \
  --name alert-backup-failure \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-appdata" \
  --condition "avg CbsVolumeOperationComplete < 1" \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.Insights/actionGroups/ag-netapp-alerts" \
  --description "Alert when Azure NetApp Files backup fails" \
  --severity 1
```

## Backup Retention Best Practices

Here are some recommendations for backup retention:

- **Production databases**: Daily backups kept for 30 days, weekly for 3 months, monthly for 1 year
- **Development/test**: Daily backups kept for 7 days, no weekly or monthly
- **Compliance data**: Align retention with your regulatory requirements.

Consider the cost implications as well. Azure NetApp Files backup pricing is based on the total backup storage consumed, and backup restores are charged based on the restored backup capacity. Longer retention means higher costs, so balance protection with budget.

## Disaster Recovery Considerations

Backups can be restored to new Azure NetApp Files volumes within the same region. For cross-region protection, consider using Azure NetApp Files Cross-Region Replication (CRR) in addition to backups. CRR provides near-real-time replication to a secondary region, while backups provide point-in-time recovery.

The ideal DR strategy for Azure NetApp Files combines:

1. **Snapshots** for quick file-level recovery (RPO: minutes)
2. **Backups** for volume-level recovery (RPO: hours to days depending on schedule)
3. **Cross-Region Replication** for regional disaster recovery (RPO: minutes)

## Wrapping Up

Azure NetApp Files backup provides essential protection beyond what snapshots alone can offer. The setup process involves enabling the backup feature, creating a vault, configuring policies, and assigning them to volumes. Regular monitoring ensures your backups complete on schedule, and testing the restore process periodically validates your disaster recovery plan. Combine backups with snapshots and cross-region replication for comprehensive data protection that covers every failure scenario from accidental file deletion to regional outages.
