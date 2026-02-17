# How to Migrate On-Premises File Servers to Azure Files

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Migration, File Server, Cloud Migration, Data Migration, Azure Storage

Description: A comprehensive guide to migrating on-premises Windows file servers to Azure Files, covering assessment, data transfer methods, permission migration, and cutover planning.

---

Migrating on-premises file servers to Azure Files is one of the most common cloud migration projects. The appeal is clear: eliminate the hardware, patching, and capacity planning that comes with physical file servers, and replace them with a managed cloud service that scales on demand.

But file server migrations are not as simple as copying files. You need to handle NTFS permissions, preserve metadata, manage the cutover with minimal user disruption, and deal with the sheer volume of data that decades-old file servers tend to accumulate. This guide covers the entire process from assessment to cutover.

## Choosing Your Migration Approach

There are several ways to get data from on-premises file servers to Azure Files:

### Approach 1: Azure File Sync (Recommended for Most Cases)

Deploy Azure File Sync on your existing file servers. Data syncs to Azure Files in the background while users continue working normally. Once sync is complete, you redirect users to the Azure File Share and decommission the on-premises server.

**Pros:** Zero downtime, preserves NTFS permissions, cloud tiering keeps frequently accessed data local during transition.
**Cons:** Requires installing an agent on the file server, only works on Windows Server 2016+.

### Approach 2: Robocopy

Use Robocopy to copy data directly to a mounted Azure File Share. This is the traditional approach and works well for smaller migrations.

**Pros:** Simple, well-understood tool, preserves permissions and metadata.
**Cons:** Requires the file share to be mounted, slower for very large data sets, needs a final cutover window.

### Approach 3: AzCopy

Upload data using AzCopy. Fast for bulk transfers but does not preserve NTFS permissions.

**Pros:** Very fast, handles large data volumes well.
**Cons:** Does not preserve NTFS ACLs, requires post-migration permission setup.

### Approach 4: Azure Data Box

For massive data volumes (tens of terabytes or more) where network transfer would take too long, use Azure Data Box to physically ship your data to Azure.

**Pros:** Fast for huge data sets, no network bandwidth impact.
**Cons:** Physical shipping adds days to the timeline, does not preserve NTFS ACLs.

## Phase 1: Assessment

Before migrating anything, assess your current file server environment.

### Inventory Your Shares

Document every file share, its size, and its purpose:

```powershell
# List all SMB shares on the file server
Get-SmbShare | Where-Object { $_.Special -eq $false } | Format-Table Name, Path, Description

# Get the size of each share
Get-SmbShare | Where-Object { $_.Special -eq $false } | ForEach-Object {
    $size = (Get-ChildItem -Path $_.Path -Recurse -Force -ErrorAction SilentlyContinue |
        Measure-Object -Property Length -Sum).Sum / 1GB
    [PSCustomObject]@{
        ShareName = $_.Name
        Path = $_.Path
        SizeGB = [math]::Round($size, 2)
    }
} | Format-Table -AutoSize
```

### Analyze File Distribution

Understanding your data profile helps choose the right Azure Files tier:

```powershell
# Count files by extension and total size
Get-ChildItem -Path "D:\FileShare" -Recurse -File -Force -ErrorAction SilentlyContinue |
    Group-Object Extension |
    Sort-Object Count -Descending |
    Select-Object -First 20 Name, Count, @{N="TotalSizeMB";E={
        [math]::Round(($_.Group | Measure-Object Length -Sum).Sum / 1MB, 2)
    }} | Format-Table -AutoSize
```

### Check for Migration Blockers

Look for files that might cause issues:

```powershell
# Find files with paths longer than 2048 characters (Azure Files limit)
Get-ChildItem -Path "D:\FileShare" -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName.Length -gt 2048 } |
    Select-Object FullName, @{N="PathLength";E={$_.FullName.Length}}

# Find files larger than 4 TiB (maximum file size for standard shares)
Get-ChildItem -Path "D:\FileShare" -Recurse -File -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Length -gt 4TB } |
    Select-Object FullName, @{N="SizeGB";E={[math]::Round($_.Length/1GB,2)}}
```

## Phase 2: Prepare Azure Resources

### Create the Storage Account and File Share

```bash
# Create a storage account
az storage account create \
  --name mymigratedfiles \
  --resource-group myresourcegroup \
  --location eastus \
  --sku Standard_LRS \
  --kind StorageV2 \
  --enable-large-file-share

# Create a file share with appropriate quota
az storage share-rm create \
  --storage-account mymigratedfiles \
  --resource-group myresourcegroup \
  --name companyshare \
  --quota 2048 \
  --access-tier TransactionOptimized
```

### Set Up AD Authentication

If your users currently authenticate with AD, configure AD authentication on the Azure File Share before migration. See the AD authentication guide for details.

```bash
# Enable AD DS authentication
az storage account update \
  --name mymigratedfiles \
  --resource-group myresourcegroup \
  --enable-files-adds true \
  --domain-name "contoso.com" \
  --net-bios-domain-name "CONTOSO" \
  --forest-name "contoso.com" \
  --domain-guid "your-domain-guid" \
  --domain-sid "your-domain-sid" \
  --azure-storage-sid "your-storage-sid"
```

## Phase 3: Data Migration Using Azure File Sync

This is the recommended approach for most migrations.

### Install the Azure File Sync Agent

On your on-premises file server:

```powershell
# Download and install the Azure File Sync agent
$agentUrl = "https://aka.ms/afs/agent/Server2022"
Invoke-WebRequest -Uri $agentUrl -OutFile "$env:TEMP\StorageSyncAgent.msi"
Start-Process msiexec.exe -ArgumentList "/i `"$env:TEMP\StorageSyncAgent.msi`" /quiet" -Wait
```

### Register and Configure Sync

```powershell
# Import the module and register the server
Import-Module "C:\Program Files\Azure\StorageSyncAgent\StorageSync.Management.PowerShell.Cmdlets.dll"
Login-AzStorageSync -SubscriptionId "your-sub-id" -TenantId "your-tenant-id"
Register-AzStorageSyncServer -ResourceGroupName "myresourcegroup" -StorageSyncServiceName "mySyncService"

# Create sync group and endpoints
New-AzStorageSyncGroup -ResourceGroupName "myresourcegroup" -StorageSyncServiceName "mySyncService" -SyncGroupName "migration-group"

# Add cloud endpoint
New-AzStorageSyncCloudEndpoint -ResourceGroupName "myresourcegroup" -StorageSyncServiceName "mySyncService" -SyncGroupName "migration-group" -StorageAccountResourceId $storageId -AzureFileShareName "companyshare"

# Add server endpoint (this starts the initial sync)
New-AzStorageSyncServerEndpoint -ResourceGroupName "myresourcegroup" -StorageSyncServiceName "mySyncService" -SyncGroupName "migration-group" -ServerResourceId $serverId -ServerLocalPath "D:\FileShare"
```

The initial sync uploads all data to Azure Files. This can take hours to days depending on data volume and network speed.

## Phase 3 (Alternative): Data Migration Using Robocopy

For a Robocopy approach, mount the Azure File Share and copy with permission preservation:

```powershell
# Mount the Azure File Share with the storage account key
net use Z: \\mymigratedfiles.file.core.windows.net\companyshare /user:AZURE\mymigratedfiles "storage-key"

# Run the initial Robocopy with full permission copy
# /MIR = mirror mode (copy everything, delete from dest what is not in source)
# /COPY:DATSOU = copy Data, Attributes, Timestamps, Security, Owner, aUditing
# /MT:16 = use 16 threads for performance
# /R:3 = retry 3 times on failure
# /W:5 = wait 5 seconds between retries
# /LOG = write a log file
robocopy "D:\FileShare" "Z:\" /MIR /COPY:DATSOU /MT:16 /R:3 /W:5 /LOG:C:\migration-log.txt /TEE
```

Run the initial copy well before the cutover. Then, during the cutover window, run Robocopy again to catch any changes:

```powershell
# Final sync during cutover window (much faster since most data is already copied)
robocopy "D:\FileShare" "Z:\" /MIR /COPY:DATSOU /MT:16 /R:3 /W:5 /LOG:C:\migration-final.txt /TEE
```

## Phase 4: Cutover

The cutover is when you switch users from the on-premises server to Azure Files.

### Pre-Cutover Checklist

1. Verify all data has synced to Azure Files
2. Confirm NTFS permissions are correct on the Azure File Share
3. Test access from several client machines
4. Communicate the change to users with clear instructions
5. Have a rollback plan

### DNS-Based Cutover

The smoothest cutover uses DNS. If your file server is accessed by FQDN (like `\\fileserver.contoso.com\share`), update DNS to point to the Azure File Share:

```powershell
# Create a CNAME record pointing the old server name to Azure Files
# This is done in your DNS server
Add-DnsServerResourceRecordCName `
  -Name "fileserver" `
  -HostNameAlias "mymigratedfiles.file.core.windows.net" `
  -ZoneName "contoso.com"
```

### GPO-Based Drive Mapping

If users have mapped drives via Group Policy, update the GPO to point to the Azure File Share:

Old path: `\\fileserver\companyshare`
New path: `\\mymigratedfiles.file.core.windows.net\companyshare`

### Script-Based Cutover

For environments without GPO:

```powershell
# Script to update mapped drives on user machines
# Deploy via login script or SCCM

# Remove the old drive mapping
net use Z: /delete /yes 2>$null

# Map to the new Azure File Share location
net use Z: \\mymigratedfiles.file.core.windows.net\companyshare /persistent:yes
```

## Phase 5: Post-Migration

### Verify Access

After cutover, monitor for issues:

```bash
# Check Azure Files metrics for access patterns
az monitor metrics list \
  --resource $(az storage account show --name mymigratedfiles --query id --output tsv) \
  --metric "Transactions" \
  --interval PT1H
```

### Monitor Performance

Watch for latency issues, especially for users in offices far from the Azure region:

```bash
# Check latency metrics
az monitor metrics list \
  --resource $(az storage account show --name mymigratedfiles --query id --output tsv) \
  --metric "SuccessServerLatency" \
  --interval PT1H
```

### Enable Backup

Set up Azure Backup for the migrated file share:

```bash
# Enable backup with a daily policy
az backup protection enable-for-azurefileshare \
  --vault-name myBackupVault \
  --resource-group myresourcegroup \
  --storage-account mymigratedfiles \
  --azure-file-share companyshare \
  --policy-name DailyFileSharePolicy
```

### Decommission the Old Server

After a validation period (typically 2-4 weeks):

1. Verify no users or applications are still accessing the old server
2. Take a final backup of the old server
3. Remove the Azure File Sync agent (if used)
4. Decommission the server

## Wrapping Up

Migrating file servers to Azure Files is a multi-phase project that requires careful planning. Azure File Sync provides the smoothest path with zero-downtime migration and automatic permission preservation. Robocopy works well for simpler setups. Whichever method you choose, invest time in the assessment phase to catch potential issues early, configure AD authentication before the migration, and plan your cutover carefully to minimize user disruption. The payoff is significant: no more hardware to manage, automatic scaling, and cloud-native backup and recovery.
