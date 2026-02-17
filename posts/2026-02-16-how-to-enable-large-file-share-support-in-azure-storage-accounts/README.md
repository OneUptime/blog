# How to Enable Large File Share Support in Azure Storage Accounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Large File Share, Storage Account, Scalability, File Storage

Description: Learn how to enable large file share support in Azure Storage accounts to scale file shares up to 100 TiB with higher IOPS and throughput.

---

By default, Azure standard file shares support a maximum size of 5 TiB per share. For many workloads - media storage, large dataset processing, backup repositories - this limit is too restrictive. Enabling large file share support on your storage account lifts this limit to 100 TiB per share and significantly increases IOPS and throughput capabilities.

This guide explains what large file shares change, how to enable the feature, and what limitations to be aware of.

## What Large File Shares Enable

When you enable large file share support, the limits change as follows:

| Metric | Standard (default) | Large File Share Enabled |
|--------|-------------------|------------------------|
| Max share size | 5 TiB | 100 TiB |
| Max IOPS per share | 1,000 | 20,000 |
| Max throughput (ingress) | 60 MiB/s | 300 MiB/s |
| Max throughput (egress) | 60 MiB/s | 300 MiB/s |
| Supported redundancy | LRS, ZRS, GRS, GZRS | LRS, ZRS only |

That last row is the critical trade-off. Enabling large file shares restricts your storage account to locally redundant (LRS) or zone-redundant (ZRS) replication. You cannot use geo-redundant storage (GRS or GZRS) with large file shares. This means no automatic replication to a secondary region.

If you need both large file shares and geo-redundancy, you will need to implement your own cross-region replication using Azure File Sync or AzCopy.

## Step 1: Check Your Current Storage Account Configuration

Before enabling large file shares, verify your storage account's current settings:

```bash
# Check the current configuration
az storage account show \
  --name stfiles2026 \
  --resource-group rg-files \
  --query "{name:name, kind:kind, sku:sku.name, largeFileSharesState:largeFileSharesState, location:location}" \
  --output json
```

If `largeFileSharesState` is null or "Disabled", you need to enable it.

## Step 2: Enable Large File Shares on an Existing Account

If your storage account already uses LRS or ZRS, enabling large file shares is a simple update:

```bash
# Enable large file shares on an existing storage account
az storage account update \
  --name stfiles2026 \
  --resource-group rg-files \
  --enable-large-file-share
```

This operation is non-disruptive - existing file shares continue to work without interruption. However, this change is irreversible. Once enabled, you cannot disable large file share support.

If your account currently uses GRS or GZRS, you must first change the replication to LRS or ZRS:

```bash
# First, change from GRS to LRS
az storage account update \
  --name stfiles2026 \
  --resource-group rg-files \
  --sku Standard_LRS

# Then enable large file shares
az storage account update \
  --name stfiles2026 \
  --resource-group rg-files \
  --enable-large-file-share
```

Downgrading from GRS to LRS means you lose geo-redundancy. Make sure this is acceptable for your workload before proceeding.

## Step 3: Create a New Account with Large File Shares

If you are starting fresh, enable large file shares at creation time:

```bash
# Create a new storage account with large file shares enabled
az storage account create \
  --name stlargefiles2026 \
  --resource-group rg-files \
  --location eastus2 \
  --kind StorageV2 \
  --sku Standard_LRS \
  --enable-large-file-share \
  --min-tls-version TLS1_2
```

For zone redundancy:

```bash
# Create with ZRS for availability across zones
az storage account create \
  --name stlargefileszrs2026 \
  --resource-group rg-files \
  --location eastus2 \
  --kind StorageV2 \
  --sku Standard_ZRS \
  --enable-large-file-share \
  --min-tls-version TLS1_2
```

## Step 4: Create and Resize File Shares

With large file shares enabled, you can now create shares up to 100 TiB:

```bash
# Create a file share with a 50 TiB quota
az storage share-rm create \
  --resource-group rg-files \
  --storage-account stlargefiles2026 \
  --name media-archive \
  --quota 51200

# Create a smaller share - you do not have to use the full 100 TiB
az storage share-rm create \
  --resource-group rg-files \
  --storage-account stlargefiles2026 \
  --name team-docs \
  --quota 10240
```

Resize an existing share to take advantage of the new limits:

```bash
# Expand an existing 5 TiB share to 20 TiB
az storage share-rm update \
  --resource-group rg-files \
  --storage-account stlargefiles2026 \
  --name media-archive \
  --quota 20480
```

Expanding a share is instant and non-disruptive. Shrinking a share is also supported as long as the used capacity is below the new quota.

## Step 5: Mount and Verify

Mount the large file share to verify everything works. On Windows:

```powershell
# Get the storage account key
$key = (az storage account keys list `
  --account-name stlargefiles2026 `
  --resource-group rg-files `
  --query "[0].value" -o tsv)

# Store credentials
cmdkey /add:stlargefiles2026.file.core.windows.net `
  /user:AZURE\stlargefiles2026 `
  /pass:$key

# Map the drive
net use M: \\stlargefiles2026.file.core.windows.net\media-archive /persistent:yes

# Verify the share size
Get-PSDrive M | Select-Object Used, Free
```

On Linux:

```bash
# Install cifs-utils if not present
sudo apt-get install -y cifs-utils

# Create mount point and credentials file
sudo mkdir -p /mnt/media-archive

STORAGE_KEY=$(az storage account keys list \
  --account-name stlargefiles2026 \
  --resource-group rg-files \
  --query "[0].value" -o tsv)

# Mount the share
sudo mount -t cifs \
  //stlargefiles2026.file.core.windows.net/media-archive \
  /mnt/media-archive \
  -o username=stlargefiles2026,password="$STORAGE_KEY",dir_mode=0755,file_mode=0644,serverino

# Check available space
df -h /mnt/media-archive
```

## Step 6: Monitor Usage and Performance

Keep an eye on your share usage, especially as it grows toward the quota:

```bash
# Check current share usage
az storage share-rm show \
  --resource-group rg-files \
  --storage-account stlargefiles2026 \
  --name media-archive \
  --query "{name:name, quotaGiB:shareQuota, usedGiB:shareUsageBytes}" \
  --output json

# List all shares with their usage
az storage share-rm list \
  --resource-group rg-files \
  --storage-account stlargefiles2026 \
  --output table
```

Set up alerts for capacity thresholds:

```bash
# Alert when file share usage exceeds 80% of quota
az monitor metrics alert create \
  --resource-group rg-files \
  --name alert-share-capacity \
  --scopes "/subscriptions/<sub-id>/resourceGroups/rg-files/providers/Microsoft.Storage/storageAccounts/stlargefiles2026/fileServices/default" \
  --condition "avg FileShareCapacityQuotaUtilization > 80" \
  --window-size 1h \
  --evaluation-frequency 1h \
  --action "/subscriptions/<sub-id>/resourceGroups/rg-files/providers/microsoft.insights/actionGroups/ag-ops" \
  --description "File share capacity exceeds 80% of quota"
```

## Handling the Geo-Redundancy Limitation

The biggest limitation of large file shares is the loss of geo-redundancy. Here are strategies to mitigate this:

**Option 1: Azure File Sync for cross-region replication**

Set up Azure File Sync with server endpoints in two regions. This gives you a warm copy of your data in a secondary region:

```bash
# Create a sync group with endpoints in two regions
az storagesync sync-group create \
  --resource-group rg-files \
  --storage-sync-service ss-primary \
  --name sg-cross-region

# Register servers in both regions and add as server endpoints
# Each server syncs with the same cloud endpoint (Azure file share)
```

**Option 2: Scheduled AzCopy to a secondary region**

Run periodic AzCopy sync jobs to replicate data to a storage account in another region:

```bash
# Sync file share to a secondary region storage account
azcopy sync \
  "https://stlargefiles2026.file.core.windows.net/media-archive?$SAS_TOKEN" \
  "https://stlargefilesdr.file.core.windows.net/media-archive-replica?$SAS_TOKEN_DR" \
  --recursive
```

**Option 3: Azure Backup for point-in-time protection**

Use Azure Backup to create backup copies. This does not provide real-time replication but gives you recovery points:

```bash
# Create a Recovery Services vault
az backup vault create \
  --resource-group rg-files \
  --name rsv-file-backup \
  --location eastus2

# Enable backup for the file share
az backup protection enable-for-azurefileshare \
  --resource-group rg-files \
  --vault-name rsv-file-backup \
  --storage-account stlargefiles2026 \
  --azure-file-share media-archive \
  --policy-name DefaultPolicy
```

## Migration from Multiple Small Shares

If you are currently using multiple 5 TiB shares to work around the old limit, you can consolidate them into a single large share. Use AzCopy to copy data between shares:

```bash
# Copy data from old share to new large share
azcopy copy \
  "https://stoldaccount.file.core.windows.net/share1?$SAS_OLD" \
  "https://stlargefiles2026.file.core.windows.net/media-archive/share1-data?$SAS_NEW" \
  --recursive

azcopy copy \
  "https://stoldaccount.file.core.windows.net/share2?$SAS_OLD" \
  "https://stlargefiles2026.file.core.windows.net/media-archive/share2-data?$SAS_NEW" \
  --recursive
```

After verifying all data has been copied, update your mount points and decommission the old shares.

## Wrapping Up

Enabling large file share support in Azure Storage accounts is a straightforward process that unlocks 100 TiB shares with significantly higher IOPS and throughput. The main consideration is the loss of geo-redundancy - you are limited to LRS or ZRS. For workloads where data durability across regions is critical, plan a cross-region replication strategy using Azure File Sync, AzCopy, or Azure Backup before enabling the feature. Once enabled, the change is permanent, so make sure it is the right move for your workload before flipping the switch.
