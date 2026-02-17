# How to Fix Slow Azure Blob Storage Upload and Download Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Performance, Upload, Download, Optimization, Networking

Description: Improve Azure Blob Storage upload and download performance with practical techniques for parallel transfers, block sizing, and network optimization.

---

You are uploading a 2GB file to Azure Blob Storage and it takes 20 minutes. Or your application downloads hundreds of small files and each one takes a second. Azure Blob Storage can handle massive throughput, but you need to use it correctly to get that performance. The default settings in most SDKs and tools are conservative, and small changes can make a dramatic difference.

This post covers the most impactful optimizations for both upload and download performance.

## Understanding Blob Storage Performance Limits

Before optimizing, know the limits you are working with:

- A single blob can handle up to 60 MiB/s for reads and writes
- A single storage account can handle 20 Gbps ingress and 50 Gbps egress (standard)
- Premium block blob storage accounts offer higher IOPS and lower latency
- Block blobs can be up to 190.7 TiB with blocks up to 4000 MiB each

If you are not hitting these limits, the bottleneck is likely in your code, network configuration, or transfer strategy.

## Optimization 1: Use Parallel Transfers

The single biggest performance improvement comes from parallel uploads and downloads. Instead of uploading a file as a single stream, break it into blocks and upload them concurrently.

### .NET SDK Example

```csharp
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

// Configure transfer options for maximum throughput
var options = new BlobUploadOptions
{
    TransferOptions = new StorageTransferOptions
    {
        // Upload in 8 MiB blocks
        MaximumTransferSize = 8 * 1024 * 1024,

        // Start transferring when we have 4 MiB buffered
        InitialTransferSize = 4 * 1024 * 1024,

        // Upload 8 blocks in parallel
        MaximumConcurrency = 8
    }
};

var blobClient = new BlobClient(connectionString, "my-container", "large-file.zip");

// This will automatically split the file into blocks
// and upload them in parallel
await blobClient.UploadAsync("large-file.zip", options);
```

The same approach works for downloads:

```csharp
var downloadOptions = new BlobDownloadToOptions
{
    TransferOptions = new StorageTransferOptions
    {
        MaximumTransferSize = 8 * 1024 * 1024,
        MaximumConcurrency = 8
    }
};

await blobClient.DownloadToAsync("local-file.zip", downloadOptions);
```

### Python SDK Example

```python
from azure.storage.blob import BlobServiceClient

blob_service_client = BlobServiceClient.from_connection_string(conn_str)
blob_client = blob_service_client.get_blob_client("my-container", "large-file.zip")

# Upload with parallel transfers
# max_concurrency controls parallel block uploads
# max_block_size controls the size of each block
with open("large-file.zip", "rb") as data:
    blob_client.upload_blob(
        data,
        max_concurrency=8,        # 8 parallel uploads
        max_block_size=8*1024*1024, # 8 MiB blocks
        overwrite=True
    )
```

### AzCopy (Fastest for Bulk Transfers)

For the best raw performance, use AzCopy. It is Microsoft's purpose-built data transfer tool and handles parallelism, retries, and block management automatically.

```bash
# Upload a large file with AzCopy
# AzCopy automatically tunes parallelism based on system resources
azcopy copy "large-file.zip" "https://mystorageaccount.blob.core.windows.net/my-container/large-file.zip?<SAS-token>"

# Upload an entire directory
azcopy copy "./data-directory" "https://mystorageaccount.blob.core.windows.net/my-container?<SAS-token>" --recursive

# Tune the concurrency level (default is based on CPU cores)
# Increase for high-bandwidth connections
AZCOPY_CONCURRENCY_VALUE=32 azcopy copy "large-file.zip" "https://mystorageaccount.blob.core.windows.net/my-container/large-file.zip?<SAS-token>"
```

## Optimization 2: Choose the Right Block Size

Block size affects both parallelism and overhead. Smaller blocks mean more parallel transfers but more HTTP overhead. Larger blocks mean less overhead but less parallelism.

General guidelines:

- **Files under 256 MiB**: Upload as a single put (no blocks needed)
- **Files 256 MiB to 4 GiB**: Use 4-8 MiB blocks
- **Files over 4 GiB**: Use 16-100 MiB blocks
- **Very large files (100+ GiB)**: Use 100 MiB blocks with high concurrency

```csharp
// Dynamically choose block size based on file size
long fileSize = new FileInfo(filePath).Length;
int blockSize;

if (fileSize < 256 * 1024 * 1024)
{
    blockSize = 4 * 1024 * 1024;  // 4 MiB for smaller files
}
else if (fileSize < 4L * 1024 * 1024 * 1024)
{
    blockSize = 8 * 1024 * 1024;  // 8 MiB for medium files
}
else
{
    blockSize = 100 * 1024 * 1024; // 100 MiB for large files
}

var options = new BlobUploadOptions
{
    TransferOptions = new StorageTransferOptions
    {
        MaximumTransferSize = blockSize,
        MaximumConcurrency = 16
    }
};
```

## Optimization 3: Use the Right Storage Account Type

Standard storage accounts have lower IOPS and throughput compared to premium accounts.

- **Standard (HDD-backed)**: Good for archival, infrequent access
- **Premium block blob**: Low latency, high IOPS, ideal for application workloads
- **Premium page blob**: Best for VM disks

If your application requires consistent low-latency access to blobs, consider premium block blob storage.

```bash
# Create a premium block blob storage account
az storage account create \
  --resource-group my-rg \
  --name mypremiumstorage \
  --location eastus \
  --sku Premium_LRS \
  --kind BlockBlobStorage
```

## Optimization 4: Co-locate Your Application and Storage

Network latency between your application and storage account matters. If your application runs in East US but your storage account is in West Europe, every request adds 80-100ms of round-trip latency.

```bash
# Check the location of your storage account
az storage account show \
  --name mystorageaccount \
  --query "primaryLocation" \
  --output tsv

# Make sure it matches your application's region
```

For applications running in Azure (App Service, VMs, AKS), always deploy the storage account in the same region.

For multi-region applications, use Azure Blob Storage geo-replication with read-access (RA-GRS or RA-GZRS) and point readers to the secondary endpoint in the nearest region.

## Optimization 5: Use Private Endpoints

When your application and storage account are in the same region but connected over the public internet, traffic goes out to the internet and back. Private endpoints keep traffic on the Azure backbone network, which reduces latency and increases throughput.

```bash
# Create a private endpoint for blob storage
az network private-endpoint create \
  --resource-group my-rg \
  --name storage-pe \
  --vnet-name my-vnet \
  --subnet pe-subnet \
  --private-connection-resource-id "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --group-id blob \
  --connection-name blob-connection
```

## Optimization 6: Handle Small Files Efficiently

If you are uploading or downloading thousands of small files, the HTTP request overhead dominates. Each request has connection setup, TLS negotiation, and header processing.

Strategies for small file workloads:

**Batch operations**: Upload small files concurrently using a thread pool.

```python
import concurrent.futures
from azure.storage.blob import BlobServiceClient

blob_service = BlobServiceClient.from_connection_string(conn_str)
container = blob_service.get_container_client("my-container")

def upload_file(file_path):
    """Upload a single file to blob storage."""
    blob_name = os.path.basename(file_path)
    blob_client = container.get_blob_client(blob_name)
    with open(file_path, "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    return blob_name

# Upload 100 files in parallel using a thread pool
files = [f"data/file_{i}.json" for i in range(100)]
with concurrent.futures.ThreadPoolExecutor(max_workers=32) as executor:
    results = list(executor.map(upload_file, files))
```

**Zip and upload**: If the files are always used together, compress them into an archive and upload a single blob.

**Use HTTP/2**: Modern Azure Storage SDKs support HTTP/2, which multiplexes multiple requests over a single connection. Make sure your SDK version supports it.

## Optimization 7: Enable Client-Side Caching

For read-heavy workloads, cache blob content locally to avoid repeated downloads.

```csharp
// Use Azure CDN for public content
// For private content, implement a local cache
public class BlobCache
{
    private readonly MemoryCache _cache = new MemoryCache(new MemoryCacheOptions());
    private readonly BlobContainerClient _container;

    public async Task<byte[]> GetBlobAsync(string blobName)
    {
        // Check cache first
        if (_cache.TryGetValue(blobName, out byte[] cached))
        {
            return cached;
        }

        // Download from storage
        var blob = _container.GetBlobClient(blobName);
        var response = await blob.DownloadContentAsync();
        var content = response.Value.Content.ToArray();

        // Cache for 5 minutes
        _cache.Set(blobName, content, TimeSpan.FromMinutes(5));
        return content;
    }
}
```

For static content served to end users, put Azure CDN in front of your blob storage. CDN caches content at edge locations worldwide, reducing both latency and storage egress costs.

## Monitoring Performance

Use Azure Monitor to track storage performance metrics:

```bash
# Check storage account latency metrics
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --metric "SuccessE2ELatency" "SuccessServerLatency" \
  --interval PT1H \
  --output table
```

The difference between E2E latency (includes network) and server latency (just Azure processing) tells you how much time is spent on the network. If E2E latency is much higher than server latency, focus on network optimization (co-location, private endpoints). If server latency is high, the storage account might be throttled.

## Quick Wins Summary

If you need faster transfers right now, here are the highest-impact changes in priority order:

1. Increase parallelism (MaximumConcurrency) to 8-16
2. Use appropriate block sizes based on file size
3. Co-locate application and storage in the same region
4. Switch to AzCopy for large bulk transfers
5. Use private endpoints for Azure-to-Azure traffic
6. Consider premium storage for latency-sensitive workloads

Blob storage performance is rarely limited by Azure itself. It is almost always about how you use the APIs. Parallel transfers with the right block size can easily turn a 20-minute upload into a 2-minute one.
