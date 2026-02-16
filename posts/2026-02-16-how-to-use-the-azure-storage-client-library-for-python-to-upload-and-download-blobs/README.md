# How to Use the Azure Storage Client Library for Python to Upload and Download Blobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Python, Blob Storage, Azure SDK, File Upload, File Download, Cloud Development

Description: A practical guide to using the Azure Storage Python SDK to upload, download, list, and manage blobs with real-world code examples.

---

The Azure Storage client library for Python is the primary way Python applications interact with Azure Blob Storage. Whether you are building a web application that stores user uploads, a data pipeline that processes files, or a backup script that archives data to the cloud, this library handles the heavy lifting. This guide walks through the common operations with practical, production-ready code examples.

## Installation

Install the Azure Storage Blob library and the Azure Identity library for authentication:

```bash
# Install the required packages
pip install azure-storage-blob azure-identity
```

The `azure-storage-blob` package provides the storage client. The `azure-identity` package provides `DefaultAzureCredential` for passwordless authentication.

## Authentication

There are several ways to authenticate, but `DefaultAzureCredential` is the recommended approach because it works both locally (using your Azure CLI login) and in production (using managed identities).

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

# Using DefaultAzureCredential (recommended)
# This automatically uses managed identity in Azure, or Azure CLI locally
credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    account_url="https://mystorageaccount.blob.core.windows.net",
    credential=credential
)
```

If you need to use a connection string (for example, in development):

```python
# Using a connection string
# Only use this for local development, never in production
connection_string = "DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=...;EndpointSuffix=core.windows.net"
blob_service = BlobServiceClient.from_connection_string(connection_string)
```

## Container Operations

Before working with blobs, you need a container. Containers are like top-level directories that group related blobs.

```python
# Create a container
container_client = blob_service.create_container("my-data")

# Create a container if it does not already exist
container_client = blob_service.get_container_client("my-data")
try:
    container_client.create_container()
except Exception:
    pass  # Container already exists

# List all containers in the storage account
for container in blob_service.list_containers():
    print(f"Container: {container.name}, Last Modified: {container.last_modified}")

# Delete a container
blob_service.delete_container("old-data")
```

## Uploading Blobs

### Upload from a File

The most common operation - uploading a local file to blob storage:

```python
from azure.storage.blob import ContentSettings

container_client = blob_service.get_container_client("my-data")

# Upload a file with automatic content type detection
def upload_file(local_path, blob_name, content_type=None):
    """Upload a local file to blob storage.

    Args:
        local_path: Path to the local file
        blob_name: Name for the blob in storage
        content_type: Optional MIME type (auto-detected if not provided)
    """
    blob_client = container_client.get_blob_client(blob_name)

    # Set content type for proper browser handling
    settings = ContentSettings(content_type=content_type) if content_type else None

    with open(local_path, "rb") as data:
        blob_client.upload_blob(
            data,
            overwrite=True,
            content_settings=settings
        )

    print(f"Uploaded {local_path} to {blob_name}")
    return blob_client.url

# Upload different file types
upload_file("report.pdf", "reports/2026/february.pdf", "application/pdf")
upload_file("data.csv", "data/customers.csv", "text/csv")
upload_file("photo.jpg", "images/profile.jpg", "image/jpeg")
```

### Upload from Bytes or String

```python
# Upload a string as a blob
text_content = "Hello, Azure Storage!"
blob_client = container_client.get_blob_client("messages/greeting.txt")
blob_client.upload_blob(
    text_content.encode("utf-8"),
    overwrite=True,
    content_settings=ContentSettings(content_type="text/plain")
)

# Upload JSON data
import json

data = {"name": "Azure", "type": "Cloud Platform", "year": 2026}
blob_client = container_client.get_blob_client("config/settings.json")
blob_client.upload_blob(
    json.dumps(data, indent=2).encode("utf-8"),
    overwrite=True,
    content_settings=ContentSettings(content_type="application/json")
)
```

### Upload a Large File with Progress Tracking

```python
import os

def upload_with_progress(local_path, blob_name, block_size=4*1024*1024):
    """Upload a large file with progress reporting.

    Args:
        local_path: Path to the local file
        blob_name: Destination blob name
        block_size: Size of each upload chunk (default 4 MB)
    """
    file_size = os.path.getsize(local_path)
    uploaded = 0

    def progress_callback(response):
        nonlocal uploaded
        # Each callback represents a completed chunk
        current = response.context.get("upload_stream_current", 0)
        if current > uploaded:
            uploaded = current
            pct = (uploaded / file_size) * 100
            print(f"Progress: {pct:.1f}% ({uploaded / (1024*1024):.1f} MB / {file_size / (1024*1024):.1f} MB)")

    blob_client = container_client.get_blob_client(blob_name)
    with open(local_path, "rb") as data:
        blob_client.upload_blob(
            data,
            overwrite=True,
            max_block_size=block_size,
            max_concurrency=4,
            raw_response_hook=progress_callback
        )

    print(f"Upload complete: {blob_name}")

upload_with_progress("/data/large-dataset.tar.gz", "datasets/large-dataset.tar.gz")
```

## Downloading Blobs

### Download to a File

```python
def download_file(blob_name, local_path):
    """Download a blob to a local file.

    Args:
        blob_name: Name of the blob to download
        local_path: Local file path to save to
    """
    blob_client = container_client.get_blob_client(blob_name)

    # Ensure the local directory exists
    os.makedirs(os.path.dirname(local_path), exist_ok=True)

    with open(local_path, "wb") as f:
        download = blob_client.download_blob()
        download.readinto(f)

    print(f"Downloaded {blob_name} to {local_path}")

download_file("reports/2026/february.pdf", "/tmp/february-report.pdf")
```

### Download to Memory

```python
# Download a small blob into memory
blob_client = container_client.get_blob_client("config/settings.json")
download = blob_client.download_blob()
content = download.readall()

# Parse JSON content
settings = json.loads(content.decode("utf-8"))
print(f"Settings: {settings}")
```

### Stream a Large Blob in Chunks

For large blobs that do not fit in memory:

```python
def process_blob_in_chunks(blob_name, chunk_size=8*1024*1024):
    """Process a large blob by reading it in chunks.

    Args:
        blob_name: Name of the blob
        chunk_size: Size of each chunk to read (default 8 MB)
    """
    blob_client = container_client.get_blob_client(blob_name)
    download = blob_client.download_blob()

    total_bytes = 0
    for chunk in download.chunks():
        # Process each chunk
        total_bytes += len(chunk)
        # Example: write to a local file, parse CSV lines, etc.

    print(f"Processed {total_bytes / (1024*1024):.1f} MB")

process_blob_in_chunks("datasets/large-dataset.tar.gz")
```

### Download a Specific Range

```python
# Download only the first 1 KB of a blob (useful for previewing files)
blob_client = container_client.get_blob_client("data/large-file.csv")
download = blob_client.download_blob(offset=0, length=1024)
header = download.readall().decode("utf-8")
print(f"First 1 KB:\n{header}")
```

## Listing Blobs

### List All Blobs in a Container

```python
# List all blobs with their properties
for blob in container_client.list_blobs():
    size_kb = blob.size / 1024
    print(f"{blob.name} - {size_kb:.1f} KB - {blob.content_settings.content_type}")
```

### List Blobs with a Prefix (Virtual Directory)

```python
# List blobs under a specific "directory"
# Azure Blob Storage uses flat naming, so directories are virtual
for blob in container_client.list_blobs(name_starts_with="reports/2026/"):
    print(f"{blob.name} - {blob.last_modified}")
```

### Walk Virtual Directories

```python
# List only the immediate "subdirectories" and blobs at a level
# walk_blobs returns BlobPrefix objects for subdirectories
for item in container_client.walk_blobs(name_starts_with="data/", delimiter="/"):
    if hasattr(item, "prefix"):
        # This is a virtual directory
        print(f"Directory: {item.prefix}")
    else:
        # This is a blob
        print(f"Blob: {item.name}")
```

## Blob Properties and Metadata

```python
# Get blob properties
blob_client = container_client.get_blob_client("reports/2026/february.pdf")
properties = blob_client.get_blob_properties()

print(f"Name: {properties.name}")
print(f"Size: {properties.size} bytes")
print(f"Content Type: {properties.content_settings.content_type}")
print(f"Created: {properties.creation_time}")
print(f"Last Modified: {properties.last_modified}")
print(f"Access Tier: {properties.blob_tier}")
print(f"ETag: {properties.etag}")

# Set custom metadata on a blob
blob_client.set_blob_metadata({
    "author": "engineering-team",
    "department": "analytics",
    "reviewed": "true"
})

# Read metadata back
properties = blob_client.get_blob_properties()
print(f"Metadata: {properties.metadata}")
```

## Deleting Blobs

```python
# Delete a single blob
blob_client = container_client.get_blob_client("old-file.txt")
blob_client.delete_blob()

# Delete with soft delete snapshot preservation
blob_client.delete_blob(delete_snapshots="include")

# Batch delete blobs matching a pattern
deleted_count = 0
for blob in container_client.list_blobs(name_starts_with="temp/"):
    container_client.delete_blob(blob.name)
    deleted_count += 1

print(f"Deleted {deleted_count} blobs")
```

## Generating SAS URLs

```python
from azure.storage.blob import BlobSasPermissions, generate_blob_sas
from datetime import datetime, timezone, timedelta

# Generate a read-only SAS URL valid for 1 hour
sas_token = generate_blob_sas(
    account_name="mystorageaccount",
    container_name="my-data",
    blob_name="reports/2026/february.pdf",
    account_key="your-account-key",
    permission=BlobSasPermissions(read=True),
    expiry=datetime.now(timezone.utc) + timedelta(hours=1)
)

sas_url = f"https://mystorageaccount.blob.core.windows.net/my-data/reports/2026/february.pdf?{sas_token}"
print(f"Shareable URL (valid 1 hour): {sas_url}")
```

## Error Handling

Always handle common exceptions:

```python
from azure.core.exceptions import ResourceNotFoundError, ResourceExistsError, HttpResponseError

try:
    blob_client = container_client.get_blob_client("nonexistent.txt")
    blob_client.download_blob().readall()
except ResourceNotFoundError:
    print("Blob does not exist")
except HttpResponseError as e:
    if e.status_code == 403:
        print("Access denied - check your permissions")
    elif e.status_code == 409:
        print("Conflict - blob may be leased")
    else:
        print(f"Storage error: {e.message}")
```

The Azure Storage Python SDK is well-designed and covers everything from simple uploads to complex multi-part operations. Start with `DefaultAzureCredential` and the basic upload/download patterns, and layer on more advanced features as your application grows. The key is to get comfortable with the `BlobServiceClient`, `ContainerClient`, and `BlobClient` hierarchy - once you understand that, everything else follows naturally.
