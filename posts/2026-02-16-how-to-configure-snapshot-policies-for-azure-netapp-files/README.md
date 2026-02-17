# How to Configure Snapshot Policies for Azure NetApp Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, NetApp Files, Snapshots, Data Protection, Backup Policy, Storage Management

Description: Learn how to create and manage automated snapshot policies for Azure NetApp Files volumes to protect data with scheduled point-in-time copies.

---

Snapshots in Azure NetApp Files are incredibly fast. They take less than a second to create regardless of volume size because they leverage the underlying WAFL (Write Anywhere File Layout) technology - snapshots only record metadata pointers, not actual data copies. But creating snapshots manually is not sustainable for production workloads. You need automated snapshot policies that create, retain, and clean up snapshots on a schedule.

This guide covers how to configure snapshot policies, assign them to volumes, and use snapshots for data recovery.

## How NetApp Snapshots Work

Unlike traditional backup copies, Azure NetApp Files snapshots are not full copies of data. When a snapshot is taken, the system records the current state of all file system metadata. Data blocks that exist at snapshot time are preserved - they cannot be overwritten. New writes go to new blocks.

This has several practical implications:

- **Snapshots are instant**: Creation time is under a second for any volume size
- **Space efficient**: A fresh snapshot consumes almost zero additional space. Space consumption grows only as data changes.
- **Performance impact**: Near zero. Snapshots do not affect volume performance.
- **Recovery**: You can restore individual files from a snapshot, or revert an entire volume.

## Step 1: Create a Snapshot Policy

Snapshot policies define the schedule and retention for automated snapshots. You can configure hourly, daily, weekly, and monthly schedules independently.

```bash
# Create a comprehensive snapshot policy
az netappfiles snapshot policy create \
  --resource-group rg-netapp \
  --account-name na-production \
  --snapshot-policy-name policy-production \
  --location eastus2 \
  --enabled true \
  --hourly-snapshots 6 \
  --hourly-minute 0 \
  --daily-snapshots 7 \
  --daily-hour 23 \
  --daily-minute 30 \
  --weekly-snapshots 4 \
  --weekly-day Monday \
  --weekly-hour 1 \
  --weekly-minute 0 \
  --monthly-snapshots 12 \
  --monthly-days-of-month "1" \
  --monthly-hour 2 \
  --monthly-minute 0
```

This policy creates:
- **Hourly**: A snapshot every hour at minute 0, keeping the last 6
- **Daily**: A snapshot every day at 11:30 PM, keeping the last 7
- **Weekly**: A snapshot every Monday at 1:00 AM, keeping the last 4
- **Monthly**: A snapshot on the 1st of each month at 2:00 AM, keeping the last 12

The retention count determines how many snapshots of each type are kept. When a new snapshot is created and the count exceeds the limit, the oldest snapshot of that type is deleted.

## Step 2: Create a Minimal Policy for Dev/Test

For development environments, you do not need the same level of protection:

```bash
# Create a lighter policy for dev/test
az netappfiles snapshot policy create \
  --resource-group rg-netapp \
  --account-name na-production \
  --snapshot-policy-name policy-devtest \
  --location eastus2 \
  --enabled true \
  --daily-snapshots 3 \
  --daily-hour 23 \
  --daily-minute 0 \
  --weekly-snapshots 2 \
  --weekly-day Sunday \
  --weekly-hour 2 \
  --weekly-minute 0
```

## Step 3: Assign the Policy to a Volume

Attach the snapshot policy to one or more volumes:

```bash
# Assign the production policy to a volume
az netappfiles volume update \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --snapshot-policy-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/snapshotPolicies/policy-production"
```

The policy takes effect immediately. The next scheduled snapshot will be created according to the policy schedule.

Assign the same policy to multiple volumes:

```bash
# Assign to additional volumes
for vol in vol-databases vol-user-data vol-shared-files; do
  az netappfiles volume update \
    --resource-group rg-netapp \
    --account-name na-production \
    --pool-name pool-premium \
    --volume-name "$vol" \
    --snapshot-policy-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/snapshotPolicies/policy-production"
  echo "Policy assigned to $vol"
done
```

## Step 4: Create Manual Snapshots

In addition to automated policies, you can create manual snapshots before planned changes like deployments or migrations:

```bash
# Create a manual snapshot before a deployment
az netappfiles snapshot create \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --snapshot-name pre-deploy-20260216 \
  --location eastus2
```

Manual snapshots are not managed by the policy - they will not be automatically deleted when the retention count is exceeded. You need to clean them up manually.

## Step 5: List and Monitor Snapshots

Check what snapshots exist on a volume:

```bash
# List all snapshots for a volume
az netappfiles snapshot list \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --output table

# Get details of a specific snapshot
az netappfiles snapshot show \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --snapshot-name pre-deploy-20260216
```

## Step 6: Restore Files from Snapshots

For NFS volumes, snapshots are accessible through a hidden `.snapshot` directory at the volume root. Users can restore files themselves without administrator intervention.

```bash
# List available snapshots from a mounted NFS volume
ls /mnt/netapp-volume/.snapshot/

# Output might look like:
# hourly.2026-02-16_1000
# hourly.2026-02-16_0900
# daily.2026-02-15_2330
# weekly.2026-02-10_0100
# pre-deploy-20260216

# Restore a specific file from a daily snapshot
cp /mnt/netapp-volume/.snapshot/daily.2026-02-15_2330/data/important-file.csv \
   /mnt/netapp-volume/data/important-file.csv

# Restore an entire directory
cp -r /mnt/netapp-volume/.snapshot/daily.2026-02-15_2330/data/reports/ \
      /mnt/netapp-volume/data/reports/
```

For SMB volumes, the equivalent is the "Previous Versions" tab in Windows Explorer. Right-click on a file or folder, select Properties, and then the Previous Versions tab. Snapshots appear as available versions.

## Step 7: Revert an Entire Volume

If you need to roll back the entire volume to a snapshot, use the volume revert operation. This is a more drastic step that reverts all data in the volume.

```bash
# Revert the volume to a specific snapshot
# WARNING: This overwrites all changes made after the snapshot
az netappfiles volume revert \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --snapshot-id "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-app-data/snapshots/pre-deploy-20260216"
```

Volume revert is fast because it changes metadata pointers rather than copying data. However, all data written after the snapshot is lost. Use this only when you are certain you want to roll back completely.

## Step 8: Manage Snapshot Space Consumption

While snapshots are space-efficient, they do consume space over time as data changes. Monitor snapshot space usage:

```bash
# Check volume snapshot space consumption
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/rg-netapp/providers/Microsoft.NetApp/netAppAccounts/na-production/capacityPools/pool-premium/volumes/vol-app-data" \
  --metric "VolumeSnapshotSize" \
  --interval PT1H \
  --output table
```

If snapshot space is growing too fast, consider:

1. **Reducing retention counts**: Keep fewer hourly or daily snapshots
2. **Cleaning up manual snapshots**: Remove old manual snapshots that are no longer needed
3. **Increasing volume quota**: If the volume is approaching capacity due to snapshot space

Delete old manual snapshots:

```bash
# Delete a manual snapshot
az netappfiles snapshot delete \
  --resource-group rg-netapp \
  --account-name na-production \
  --pool-name pool-premium \
  --volume-name vol-app-data \
  --snapshot-name pre-deploy-20260216
```

## Step 9: Update an Existing Policy

Modify a snapshot policy as your needs change:

```bash
# Update the policy to increase daily retention
az netappfiles snapshot policy update \
  --resource-group rg-netapp \
  --account-name na-production \
  --snapshot-policy-name policy-production \
  --location eastus2 \
  --daily-snapshots 14 \
  --daily-hour 23 \
  --daily-minute 30
```

To disable a specific schedule without removing it:

```bash
# Disable hourly snapshots (set count to 0)
az netappfiles snapshot policy update \
  --resource-group rg-netapp \
  --account-name na-production \
  --snapshot-policy-name policy-production \
  --location eastus2 \
  --hourly-snapshots 0
```

## Snapshot Policy Design Guidelines

When designing your snapshot policy, consider these factors:

**Recovery Point Objective (RPO)**: How much data can you afford to lose? If your RPO is 1 hour, you need at minimum hourly snapshots.

**Recovery Time Objective (RTO)**: How fast do you need to recover? Individual file restores from snapshots are nearly instant. Full volume reverts take seconds.

**Data change rate**: High change rates mean snapshots consume more space. Monitor snapshot space and adjust retention accordingly.

**Compliance requirements**: Some regulations require specific retention periods. Align your monthly snapshot retention with these requirements.

A good starting point for most production workloads:

| Schedule | Retention | RPO Coverage |
|----------|-----------|-------------|
| Hourly | 6-12 | Last 6-12 hours |
| Daily | 7-14 | Last 1-2 weeks |
| Weekly | 4-8 | Last 1-2 months |
| Monthly | 12 | Last year |

## Wrapping Up

Snapshot policies in Azure NetApp Files provide effortless, space-efficient data protection. The key is to design policies that match your RPO requirements without consuming excessive snapshot space. Combine automated policies for routine protection with manual snapshots for planned events like deployments. Teach your team how to access the `.snapshot` directory (NFS) or Previous Versions (SMB) so they can self-service file restores without filing support tickets. And monitor snapshot space consumption to keep storage costs predictable.
