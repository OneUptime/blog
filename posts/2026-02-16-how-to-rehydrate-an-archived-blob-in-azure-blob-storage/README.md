# How to Rehydrate an Archived Blob in Azure Blob Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Archive Tier, Rehydration, Data Retrieval, Azure Storage, Cost Management

Description: Learn how to rehydrate blobs from Azure Blob Storage Archive tier using standard and high-priority options, and understand the costs and timing involved.

---

When you move a blob to the Archive tier in Azure Blob Storage, you get the cheapest storage rate available. The tradeoff is that archived blobs are offline - you cannot read their content directly. To access the data, you first need to rehydrate it, which means moving it back to an online tier (Hot, Cool, or Cold). This process takes time, and depending on the priority you choose, it can take anywhere from under an hour to up to 15 hours.

If you have ever needed to pull data out of archive storage on short notice, you know how important it is to understand the rehydration process before you actually need it. Let me walk through how it works and the options available to you.

## Why Blobs in Archive Tier Cannot Be Read Directly

The Archive tier stores data on offline media. When you try to read an archived blob without rehydrating it first, Azure returns an HTTP 409 Conflict error with a message indicating the blob is in an archive state. This is by design - the extreme cost savings come from the fact that Azure does not keep this data on hot (fast-access) storage.

You can still perform certain operations on archived blobs without rehydration:

- Get blob properties and metadata
- List blobs (archived blobs appear in listings)
- Set the blob tier (which triggers rehydration)
- Copy the blob to a new blob in an online tier
- Delete the blob

What you cannot do without rehydration: read the blob content, download it, or create snapshots.

## Rehydration Methods

There are two ways to rehydrate an archived blob:

### Method 1: Change the Blob Tier

The simplest approach is to set the blob's tier to Hot, Cool, or Cold:

```bash
# Rehydrate an archived blob to Hot tier
az storage blob set-tier \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name archived-report.pdf \
  --tier Hot
```

This triggers an asynchronous rehydration process. The blob remains in the Archive tier with a status of "rehydrate-pending-to-hot" (or whichever tier you selected) until the process completes.

### Method 2: Copy to a New Blob

You can also copy the archived blob to a new blob in an online tier. This preserves the original archived blob:

```bash
# Copy an archived blob to a new blob in the Hot tier
az storage blob copy start \
  --account-name mystorageaccount \
  --destination-container mycontainer \
  --destination-blob report-rehydrated.pdf \
  --source-uri "https://mystorageaccount.blob.core.windows.net/mycontainer/archived-report.pdf" \
  --tier Hot
```

The advantage of this method is that the original archived blob stays in Archive, so you keep the cheap storage for the original while getting an accessible copy. The copy completes asynchronously, just like a tier change.

## Rehydration Priority

Azure offers two rehydration priorities:

**Standard priority** - The rehydration starts and completes within up to 15 hours. This is the default and the cheaper option. Azure does not guarantee a specific time within that window; it depends on the blob size and current demand.

**High priority** - The rehydration is prioritized and may complete in under an hour for blobs smaller than 10 GB. Larger blobs may still take longer. This costs more per GB but is worth it when you need the data urgently.

### Setting Priority with Azure CLI

```bash
# Rehydrate with standard priority (default)
az storage blob set-tier \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name archived-report.pdf \
  --tier Hot \
  --rehydrate-priority Standard
```

```bash
# Rehydrate with high priority for faster access
az storage blob set-tier \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name archived-report.pdf \
  --tier Hot \
  --rehydrate-priority High
```

### Setting Priority with Python SDK

```python
from azure.storage.blob import BlobServiceClient, StandardBlobTier, RehydratePriority

# Connect to the storage account
blob_service_client = BlobServiceClient.from_connection_string("your-connection-string")
blob_client = blob_service_client.get_blob_client(
    container="mycontainer",
    blob="archived-report.pdf"
)

# Rehydrate with high priority
blob_client.set_standard_blob_tier(
    standard_blob_tier=StandardBlobTier.HOT,
    rehydrate_priority=RehydratePriority.HIGH
)
print("High-priority rehydration started")
```

## Monitoring Rehydration Progress

You can check the rehydration status of a blob through its properties:

```bash
# Check the rehydration status of a blob
az storage blob show \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name archived-report.pdf \
  --query "{Tier:properties.blobTier, ArchiveStatus:properties.archiveStatus, RehydratePriority:properties.rehydratePriority}" \
  --output table
```

The `archiveStatus` field shows one of:

- `rehydrate-pending-to-hot` - Rehydrating to Hot tier
- `rehydrate-pending-to-cool` - Rehydrating to Cool tier
- `null` - Not currently rehydrating (either already online or still archived)

### Python SDK Status Check

```python
from azure.storage.blob import BlobServiceClient

blob_service_client = BlobServiceClient.from_connection_string("your-connection-string")
blob_client = blob_service_client.get_blob_client(
    container="mycontainer",
    blob="archived-report.pdf"
)

# Get blob properties to check rehydration status
properties = blob_client.get_blob_properties()
print(f"Current tier: {properties.blob_tier}")
print(f"Archive status: {properties.archive_status}")
print(f"Rehydrate priority: {properties.rehydrate_priority}")
```

## Setting Up Notifications for Rehydration Completion

Since rehydration is asynchronous, you might want to be notified when it completes. You can use Azure Event Grid to subscribe to blob tier change events:

```bash
# Create an Event Grid subscription for blob tier change events
az eventgrid event-subscription create \
  --name rehydration-complete-alert \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myresourcegroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --included-event-types Microsoft.Storage.BlobTierChanged \
  --endpoint "https://my-webhook-endpoint.example.com/api/rehydration-complete"
```

This sends a notification to your webhook whenever a blob's tier changes, including when a rehydration completes.

## Bulk Rehydration

When you need to rehydrate many blobs at once, script the process:

```python
from azure.storage.blob import BlobServiceClient, StandardBlobTier, RehydratePriority
import time

# Connect to the storage account
blob_service_client = BlobServiceClient.from_connection_string("your-connection-string")
container_client = blob_service_client.get_container_client("mycontainer")

# List all archived blobs with a specific prefix
blobs_to_rehydrate = []
for blob in container_client.list_blobs(name_starts_with="reports/2024/"):
    if blob.blob_tier == "Archive":
        blobs_to_rehydrate.append(blob.name)

print(f"Found {len(blobs_to_rehydrate)} archived blobs to rehydrate")

# Rehydrate each blob
for i, blob_name in enumerate(blobs_to_rehydrate):
    blob_client = container_client.get_blob_client(blob_name)
    blob_client.set_standard_blob_tier(
        standard_blob_tier=StandardBlobTier.COOL,  # Rehydrate to Cool to minimize cost
        rehydrate_priority=RehydratePriority.STANDARD
    )

    if (i + 1) % 50 == 0:
        print(f"Started rehydration for {i + 1}/{len(blobs_to_rehydrate)} blobs")
        # Small delay to avoid throttling
        time.sleep(1)

print(f"Rehydration started for all {len(blobs_to_rehydrate)} blobs")
```

## Canceling a Rehydration

You can cancel an in-progress rehydration by setting the blob tier back to Archive:

```bash
# Cancel rehydration by setting the tier back to Archive
az storage blob set-tier \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name archived-report.pdf \
  --tier Archive
```

This stops the rehydration process. However, you will still be charged for the rehydration operations that were already performed.

## Cost Considerations

Rehydration costs come from several sources:

**Data retrieval cost** - A per-GB charge for reading data from the Archive tier. This is the largest cost component and varies by region.

**Priority surcharge** - High-priority rehydration costs more per GB than standard priority. The exact difference varies but can be significant for large volumes.

**Destination tier storage** - Once rehydrated, you pay the storage rate of the destination tier.

**Early deletion fee** - If you archived the blob less than 180 days ago, you pay an early deletion fee proportional to the remaining days.

To minimize rehydration costs:

1. Rehydrate to Cool instead of Hot if you only need to read the data a few times.
2. Use standard priority unless the data is urgently needed.
3. Consider whether you need to rehydrate the entire blob or if copying specific sections would work.
4. Plan ahead - if you know you will need archived data, start rehydration early so standard priority has time to complete.

## Rehydration Timing

In my experience, standard priority rehydration usually completes within a few hours, not the full 15-hour window. But Azure makes no guarantees, so do not plan around optimistic timing. High priority typically completes within 1 hour for blobs under 10 GB.

For large blobs (hundreds of GB or more), even high-priority rehydration can take longer than an hour. Plan accordingly for large data volumes.

## Best Practices

**Always check the archive status before attempting to read.** Build this check into your application code to handle archived blobs gracefully.

**Use event-driven notifications** instead of polling for rehydration completion. Event Grid is more efficient than repeatedly checking blob properties.

**Rehydrate to the cheapest tier that meets your needs.** If you just need to read the data once, rehydrating to Cool is cheaper than Hot.

**Keep a metadata record of what is in Archive.** Since you cannot read archived blob content, maintain a separate index of what was archived and when. This helps you decide what to rehydrate without trial and error.

**Test your rehydration workflow before you need it in production.** An emergency is not the time to figure out how the process works.

## Wrapping Up

Rehydrating archived blobs is a straightforward process, but the asynchronous nature and variable timing require planning. Choose the right priority level based on your urgency, rehydrate to the cheapest feasible tier, and set up notifications so you know when the data is ready. With a bit of forethought, the Archive tier gives you massive cost savings without making your data permanently inaccessible.
