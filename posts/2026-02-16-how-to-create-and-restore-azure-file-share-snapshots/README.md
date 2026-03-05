# How to Create and Restore Azure File Share Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Files, Snapshots, File Share, Backup, Data Recovery, Azure Storage

Description: Learn how to create, manage, and restore Azure File Share snapshots for point-in-time recovery of files, directories, and entire shares.

---

Azure File Share snapshots capture the state of your entire file share at a specific point in time. They are incremental, read-only copies that let you recover individual files, directories, or the whole share to a previous state. If someone accidentally deletes a critical file or an application corrupts data, snapshots are your fastest recovery option.

Unlike blob snapshots that work on individual blobs, file share snapshots capture the whole share at once. This makes them simpler to manage but also means you cannot snapshot individual files.

## How File Share Snapshots Work

When you create a snapshot, Azure captures the state of every file and directory in the share. The snapshot is incremental - only the changes since the last snapshot are stored. This means:

- The first snapshot contains references to all the data in the share
- Subsequent snapshots only store the data that changed since the previous snapshot
- Deleting an intermediate snapshot is safe because Azure manages the data dependencies

```mermaid
graph LR
    A[Snapshot 1<br/>Full reference] --> B[Snapshot 2<br/>Changes only]
    B --> C[Snapshot 3<br/>Changes only]
    C --> D[Current Share<br/>Live data]
```

Each snapshot is identified by a timestamp and is read-only. You can browse the snapshot, download files from it, or restore files from it to the live share.

## Creating a Snapshot

### Azure CLI

```bash
# Create a snapshot of an Azure File Share
az storage share snapshot \
  --account-name myfilesaccount \
  --name myfileshare
```

This returns a snapshot timestamp that uniquely identifies the snapshot. Save this timestamp if you need to reference the snapshot later.

### Azure Portal

1. Navigate to your storage account.
2. Under "Data storage," click "File shares."
3. Click on your file share.
4. Click "Snapshots" in the left menu.
5. Click "+ Add snapshot."
6. Optionally add a comment (useful for identifying why the snapshot was taken).
7. Click OK.

### PowerShell

```powershell
# Get the storage account context
$storageContext = New-AzStorageContext `
  -StorageAccountName "myfilesaccount" `
  -StorageAccountKey "your-storage-key"

# Create a snapshot of the file share
$snapshot = Get-AzStorageShare -Context $storageContext -Name "myfileshare" | `
  New-AzStorageShareSnapshot

# Display the snapshot timestamp
Write-Host "Snapshot created: $($snapshot.SnapshotTime)"
```

### Python SDK

```python
from azure.storage.fileshare import ShareClient

# Connect to the file share
share_client = ShareClient.from_connection_string(
    conn_str="your-connection-string",
    share_name="myfileshare"
)

# Create a snapshot
snapshot_info = share_client.create_snapshot()
snapshot_time = snapshot_info["snapshot"]
print(f"Snapshot created at: {snapshot_time}")
```

## Listing Snapshots

### Azure CLI

```bash
# List all snapshots for a file share
az storage share list \
  --account-name myfilesaccount \
  --include-snapshots \
  --query "[?snapshot != null]" \
  --output table
```

### PowerShell

```powershell
# List all snapshots for a file share
$context = New-AzStorageContext -StorageAccountName "myfilesaccount" -StorageAccountKey "your-key"
Get-AzStorageShare -Context $context -Name "myfileshare" -SnapshotTime * |
  Where-Object { $_.SnapshotTime -ne $null } |
  Format-Table Name, SnapshotTime, LastModified
```

## Browsing Snapshot Contents

You can browse the files in a snapshot without restoring them:

### Azure CLI

```bash
# List files in a snapshot's root directory
az storage file list \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --snapshot "2026-02-16T10:30:00.0000000Z" \
  --output table
```

```bash
# List files in a specific directory within a snapshot
az storage file list \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --snapshot "2026-02-16T10:30:00.0000000Z" \
  --path "documents/reports" \
  --output table
```

### Python SDK

```python
from azure.storage.fileshare import ShareClient

# Connect to a specific snapshot of the file share
share_client = ShareClient.from_connection_string(
    conn_str="your-connection-string",
    share_name="myfileshare",
    snapshot="2026-02-16T10:30:00.0000000Z"
)

# List files in the snapshot root
for item in share_client.list_directories_and_files():
    item_type = "DIR" if item["is_directory"] else "FILE"
    print(f"[{item_type}] {item['name']}")
```

## Restoring Individual Files

The most common use case is recovering a single deleted or corrupted file:

### Azure CLI

```bash
# Download a file from a snapshot
az storage file download \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --snapshot "2026-02-16T10:30:00.0000000Z" \
  --path "documents/important-report.pdf" \
  --dest "./recovered-report.pdf"
```

Then upload it back to the live share:

```bash
# Upload the recovered file back to the live share
az storage file upload \
  --account-name myfilesaccount \
  --share-name myfileshare \
  --source "./recovered-report.pdf" \
  --path "documents/important-report.pdf"
```

### Python SDK

```python
from azure.storage.fileshare import ShareFileClient

# Connect to the specific file in the snapshot
file_client = ShareFileClient.from_connection_string(
    conn_str="your-connection-string",
    share_name="myfileshare",
    file_path="documents/important-report.pdf",
    snapshot="2026-02-16T10:30:00.0000000Z"
)

# Download the file from the snapshot
with open("./recovered-report.pdf", "wb") as file_handle:
    data = file_client.download_file()
    data.readinto(file_handle)
    print("File recovered from snapshot")

# Upload it back to the live share
live_file_client = ShareFileClient.from_connection_string(
    conn_str="your-connection-string",
    share_name="myfileshare",
    file_path="documents/important-report.pdf"
)

with open("./recovered-report.pdf", "rb") as source:
    live_file_client.upload_file(source)
    print("File restored to live share")
```

## Restoring from Windows (Previous Versions)

If the Azure File Share is mounted on Windows, users can restore files using the "Previous Versions" feature built into Windows Explorer:

1. Right-click the file or folder in File Explorer.
2. Select "Properties."
3. Click the "Previous Versions" tab.
4. Select the snapshot version you want to restore from.
5. Click "Restore" to replace the current version, or "Open" to browse the snapshot first.

This works because Azure File Share snapshots are exposed as VSS (Volume Shadow Copy) snapshots to Windows clients. It is a seamless experience that users are already familiar with.

## Restoring an Entire Directory

To restore a complete directory from a snapshot, you need to download all files from the snapshot directory and upload them back:

```bash
# Download an entire directory from a snapshot
az storage file download-batch \
  --account-name myfilesaccount \
  --source myfileshare \
  --snapshot "2026-02-16T10:30:00.0000000Z" \
  --pattern "documents/*" \
  --dest "./restored-documents/"
```

Then upload the restored directory back:

```bash
# Upload the restored directory back to the live share
az storage file upload-batch \
  --account-name myfilesaccount \
  --destination myfileshare \
  --source "./restored-documents/" \
  --destination-path "documents/"
```

## Deleting Snapshots

Remove snapshots you no longer need to avoid storage costs:

### Azure CLI

```bash
# Delete a specific snapshot
az storage share delete \
  --account-name myfilesaccount \
  --name myfileshare \
  --snapshot "2026-02-16T10:30:00.0000000Z"
```

```bash
# Delete the file share and all its snapshots
az storage share delete \
  --account-name myfilesaccount \
  --name myfileshare \
  --delete-snapshots include
```

Note that you cannot delete a file share that has snapshots unless you include the `--delete-snapshots` flag. This protects you from accidentally losing snapshot data.

## Automating Snapshot Creation

Azure does not have a built-in snapshot scheduler for file shares. You can automate it using Azure Functions, Logic Apps, or simple scripts with cron/Task Scheduler.

### Using Azure Automation

```powershell
# Azure Automation Runbook to create daily file share snapshots
# Schedule this runbook to run daily

param(
    [string]$StorageAccountName = "myfilesaccount",
    [string]$ResourceGroupName = "myresourcegroup",
    [string]$ShareName = "myfileshare",
    [int]$RetainDays = 30
)

# Connect using the Automation Account's managed identity
Connect-AzAccount -Identity

# Get the storage account context
$storageAccount = Get-AzStorageAccount -ResourceGroupName $ResourceGroupName -Name $StorageAccountName
$context = $storageAccount.Context

# Create a new snapshot
$share = Get-AzStorageShare -Context $context -Name $ShareName
$snapshot = $share | New-AzStorageShareSnapshot
Write-Output "Created snapshot: $($snapshot.SnapshotTime)"

# Clean up old snapshots
$cutoffDate = (Get-Date).AddDays(-$RetainDays)
$allSnapshots = Get-AzStorageShare -Context $context -Name $ShareName -SnapshotTime * |
  Where-Object { $_.SnapshotTime -ne $null -and $_.SnapshotTime -lt $cutoffDate }

foreach ($oldSnapshot in $allSnapshots) {
    Remove-AzStorageShare -Share $oldSnapshot -Force
    Write-Output "Deleted old snapshot: $($oldSnapshot.SnapshotTime)"
}
```

## Snapshot Limits and Costs

- Maximum 200 snapshots per file share
- Snapshots are billed based on the incremental data they hold (only changed data counts)
- You cannot create a snapshot if you are at the 200-snapshot limit - delete old ones first
- Snapshot data counts toward the share's quota

For a share that does not change much between snapshots, the incremental cost per snapshot is minimal. For shares with heavy churn, each snapshot can hold significant data.

## Best Practices

**Create snapshots before major changes.** Always take a snapshot before running migrations, bulk updates, or any operation that modifies many files.

**Automate daily snapshots** with a cleanup policy that deletes snapshots older than your retention requirement.

**Test restores regularly.** A snapshot is only useful if you can restore from it. Periodically test the restore process so you know it works when you need it.

**Combine with Azure Backup** for a more complete data protection story. Azure Backup can manage file share snapshots with configurable retention policies and provides a more polished restore experience.

**Label your snapshots.** When creating snapshots via the portal, use the comment field to describe why the snapshot was taken. This makes it much easier to find the right snapshot during a recovery.

## Wrapping Up

Azure File Share snapshots provide fast, efficient point-in-time recovery for your cloud file shares. They are incremental, cost-effective, and integrate natively with Windows Previous Versions for a seamless user experience. Automate their creation, set up a retention policy to manage the 200-snapshot limit, and combine them with Azure Backup for comprehensive data protection. The few seconds it takes to create a daily snapshot can save you from hours of data recovery work.
