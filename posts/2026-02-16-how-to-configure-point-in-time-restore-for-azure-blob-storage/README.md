# How to Configure Point-in-Time Restore for Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Point-in-Time Restore, Data Protection, Versioning, Change Feed

Description: Learn how to enable and use point-in-time restore for Azure Blob Storage to recover from accidental deletions and data corruption.

---

Accidentally deleting blobs or overwriting data happens more often than anyone likes to admit. A bad script, a misconfigured pipeline, or even a well-intentioned cleanup that goes wrong can wipe out critical data. Azure Blob Storage point-in-time restore lets you roll back block blobs to a previous state, recovering data without restoring from backups.

This guide covers how to enable the prerequisites, configure point-in-time restore, and perform an actual restore operation.

## How Point-in-Time Restore Works

Point-in-time restore works by leveraging three underlying features:

1. **Blob versioning**: Keeps previous versions of blobs when they are overwritten or deleted
2. **Change feed**: Records all changes to blobs in a log
3. **Soft delete**: Temporarily preserves deleted blobs

When you perform a restore, Azure reads the change feed to determine what changed between now and your target restore point. It then uses the versioned data to revert blobs to their state at that point in time.

The restore operation is scoped to block blobs in a specific container or set of containers. It does not affect append blobs, page blobs, or metadata like container ACLs.

## Prerequisites and Limitations

Before enabling point-in-time restore, be aware of these requirements:

- The storage account must be a general-purpose v2 account
- Blob versioning must be enabled
- Blob change feed must be enabled
- Blob soft delete must be enabled
- The account must NOT have hierarchical namespace enabled (no ADLS Gen2)
- Only block blobs are supported (not append or page blobs)
- The maximum restore window is 365 days

Also, while a restore is in progress, you cannot perform any write operations on blobs in the affected containers. Plan restore operations during low-traffic windows if possible.

## Step 1: Enable Required Features

Point-in-time restore depends on versioning, change feed, and soft delete. Enable all three:

```bash
# Enable blob versioning
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --enable-versioning true

# Enable blob change feed
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --enable-change-feed true

# Enable soft delete with 14-day retention
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --delete-retention-days 14 \
  --enable-delete-retention true

# Enable container soft delete as well
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --container-delete-retention-days 7 \
  --enable-container-delete-retention true
```

These features start tracking changes immediately after being enabled. You cannot restore to a point in time before these features were active.

## Step 2: Enable Point-in-Time Restore

Now enable point-in-time restore itself and set the retention window:

```bash
# Enable point-in-time restore with a 30-day window
az storage account blob-service-properties update \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --enable-restore-policy true \
  --restore-days 30
```

The `--restore-days` value determines how far back you can restore. The maximum is 365 days. Keep in mind that longer retention windows mean more versioned data is kept, which increases storage costs.

Verify the configuration:

```bash
# Check all the blob service properties
az storage account blob-service-properties show \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --query "{versioning:isVersioningEnabled, changeFeed:changeFeed.enabled, softDelete:deleteRetentionPolicy, pitr:restorePolicy}"
```

## Step 3: Test with Sample Data

Before relying on point-in-time restore in production, test it. Create some test data, modify it, and then restore.

The following Python script creates test blobs, waits, modifies them, and demonstrates the restore process:

```python
from azure.storage.blob import BlobServiceClient
import time
from datetime import datetime, timezone

# Connect to the storage account
conn_str = "DefaultEndpointsProtocol=https;AccountName=stappdata2026;..."
blob_service = BlobServiceClient.from_connection_string(conn_str)

container = blob_service.get_container_client("pitr-test")

# Create the test container
container.create_container()

# Upload initial test data
for i in range(5):
    blob = container.get_blob_client(f"document-{i}.txt")
    blob.upload_blob(f"Original content for document {i}")
    print(f"Uploaded document-{i}.txt")

# Record the timestamp AFTER uploading original data
# This is our target restore point
print("Waiting 60 seconds to establish a clear restore point...")
time.sleep(60)
restore_point = datetime.now(timezone.utc)
print(f"Restore point: {restore_point.isoformat()}")

# Now simulate data corruption - overwrite and delete
time.sleep(10)
for i in range(3):
    blob = container.get_blob_client(f"document-{i}.txt")
    blob.upload_blob(f"CORRUPTED content for document {i}", overwrite=True)
    print(f"Corrupted document-{i}.txt")

# Delete one blob
container.get_blob_client("document-4.txt").delete_blob()
print("Deleted document-4.txt")

print(f"\nTo restore, use this timestamp: {restore_point.isoformat()}")
```

## Step 4: Perform a Restore

Now restore the container to the state before the corruption.

Using the Azure CLI:

```bash
# Restore all blobs in the pitr-test container to the specified time
# Replace the datetime with your actual restore point
az storage blob restore \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --time-to-restore "2026-02-16T15:30:00Z" \
  --blob-range '["pitr-test/","pitr-test0"]'
```

The `--blob-range` parameter specifies which blobs to restore. The range is lexicographic (alphabetical). Using `"pitr-test/"` as the start and `"pitr-test0"` as the end effectively covers all blobs in the `pitr-test` container (since `0` comes after `/` in ASCII order).

To restore all blobs across all containers:

```bash
# Restore ALL block blobs in the storage account
az storage blob restore \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --time-to-restore "2026-02-16T15:30:00Z" \
  --blob-range '["",""]'
```

An empty start and end restores everything.

## Step 5: Monitor Restore Progress

The restore operation runs asynchronously. Check its status:

```bash
# Check restore status
az storage account show \
  --name stappdata2026 \
  --resource-group rg-app \
  --query "blobRestoreStatus" \
  --output json
```

The status will show:
- **InProgress**: Restore is running
- **Complete**: Restore finished successfully
- **Failed**: Restore encountered an error

For large storage accounts, restore can take hours. The time depends on the number of changes between the restore point and now.

## Step 6: Verify the Restored Data

After the restore completes, verify that your data is back to the expected state:

```python
from azure.storage.blob import BlobServiceClient

conn_str = "DefaultEndpointsProtocol=https;AccountName=stappdata2026;..."
blob_service = BlobServiceClient.from_connection_string(conn_str)
container = blob_service.get_container_client("pitr-test")

# List and read all blobs to verify content
for blob in container.list_blobs():
    client = container.get_blob_client(blob.name)
    content = client.download_blob().readall().decode("utf-8")
    print(f"{blob.name}: {content}")
    # Should show "Original content" instead of "CORRUPTED content"
```

## Selective Restore with Blob Prefix Ranges

You do not have to restore an entire container. Restore specific blob prefixes:

```bash
# Only restore blobs in the "reports/" virtual directory
az storage blob restore \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --time-to-restore "2026-02-16T15:30:00Z" \
  --blob-range '["mycontainer/reports/","mycontainer/reports0"]'
```

You can also specify multiple non-overlapping ranges:

```bash
# Restore blobs in two different prefixes
az storage blob restore \
  --account-name stappdata2026 \
  --resource-group rg-app \
  --time-to-restore "2026-02-16T15:30:00Z" \
  --blob-range '["container1/logs/","container1/logs0"]' '["container2/data/","container2/data0"]'
```

## Cost Considerations

Point-in-time restore increases storage costs in two ways:

1. **Versioned data**: Every overwrite creates a new version. Old versions consume storage until they are deleted or expire.
2. **Change feed logs**: The change feed generates logs that consume storage.

To manage costs:
- Set a reasonable restore window (30 days is a good default)
- Use lifecycle management policies to delete old versions after the restore window expires
- Monitor the `BlobCapacity` metric broken down by `BlobType` to see how much space versions consume

Here is a lifecycle policy that cleans up old versions:

```json
{
  "rules": [
    {
      "name": "delete-old-versions",
      "enabled": true,
      "type": "Lifecycle",
      "definition": {
        "filters": {
          "blobTypes": ["blockBlob"]
        },
        "actions": {
          "version": {
            "delete": {
              "daysAfterCreationGreaterThan": 30
            }
          }
        }
      }
    }
  ]
}
```

## When to Use Point-in-Time Restore vs. Other Options

Point-in-time restore is best for recovering from bulk data corruption or accidental deletion. For other scenarios, consider:

- **Soft delete**: Recovering individual deleted blobs (simpler, no restore operation needed)
- **Versioning**: Accessing a specific previous version of a single blob
- **Blob snapshots**: Manual point-in-time copies of individual blobs
- **Azure Backup**: Long-term backup with vault-based protection and RBAC isolation

Point-in-time restore shines when you need to restore many blobs at once to a consistent state, such as recovering from a ransomware attack or a buggy batch job that corrupted thousands of files.

## Wrapping Up

Point-in-time restore for Azure Blob Storage is a powerful safety net that lets you undo bulk changes to your data. The setup requires enabling versioning, change feed, and soft delete as prerequisites, then enabling the restore policy with an appropriate retention window. Test the feature in a non-production environment before relying on it for critical data, and make sure you have lifecycle policies in place to manage the cost of keeping versioned data. When disaster strikes, the ability to roll back your blobs to a known-good state can save hours or days of recovery effort.
