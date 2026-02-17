# How to Implement Server-Side Copy for Blobs in Azure Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Server-Side Copy, Data Migration, Copy Blob, Azure SDK, Storage Operations

Description: Learn how to use Azure Storage server-side copy operations to efficiently copy blobs between containers, accounts, and regions without downloading data.

---

When you need to copy blobs within Azure Storage, downloading them to your local machine and re-uploading is wasteful and slow. Server-side copy lets Azure handle the data transfer entirely within its infrastructure, which means no data flows through your client. The source and destination can be in the same container, different containers, different storage accounts, or even different regions. This post covers all the copy patterns and their trade-offs.

## Types of Server-Side Copy

Azure Storage provides three copy mechanisms:

1. **Copy Blob (asynchronous)**: Starts a background copy job that Azure processes asynchronously. Good for large blobs and cross-account copies.
2. **Copy Blob from URL (synchronous)**: Copies the blob synchronously within a single API call. Limited to 256 MB. Good for small blobs when you need immediate completion.
3. **Put Block from URL**: Copies a range of a source blob into a block of a destination block blob. Used for composing blobs from multiple sources or copying parts of large blobs.

## Basic Asynchronous Copy

The most common pattern is copying a blob from one location to another within the same or different storage accounts.

### Using Azure CLI

```bash
# Copy a blob within the same storage account
az storage blob copy start \
  --account-name mystorageaccount \
  --destination-container archive \
  --destination-blob "2026/02/report.pdf" \
  --source-container active \
  --source-blob "reports/report.pdf"

# Copy a blob from one storage account to another
# The source needs to be publicly accessible or you need a SAS token
az storage blob copy start \
  --account-name deststorageaccount \
  --destination-container data \
  --destination-blob "imported-data.csv" \
  --source-uri "https://sourcestorageaccount.blob.core.windows.net/exports/data.csv?sv=2023-01-01&ss=b&srt=o&sp=r&se=2026-02-17&sig=..."
```

### Using Python SDK

```python
from azure.storage.blob import BlobServiceClient, BlobSasPermissions, generate_blob_sas
from azure.identity import DefaultAzureCredential
from datetime import datetime, timezone, timedelta

credential = DefaultAzureCredential()

# Source and destination can be different storage accounts
source_service = BlobServiceClient(
    "https://sourcestorageaccount.blob.core.windows.net",
    credential=credential
)
dest_service = BlobServiceClient(
    "https://deststorageaccount.blob.core.windows.net",
    credential=credential
)

# For cross-account copies, generate a SAS token for the source
# The destination service needs to be able to read the source
source_blob_client = source_service.get_blob_client("exports", "data.csv")

sas_token = generate_blob_sas(
    account_name="sourcestorageaccount",
    container_name="exports",
    blob_name="data.csv",
    account_key="source-account-key",
    permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(hours=1)
)

source_url = f"{source_blob_client.url}?{sas_token}"

# Start the copy operation
dest_blob_client = dest_service.get_blob_client("data", "imported-data.csv")
copy_operation = dest_blob_client.start_copy_from_url(source_url)

print(f"Copy started. Copy ID: {copy_operation['copy_id']}")
print(f"Copy status: {copy_operation['copy_status']}")
```

### Monitoring Copy Progress

Asynchronous copies can take time for large blobs. You can poll for status:

```python
import time

def wait_for_copy(blob_client, timeout_seconds=3600):
    """Poll the copy status until it completes or times out."""
    start_time = time.time()

    while True:
        props = blob_client.get_blob_properties()
        copy_status = props.copy.status

        if copy_status == "success":
            print("Copy completed successfully")
            return True
        elif copy_status == "failed":
            print(f"Copy failed: {props.copy.status_description}")
            return False
        elif copy_status == "aborted":
            print("Copy was aborted")
            return False
        elif copy_status == "pending":
            # Show progress if available
            progress = props.copy.progress
            if progress:
                print(f"Copy in progress: {progress}")

        if time.time() - start_time > timeout_seconds:
            print("Copy timed out")
            blob_client.abort_copy(props.copy.id)
            return False

        time.sleep(5)

# Usage
wait_for_copy(dest_blob_client)
```

## Synchronous Copy from URL

For small blobs (up to 256 MB), synchronous copy completes within the API call:

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Copy a blob synchronously within the same account
# Source and destination must be in the same account for this method
source_client = blob_service.get_blob_client("source-container", "small-file.json")
dest_client = blob_service.get_blob_client("dest-container", "small-file.json")

# This completes immediately (synchronous)
dest_client.upload_blob_from_url(source_client.url)
print("Synchronous copy complete")
```

## Copying Between Access Tiers

Server-side copy can also change the access tier during the copy:

```python
from azure.storage.blob import StandardBlobTier

# Copy a blob and set it to the Cool tier in the destination
dest_blob_client = dest_service.get_blob_client("archive", "old-report.pdf")
copy_result = dest_blob_client.start_copy_from_url(
    source_url,
    standard_blob_tier=StandardBlobTier.Cool
)
```

This is useful for archival workflows where you copy data from an active container to an archive container and tier it down in one operation.

## Copying Blobs from Archive Tier

Blobs in the Archive tier cannot be read directly. Before copying from an Archive blob, you need to rehydrate it first:

```python
from azure.storage.blob import StandardBlobTier

# Rehydrate an archived blob before copying
# Priority can be "Standard" (up to 15 hours) or "High" (under 1 hour)
source_client = blob_service.get_blob_client("archive", "old-data.tar.gz")
source_client.set_standard_blob_tier(
    StandardBlobTier.Hot,
    rehydrate_priority="High"
)

# Wait for rehydration to complete (check the tier)
while True:
    props = source_client.get_blob_properties()
    if props.blob_tier == "Hot":
        print("Rehydration complete, now copying...")
        break
    print(f"Still rehydrating... Archive Status: {props.archive_status}")
    time.sleep(60)
```

## Bulk Copy Operations

For copying many blobs at once, you need to orchestrate multiple copy operations. Here is a pattern for copying all blobs from one container to another:

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
from concurrent.futures import ThreadPoolExecutor, as_completed

credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

source_container = blob_service.get_container_client("source")
dest_container = blob_service.get_container_client("destination")

def copy_single_blob(blob_name):
    """Copy a single blob from source to destination container."""
    source_client = source_container.get_blob_client(blob_name)
    dest_client = dest_container.get_blob_client(blob_name)

    # Start the copy
    dest_client.start_copy_from_url(source_client.url)
    return blob_name

# List all blobs in the source container
blobs_to_copy = [b.name for b in source_container.list_blobs()]
print(f"Copying {len(blobs_to_copy)} blobs...")

# Copy in parallel with up to 16 concurrent operations
copied = 0
failed = 0

with ThreadPoolExecutor(max_workers=16) as executor:
    futures = {
        executor.submit(copy_single_blob, name): name
        for name in blobs_to_copy
    }

    for future in as_completed(futures):
        blob_name = futures[future]
        try:
            future.result()
            copied += 1
        except Exception as e:
            print(f"Failed to copy {blob_name}: {e}")
            failed += 1

        if (copied + failed) % 100 == 0:
            print(f"Progress: {copied + failed}/{len(blobs_to_copy)}")

print(f"Complete. Copied: {copied}, Failed: {failed}")
```

## Using AzCopy for Bulk Copies

For production bulk copy operations, AzCopy is more robust than custom code:

```bash
# Copy all blobs from one container to another
# AzCopy handles parallelism, retries, and progress reporting
azcopy copy \
  "https://sourcestorageaccount.blob.core.windows.net/source?{source-sas}" \
  "https://deststorageaccount.blob.core.windows.net/dest?{dest-sas}" \
  --recursive

# Copy only blobs matching a pattern
azcopy copy \
  "https://sourcestorageaccount.blob.core.windows.net/logs/2026/02/*?{sas}" \
  "https://deststorageaccount.blob.core.windows.net/archive/2026/02/?{sas}" \
  --recursive \
  --include-pattern "*.log"
```

## .NET Implementation

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Identity;

var credential = new DefaultAzureCredential();
var sourceService = new BlobServiceClient(
    new Uri("https://sourcestorageaccount.blob.core.windows.net"),
    credential
);
var destService = new BlobServiceClient(
    new Uri("https://deststorageaccount.blob.core.windows.net"),
    credential
);

// Get source and destination blob clients
var sourceBlob = sourceService.GetBlobContainerClient("data")
    .GetBlobClient("report.pdf");
var destBlob = destService.GetBlobContainerClient("archive")
    .GetBlobClient("report.pdf");

// Start the asynchronous copy
// For same-account copies, no SAS token needed
var copyOperation = await destBlob.StartCopyFromUriAsync(sourceBlob.Uri);

// Wait for copy to complete
await copyOperation.WaitForCompletionAsync();
Console.WriteLine("Copy completed");
```

## Key Things to Remember

**Same-account copies are fast**: Copying within the same storage account is nearly instantaneous for small blobs because the data does not move physically - just the metadata is updated.

**Cross-account copies transfer data**: When you copy between different storage accounts, the data is physically transferred. Cross-region copies are slower due to network distance.

**Permissions matter**: For cross-account copies, the destination service needs read access to the source. This usually means a SAS token on the source blob.

**Copy does not preserve snapshots or versions**: Only the current blob data is copied. Snapshots and version history stay with the source.

**Metadata is preserved**: Blob metadata, HTTP headers (content type, cache control, etc.), and tags are copied along with the data.

**You can abort in-progress copies**: If an asynchronous copy is taking too long or was started by mistake, call `abort_copy()` with the copy ID.

Server-side copy is one of those fundamental operations that shows up in almost every storage workflow - data migration, backup, archival, and content distribution. Getting comfortable with both the synchronous and asynchronous patterns, and knowing when to reach for AzCopy instead of the SDK, will save you considerable time and bandwidth.
