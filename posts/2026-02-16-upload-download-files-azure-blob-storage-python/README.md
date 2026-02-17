# How to Upload and Download Files from Azure Blob Storage Using azure-storage-blob in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Python, Cloud Storage, azure-storage-blob, File Upload, SDK

Description: A practical guide to uploading and downloading files from Azure Blob Storage using the azure-storage-blob Python SDK with real code examples.

---

Azure Blob Storage is the go-to object storage service on Azure. Whether you are storing images, log files, backups, or datasets, Blob Storage handles it at scale. The azure-storage-blob Python SDK makes interacting with it straightforward, and in this post I will cover everything from basic uploads and downloads to more advanced patterns like streaming and SAS tokens.

## Setting Up

First, install the required packages. I will also include azure-identity since that is the recommended way to authenticate.

```bash
# Install blob storage SDK and identity library
pip install azure-storage-blob azure-identity
```

You also need a storage account. If you do not have one yet, create it through the Azure CLI.

```bash
# Create a resource group and storage account
az group create --name my-rg --location eastus
az storage account create \
    --name mystorageacct \
    --resource-group my-rg \
    --location eastus \
    --sku Standard_LRS
```

## Connecting to Blob Storage

There are two main ways to connect: using a connection string or using DefaultAzureCredential. I strongly recommend the credential approach for anything beyond quick experiments.

```python
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

# Option 1: Using DefaultAzureCredential (recommended)
credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    account_url="https://mystorageacct.blob.core.windows.net",
    credential=credential
)

# Option 2: Using a connection string (quick testing only)
# conn_str = "DefaultEndpointsProtocol=https;AccountName=..."
# blob_service = BlobServiceClient.from_connection_string(conn_str)
```

## Creating Containers

Blobs live inside containers. Think of containers as top-level folders. You need at least one container before you can upload anything.

```python
# Create a container for storing uploaded files
container_name = "documents"
container_client = blob_service.create_container(container_name)
print(f"Container '{container_name}' created")
```

If the container might already exist, handle the conflict gracefully.

```python
from azure.core.exceptions import ResourceExistsError

try:
    container_client = blob_service.create_container("documents")
except ResourceExistsError:
    # Container already exists, just get a reference to it
    container_client = blob_service.get_container_client("documents")
    print("Container already exists, using existing one")
```

## Uploading Files

The simplest upload reads a local file and pushes it to Blob Storage.

```python
from azure.storage.blob import BlobServiceClient

# Get a reference to the specific blob (file) you want to create
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="reports/quarterly-report.pdf"
)

# Upload the local file
with open("/path/to/quarterly-report.pdf", "rb") as data:
    blob_client.upload_blob(data, overwrite=True)

print("File uploaded successfully")
```

Notice the `overwrite=True` parameter. Without it, uploading to an existing blob name raises an error. Depending on your use case, you might want that safety net or you might want to overwrite silently.

## Uploading Text and JSON Data

You do not need a file on disk. You can upload strings or bytes directly.

```python
import json

# Upload a JSON document directly from memory
data = {"users": 1500, "active": 1200, "date": "2026-02-16"}
json_bytes = json.dumps(data).encode("utf-8")

blob_client = blob_service.get_blob_client(
    container="documents",
    blob="metrics/daily-stats.json"
)
blob_client.upload_blob(json_bytes, overwrite=True)
```

## Downloading Files

Downloading works similarly. You get a blob client and call download_blob.

```python
# Download a blob to a local file
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="reports/quarterly-report.pdf"
)

# Download and write to disk
download_stream = blob_client.download_blob()
with open("/tmp/downloaded-report.pdf", "wb") as file:
    file.write(download_stream.readall())

print("File downloaded successfully")
```

For reading text content directly into memory without saving to disk:

```python
# Read blob content directly into a string
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="metrics/daily-stats.json"
)

download_stream = blob_client.download_blob()
content = download_stream.readall().decode("utf-8")
data = json.loads(content)
print(f"Active users: {data['active']}")
```

## Streaming Large Files

For large files, you do not want to load everything into memory at once. The SDK supports chunked downloads.

```python
# Stream a large file in chunks to avoid memory issues
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="backups/large-database-dump.sql"
)

download_stream = blob_client.download_blob()

# Write in 4MB chunks
with open("/tmp/large-file.sql", "wb") as file:
    for chunk in download_stream.chunks():
        file.write(chunk)
```

For uploads, the SDK automatically handles chunking for large files. By default, files over 64MB are split into 4MB blocks and uploaded in parallel.

```python
from azure.storage.blob import BlobClient

# Upload a large file - SDK handles chunking automatically
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="backups/huge-file.tar.gz"
)

with open("/path/to/huge-file.tar.gz", "rb") as data:
    blob_client.upload_blob(
        data,
        overwrite=True,
        max_concurrency=4,  # Number of parallel upload threads
        max_single_put_size=8 * 1024 * 1024  # Use chunking for files over 8MB
    )
```

## Listing Blobs

To see what is in a container, list the blobs.

```python
# List all blobs in a container
container_client = blob_service.get_container_client("documents")

print("Blobs in container:")
for blob in container_client.list_blobs():
    print(f"  {blob.name} - {blob.size} bytes - Last modified: {blob.last_modified}")
```

You can also filter by prefix, which is useful when you organize blobs into virtual directories.

```python
# List only blobs under the "reports/" prefix
for blob in container_client.list_blobs(name_starts_with="reports/"):
    print(f"  {blob.name}")
```

## Setting Blob Metadata and Properties

Blobs can carry metadata - key-value pairs that describe the content.

```python
# Upload with metadata
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="reports/q1-2026.pdf"
)

with open("/path/to/report.pdf", "rb") as data:
    blob_client.upload_blob(
        data,
        overwrite=True,
        metadata={
            "department": "engineering",
            "quarter": "Q1",
            "year": "2026"
        }
    )

# Read metadata back
properties = blob_client.get_blob_properties()
print(f"Metadata: {properties.metadata}")
print(f"Content type: {properties.content_settings.content_type}")
print(f"Size: {properties.size} bytes")
```

## Generating SAS Tokens

Shared Access Signatures (SAS) let you grant temporary, limited access to blobs without sharing your account key. This is perfect for giving users download links that expire.

```python
from datetime import datetime, timedelta, timezone
from azure.storage.blob import (
    BlobServiceClient,
    generate_blob_sas,
    BlobSasPermissions
)

# Generate a SAS token that allows read access for 1 hour
account_name = "mystorageacct"
account_key = "your-account-key"  # Get this from Azure portal or CLI
container_name = "documents"
blob_name = "reports/q1-2026.pdf"

sas_token = generate_blob_sas(
    account_name=account_name,
    container_name=container_name,
    blob_name=blob_name,
    account_key=account_key,
    permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(hours=1)
)

# Build the full URL with SAS token
sas_url = f"https://{account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
print(f"Shareable URL (valid for 1 hour): {sas_url}")
```

## Deleting Blobs

Cleaning up is straightforward.

```python
# Delete a single blob
blob_client = blob_service.get_blob_client(
    container="documents",
    blob="reports/old-report.pdf"
)
blob_client.delete_blob()

# Delete with soft delete (recoverable for a period)
blob_client.delete_blob(delete_snapshots="include")
```

## Copying Blobs

You can copy blobs between containers or even between storage accounts.

```python
# Copy a blob from one container to another
source_blob = blob_service.get_blob_client("documents", "reports/q1-2026.pdf")
dest_blob = blob_service.get_blob_client("archive", "2026/q1-report.pdf")

# Start the copy operation
dest_blob.start_copy_from_url(source_blob.url)
print("Copy started")
```

## Async Operations

For high-throughput applications, the async client avoids blocking your event loop.

```python
import asyncio
from azure.identity.aio import DefaultAzureCredential
from azure.storage.blob.aio import BlobServiceClient

async def upload_async():
    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(
        account_url="https://mystorageacct.blob.core.windows.net",
        credential=credential
    )

    blob_client = blob_service.get_blob_client("documents", "async-test.txt")
    await blob_client.upload_blob(b"Hello from async!", overwrite=True)

    # Always close async clients
    await blob_service.close()
    await credential.close()

asyncio.run(upload_async())
```

## Practical Tips

A few things I have picked up from working with Blob Storage in production:

1. **Use virtual directories.** Blob names like `reports/2026/q1/summary.pdf` make listing and organizing much easier.
2. **Set content types.** When serving files through a CDN or directly, the content type matters. Set it during upload with `content_settings`.
3. **Enable soft delete.** It has saved me more than once from accidental deletions.
4. **Use lifecycle management policies** to automatically move old blobs to cool or archive storage tiers.
5. **Monitor with Azure Monitor.** Track upload/download latency, throttling, and storage capacity.

## Wrapping Up

The azure-storage-blob SDK covers everything you need for file operations in Azure. Whether you are building a simple backup script or a complex data pipeline, the patterns above will get you there. Start with DefaultAzureCredential for authentication, use chunked transfers for large files, and generate SAS tokens when you need to share access temporarily.
