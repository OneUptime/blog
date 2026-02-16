# How to Optimize Azure Blob Storage Performance for Large File Uploads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Performance, Large Files, Upload Optimization, Cloud Storage, Azure SDK

Description: Practical techniques to speed up large file uploads to Azure Blob Storage including parallel uploads, block sizing, and network tuning.

---

Uploading large files to Azure Blob Storage is one of those tasks that seems simple at first but quickly becomes a performance headache when you are dealing with files measured in gigabytes. The default upload path works fine for small files, but when you need to push a 50 GB database backup or a batch of video files, you need to be deliberate about how you structure the upload. This post covers the concrete techniques that make a real difference.

## How Azure Blob Storage Handles Large Uploads

Azure Blob Storage offers three blob types: block blobs, append blobs, and page blobs. For large file uploads, block blobs are almost always the right choice. They support a maximum size of approximately 190.7 TiB (with the latest API versions) and are designed to be uploaded in chunks called blocks.

The upload process for a block blob works like this:

1. The client splits the file into blocks
2. Each block is uploaded independently via a Put Block call
3. After all blocks are uploaded, a Put Block List call commits them into the final blob

This architecture is what enables parallel uploads, resumable uploads, and efficient handling of large files.

## Choosing the Right Block Size

Block size is the single biggest performance lever you have. Azure allows blocks up to 4000 MiB each, and a blob can have up to 50,000 blocks. The Azure SDKs default to a certain block size, but tuning it for your workload makes a noticeable difference.

Here are some practical guidelines:

| File Size | Recommended Block Size | Number of Blocks |
|-----------|----------------------|------------------|
| Up to 256 MB | 4 MB (SDK default) | Up to 64 |
| 256 MB - 1 GB | 8-16 MB | 16-128 |
| 1 GB - 10 GB | 32-64 MB | 16-320 |
| 10 GB - 100 GB | 100-256 MB | 40-1000 |
| 100 GB+ | 256-4000 MB | Varies |

Larger blocks mean fewer HTTP requests, which reduces overhead. But blocks that are too large mean a single failure requires re-uploading more data. I have found 64 MB to be a good sweet spot for most workloads in the 1-10 GB range.

## Parallel Upload with the Azure SDK

The Azure Storage SDKs support parallel block uploads out of the box. You just need to configure the concurrency settings.

Here is a Python example that uploads a large file with tuned parallelism and block size:

```python
from azure.storage.blob import BlobServiceClient, ContentSettings
from azure.identity import DefaultAzureCredential
import os

credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    account_url="https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

container_client = blob_service.get_container_client("large-files")
blob_client = container_client.get_blob_client("backup-2026-02-16.tar.gz")

file_path = "/data/backup-2026-02-16.tar.gz"
file_size = os.path.getsize(file_path)

# Calculate block size based on file size
# Using 64 MB blocks for files over 1 GB, 8 MB for smaller files
if file_size > 1 * 1024 * 1024 * 1024:
    block_size = 64 * 1024 * 1024   # 64 MB blocks
    max_concurrency = 8              # 8 parallel uploads
else:
    block_size = 8 * 1024 * 1024    # 8 MB blocks
    max_concurrency = 4              # 4 parallel uploads

# Upload the file with configured parallelism
with open(file_path, "rb") as data:
    blob_client.upload_blob(
        data,
        overwrite=True,
        max_block_size=block_size,
        max_concurrency=max_concurrency,
        content_settings=ContentSettings(
            content_type="application/gzip"
        )
    )
```

The `max_concurrency` parameter controls how many blocks are uploaded in parallel. More concurrency means faster uploads if you have the network bandwidth, but there are diminishing returns. On most network connections, 4-16 concurrent uploads is the effective range.

## .NET SDK Configuration

For .NET applications, the configuration is similar but uses the `StorageTransferOptions` class:

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Identity;

var blobServiceClient = new BlobServiceClient(
    new Uri("https://mystorageaccount.blob.core.windows.net"),
    new DefaultAzureCredential()
);

var containerClient = blobServiceClient.GetBlobContainerClient("large-files");
var blobClient = containerClient.GetBlobClient("backup-2026-02-16.tar.gz");

// Configure transfer options for optimal large file upload
// InitialTransferSize controls the threshold for switching to block upload
var transferOptions = new StorageTransferOptions
{
    MaximumTransferSize = 64 * 1024 * 1024,    // 64 MB per block
    MaximumConcurrency = 8,                     // 8 parallel uploads
    InitialTransferSize = 64 * 1024 * 1024      // Switch to blocks above 64 MB
};

await blobClient.UploadAsync(
    "/data/backup-2026-02-16.tar.gz",
    new BlobUploadOptions
    {
        TransferOptions = transferOptions,
        HttpHeaders = new BlobHttpHeaders
        {
            ContentType = "application/gzip"
        }
    }
);
```

## Network-Level Optimizations

The SDK settings only help if your network can keep up. Here are the infrastructure-level changes that matter.

### Use AzCopy for Bulk Transfers

AzCopy is Microsoft's command-line tool specifically built for high-performance data transfers. It handles parallelism, retries, and block management internally and is often faster than custom SDK code.

```bash
# Upload a large file with AzCopy
# AZCOPY_CONCURRENCY_VALUE controls the parallelism level
export AZCOPY_CONCURRENCY_VALUE=16

azcopy copy "/data/backup-2026-02-16.tar.gz" \
  "https://mystorageaccount.blob.core.windows.net/large-files/backup-2026-02-16.tar.gz" \
  --block-size-mb 64 \
  --put-md5
```

AzCopy automatically tunes itself based on machine resources and network conditions, making it a solid default choice for scheduled bulk uploads.

### Use Accelerated Networking on Azure VMs

If you are uploading from an Azure VM, make sure Accelerated Networking is enabled on the VM's network interface. This bypasses the host's software network stack and gives you significantly lower latency and higher throughput.

### Choose the Right VM Size

Network bandwidth is tied to VM size in Azure. A Standard_D4s_v3 has a maximum network bandwidth of 8 Gbps, while a Standard_D16s_v3 gets up to 12 Gbps. If upload speed is critical, pick a VM size with adequate network bandwidth.

### Use Azure ExpressRoute or Private Endpoints

For on-premises uploads, using ExpressRoute instead of the public internet gives you dedicated bandwidth without the variability of internet routing. Private Endpoints keep the traffic on the Microsoft backbone network even if you are not using ExpressRoute.

## Implementing Resumable Uploads

For very large files, you need the ability to resume an upload that was interrupted. Block blobs support this naturally since each block is uploaded independently.

```python
import os
import math
import hashlib
from azure.storage.blob import BlobServiceClient, BlobBlock

def resumable_upload(blob_client, file_path, block_size=64*1024*1024):
    """Upload a large file with resume capability.
    Tracks uploaded blocks so interrupted uploads can continue."""

    file_size = os.path.getsize(file_path)
    total_blocks = math.ceil(file_size / block_size)

    # Check which blocks have already been uploaded
    try:
        block_list = blob_client.get_block_list(block_list_type="uncommitted")
        uploaded_ids = {b.id for b in block_list.uncommitted_blocks}
    except Exception:
        uploaded_ids = set()

    block_ids = []

    with open(file_path, "rb") as f:
        for i in range(total_blocks):
            # Generate a deterministic block ID based on the index
            block_id = hashlib.md5(f"block-{i:06d}".encode()).hexdigest()
            block_ids.append(block_id)

            if block_id in uploaded_ids:
                # Block already uploaded, skip it
                f.seek(block_size, 1)
                print(f"Block {i+1}/{total_blocks} already uploaded, skipping")
                continue

            data = f.read(block_size)
            blob_client.stage_block(block_id=block_id, data=data)
            print(f"Uploaded block {i+1}/{total_blocks}")

    # Commit all blocks into the final blob
    blob_client.commit_block_list(
        [BlobBlock(block_id=bid) for bid in block_ids]
    )
    print("Upload complete")
```

This approach checks which blocks have already been staged before uploading, so if the process crashes halfway through, you can restart and only upload the remaining blocks.

## Monitoring Upload Performance

Track your upload performance so you can identify bottlenecks. Azure Storage metrics show you:

- **Ingress**: Total bytes uploaded per time period
- **Success E2E Latency**: Round-trip time for storage operations
- **Transactions**: Number of API calls

You can query these metrics with Azure CLI:

```bash
# Check ingress metrics for the last hour
# This shows the total data uploaded in bytes
az monitor metrics list \
  --resource "/subscriptions/{sub}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --metric "Ingress" \
  --interval PT1M \
  --start-time 2026-02-16T10:00:00Z \
  --end-time 2026-02-16T11:00:00Z
```

## Quick Wins Checklist

If you are in a hurry and just need to speed things up, here is the short list:

1. Increase the block size to at least 32 MB for files over 500 MB
2. Set max concurrency to 8 or higher
3. Use AzCopy instead of custom code for one-off transfers
4. Upload from the same Azure region as your storage account
5. Enable Accelerated Networking if uploading from Azure VMs
6. Compress files before uploading to reduce total transfer size
7. Use the latest version of the Azure SDK, as performance improvements ship regularly

These changes alone can turn a 2-hour upload into a 15-minute one. The specifics depend on your file sizes, network bandwidth, and how far you are from the Azure region, but the principles hold across the board. Start with block size and concurrency tuning, and go from there.
