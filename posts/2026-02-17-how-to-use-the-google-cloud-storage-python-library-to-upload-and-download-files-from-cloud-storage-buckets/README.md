# How to Use the google-cloud-storage Python Library to Upload and Download Files from Cloud Storage Buckets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Storage, Python, google-cloud-storage, Google Cloud SDK

Description: Learn how to use the google-cloud-storage Python library to upload, download, list, and manage files in GCP Cloud Storage buckets with practical code examples.

---

Cloud Storage is one of the most used GCP services, and the Python client library makes working with it straightforward. Whether you are uploading user files, processing data pipelines, or managing backups, the google-cloud-storage library handles the HTTP details and lets you focus on your application logic.

This post covers the practical operations you will use most: uploading files, downloading files, listing objects, managing metadata, and handling large files with resumable uploads.

## Installation and Setup

Install the library:

```bash
# Install the Google Cloud Storage Python library
pip install google-cloud-storage
```

Make sure you have authentication configured. For local development, the easiest option is Application Default Credentials:

```bash
# Set up ADC for local development
gcloud auth application-default login
```

## Basic Client Setup

```python
# Initialize the Cloud Storage client
from google.cloud import storage

# Uses ADC automatically
client = storage.Client()

# Or specify a project explicitly
client = storage.Client(project='my-project')
```

## Uploading Files

### Upload a Local File

```python
# Upload a file from the local filesystem to Cloud Storage
from google.cloud import storage

def upload_file(bucket_name, source_file_path, destination_blob_name):
    """Upload a file to a Cloud Storage bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Upload the file
    blob.upload_from_filename(source_file_path)

    print(f"File {source_file_path} uploaded to gs://{bucket_name}/{destination_blob_name}")

# Usage
upload_file(
    bucket_name="my-data-bucket",
    source_file_path="./reports/monthly-report.pdf",
    destination_blob_name="reports/2026/02/monthly-report.pdf"
)
```

### Upload from a String

```python
# Upload string content directly to Cloud Storage
def upload_string(bucket_name, content, destination_blob_name, content_type="text/plain"):
    """Upload a string as a file to Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Upload string content
    blob.upload_from_string(content, content_type=content_type)

    print(f"Content uploaded to gs://{bucket_name}/{destination_blob_name}")

# Upload JSON data
import json
data = {"users": [{"name": "Alice", "role": "admin"}, {"name": "Bob", "role": "viewer"}]}
upload_string(
    bucket_name="my-data-bucket",
    content=json.dumps(data, indent=2),
    destination_blob_name="config/users.json",
    content_type="application/json"
)
```

### Upload from a File Object

```python
# Upload from a file-like object (useful for in-memory data)
import io
from google.cloud import storage

def upload_from_memory(bucket_name, data_bytes, destination_blob_name):
    """Upload bytes from memory to Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Create a file-like object from bytes
    file_obj = io.BytesIO(data_bytes)
    blob.upload_from_file(file_obj)

    print(f"Data uploaded to gs://{bucket_name}/{destination_blob_name}")

# Upload a CSV generated in memory
import csv
output = io.StringIO()
writer = csv.writer(output)
writer.writerow(["name", "email", "created"])
writer.writerow(["Alice", "alice@example.com", "2026-02-17"])
writer.writerow(["Bob", "bob@example.com", "2026-02-17"])

upload_from_memory(
    bucket_name="my-data-bucket",
    data_bytes=output.getvalue().encode("utf-8"),
    destination_blob_name="exports/users.csv"
)
```

## Downloading Files

### Download to Local File

```python
# Download a file from Cloud Storage to the local filesystem
def download_file(bucket_name, source_blob_name, destination_file_path):
    """Download a file from Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    # Download the file
    blob.download_to_filename(destination_file_path)

    print(f"File gs://{bucket_name}/{source_blob_name} downloaded to {destination_file_path}")

# Usage
download_file(
    bucket_name="my-data-bucket",
    source_blob_name="reports/2026/02/monthly-report.pdf",
    destination_file_path="./downloaded-report.pdf"
)
```

### Download to Memory

```python
# Download file content directly into memory as bytes
def download_to_memory(bucket_name, source_blob_name):
    """Download a file from Cloud Storage into memory."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    # Download as bytes
    content = blob.download_as_bytes()
    return content

# Download and parse JSON
content = download_to_memory("my-data-bucket", "config/users.json")
data = json.loads(content.decode("utf-8"))
print(f"Found {len(data['users'])} users")
```

### Download as Text

```python
# Download file content as a string
def download_as_text(bucket_name, source_blob_name):
    """Download a text file from Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    # Download as text string
    return blob.download_as_text()

# Usage
csv_content = download_as_text("my-data-bucket", "exports/users.csv")
print(csv_content)
```

## Listing Objects

### List All Objects in a Bucket

```python
# List all objects in a bucket
def list_objects(bucket_name, prefix=None):
    """List objects in a Cloud Storage bucket, optionally filtered by prefix."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List blobs with optional prefix filter
    blobs = bucket.list_blobs(prefix=prefix)

    for blob in blobs:
        print(f"{blob.name} ({blob.size} bytes, updated {blob.updated})")

# List all objects
list_objects("my-data-bucket")

# List objects under a specific "directory"
list_objects("my-data-bucket", prefix="reports/2026/")
```

### List with Pagination

For buckets with many objects, use pagination to avoid loading everything into memory:

```python
# List objects with pagination for large buckets
def list_objects_paginated(bucket_name, prefix=None, page_size=100):
    """List objects with pagination."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # Use max_results to control page size
    pages = bucket.list_blobs(prefix=prefix, max_results=page_size).pages

    total = 0
    for page in pages:
        for blob in page:
            print(f"{blob.name}")
            total += 1
        print(f"--- Page complete ({total} objects so far) ---")

    print(f"Total objects: {total}")
```

## Managing Object Metadata

### Set Custom Metadata

```python
# Set custom metadata on an uploaded file
def upload_with_metadata(bucket_name, source_path, dest_name, metadata):
    """Upload a file with custom metadata."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(dest_name)

    # Set metadata before uploading
    blob.metadata = metadata
    blob.upload_from_filename(source_path)

    print(f"Uploaded with metadata: {metadata}")

# Usage - track who uploaded the file and when
upload_with_metadata(
    bucket_name="my-data-bucket",
    source_path="./data.csv",
    dest_name="imports/data.csv",
    metadata={
        "uploaded-by": "data-pipeline-v2",
        "source-system": "analytics-db",
        "row-count": "15000"
    }
)
```

### Read Metadata

```python
# Read metadata from an existing object
def get_metadata(bucket_name, blob_name):
    """Get metadata for a Cloud Storage object."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.get_blob(blob_name)

    if blob is None:
        print(f"Object {blob_name} not found")
        return None

    print(f"Name: {blob.name}")
    print(f"Size: {blob.size} bytes")
    print(f"Content type: {blob.content_type}")
    print(f"Created: {blob.time_created}")
    print(f"Updated: {blob.updated}")
    print(f"Custom metadata: {blob.metadata}")

    return blob

get_metadata("my-data-bucket", "imports/data.csv")
```

## Handling Large Files

For files over 5MB, use resumable uploads. The library handles this automatically for `upload_from_filename`, but you can configure it explicitly:

```python
# Upload a large file with progress tracking
def upload_large_file(bucket_name, source_path, dest_name):
    """Upload a large file with chunked resumable upload."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(dest_name)

    # Set chunk size for resumable upload (must be multiple of 256KB)
    # 10MB chunks work well for most connections
    blob.chunk_size = 10 * 1024 * 1024  # 10 MB

    blob.upload_from_filename(source_path)
    print(f"Large file uploaded: {dest_name}")

upload_large_file("my-data-bucket", "./large-dataset.parquet", "datasets/large-dataset.parquet")
```

## Deleting Objects

```python
# Delete a single object
def delete_object(bucket_name, blob_name):
    """Delete an object from Cloud Storage."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    blob.delete()
    print(f"Deleted gs://{bucket_name}/{blob_name}")

# Delete multiple objects with a prefix
def delete_objects_with_prefix(bucket_name, prefix):
    """Delete all objects matching a prefix."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blobs = bucket.list_blobs(prefix=prefix)

    count = 0
    for blob in blobs:
        blob.delete()
        count += 1

    print(f"Deleted {count} objects with prefix '{prefix}'")
```

## Generating Signed URLs

For temporary access without requiring GCP credentials:

```python
# Generate a signed URL for temporary access
from datetime import timedelta

def generate_signed_url(bucket_name, blob_name, expiration_minutes=60):
    """Generate a signed URL for temporary file access."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Generate a URL that expires after the specified duration
    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(minutes=expiration_minutes),
        method="GET"
    )

    print(f"Signed URL (expires in {expiration_minutes} min):")
    print(url)
    return url

generate_signed_url("my-data-bucket", "reports/2026/02/monthly-report.pdf")
```

## Error Handling

```python
# Proper error handling for Cloud Storage operations
from google.cloud import storage
from google.api_core import exceptions

def safe_download(bucket_name, blob_name):
    """Download with proper error handling."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    try:
        content = blob.download_as_text()
        return content
    except exceptions.NotFound:
        print(f"Object {blob_name} does not exist in {bucket_name}")
        return None
    except exceptions.Forbidden:
        print(f"Access denied to {blob_name} in {bucket_name}")
        return None
    except exceptions.TooManyRequests:
        print("Rate limited - retry with backoff")
        return None
```

## Summary

The google-cloud-storage Python library provides a clean interface for all Cloud Storage operations. Use `upload_from_filename` for local files, `upload_from_string` for in-memory data, and `download_as_text` or `download_as_bytes` for retrieval. For large files, the library automatically uses resumable uploads. Always handle errors for NotFound and Forbidden cases, and use signed URLs when you need to share temporary access with external users or systems.
