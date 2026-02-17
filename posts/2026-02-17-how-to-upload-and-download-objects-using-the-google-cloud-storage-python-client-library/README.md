# How to Upload and Download Objects Using the Google Cloud Storage Python Client Library

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Python, Client Library, Cloud Development

Description: A developer's guide to uploading and downloading objects in Google Cloud Storage using the Python client library with practical code examples.

---

The Google Cloud Storage Python client library is the go-to tool for Python developers working with GCS. Whether you are building a web application that handles user uploads, a data pipeline that processes files, or a script that backs up data, the library provides a clean API for all common storage operations.

This guide covers uploading and downloading objects with practical, production-ready code examples.

## Installation and Setup

Install the library:

```bash
# Install the Google Cloud Storage Python client library
pip install google-cloud-storage
```

For authentication, the library uses Application Default Credentials. In development, authenticate with:

```bash
# Set up local authentication for development
gcloud auth application-default login
```

In production (Cloud Run, GCE, GKE), credentials are provided automatically by the environment.

## Basic Upload Operations

### Uploading a Local File

The most common operation - uploading a file from disk:

```python
from google.cloud import storage

def upload_file(bucket_name, source_file_path, destination_blob_name):
    """Upload a file to a GCS bucket."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Upload the file from the local filesystem
    blob.upload_from_filename(source_file_path)

    print(f"Uploaded {source_file_path} to gs://{bucket_name}/{destination_blob_name}")

# Usage
upload_file("my-bucket", "/tmp/report.pdf", "reports/2026/february-report.pdf")
```

### Uploading a String

When you have data in memory as a string:

```python
from google.cloud import storage

def upload_string(bucket_name, content, destination_blob_name, content_type="text/plain"):
    """Upload a string directly to GCS without writing to a local file."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Upload string content directly
    blob.upload_from_string(content, content_type=content_type)

    print(f"Uploaded string to gs://{bucket_name}/{destination_blob_name}")

# Upload a JSON string
import json
data = {"users": 150, "timestamp": "2026-02-17T10:00:00Z"}
upload_string("my-bucket", json.dumps(data), "data/stats.json", "application/json")

# Upload a CSV string
csv_data = "name,email,role\nAlice,alice@example.com,admin\nBob,bob@example.com,user"
upload_string("my-bucket", csv_data, "data/users.csv", "text/csv")
```

### Uploading from a File Object

When working with file-like objects, such as data from an HTTP request:

```python
from google.cloud import storage
import io

def upload_file_object(bucket_name, file_obj, destination_blob_name, content_type=None):
    """Upload from a file-like object to GCS."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)

    # Ensure we are at the beginning of the file
    file_obj.seek(0)

    # Upload from the file object
    blob.upload_from_file(file_obj, content_type=content_type)

    print(f"Uploaded to gs://{bucket_name}/{destination_blob_name}")

# Example with BytesIO
buffer = io.BytesIO(b"Binary data here")
upload_file_object("my-bucket", buffer, "data/binary-data.bin", "application/octet-stream")
```

### Setting Metadata During Upload

You can attach custom metadata to objects:

```python
from google.cloud import storage

def upload_with_metadata(bucket_name, source_file, destination_blob, metadata):
    """Upload a file with custom metadata attached."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)

    # Set custom metadata before uploading
    blob.metadata = metadata

    blob.upload_from_filename(source_file)

    print(f"Uploaded with metadata: {metadata}")

# Usage - attach processing info to the uploaded file
upload_with_metadata(
    "my-bucket",
    "/tmp/dataset.csv",
    "datasets/customers.csv",
    {
        "uploaded-by": "etl-pipeline",
        "source-system": "crm",
        "record-count": "15000"
    }
)
```

## Basic Download Operations

### Downloading to a Local File

```python
from google.cloud import storage

def download_file(bucket_name, source_blob_name, destination_file_path):
    """Download an object from GCS to a local file."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(source_blob_name)

    # Download to the specified local path
    blob.download_to_filename(destination_file_path)

    print(f"Downloaded gs://{bucket_name}/{source_blob_name} to {destination_file_path}")

# Usage
download_file("my-bucket", "reports/2026/february-report.pdf", "/tmp/report.pdf")
```

### Downloading as a String

For text files you want to process directly in memory:

```python
from google.cloud import storage
import json

def download_as_string(bucket_name, blob_name):
    """Download an object and return its contents as a string."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Download content as text
    content = blob.download_as_text()

    return content

# Download and parse a JSON file
json_content = download_as_string("my-bucket", "data/config.json")
config = json.loads(json_content)
print(f"Config loaded: {config}")
```

### Downloading as Bytes

For binary files:

```python
from google.cloud import storage

def download_as_bytes(bucket_name, blob_name):
    """Download an object as raw bytes."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Download as bytes
    content = blob.download_as_bytes()

    return content

# Download a binary file
image_bytes = download_as_bytes("my-bucket", "images/logo.png")
print(f"Downloaded {len(image_bytes)} bytes")
```

## Resumable Uploads for Large Files

For files over 5 MB, the library automatically uses resumable uploads. You can configure the chunk size:

```python
from google.cloud import storage

def upload_large_file(bucket_name, source_file, destination_blob):
    """Upload a large file using resumable upload with custom chunk size."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)

    # Set chunk size to 10 MB for large file uploads
    # Must be a multiple of 256 KB
    blob.chunk_size = 10 * 1024 * 1024  # 10 MB

    blob.upload_from_filename(source_file)

    print(f"Uploaded large file: {destination_blob}")

# Upload a 2 GB database dump
upload_large_file("my-bucket", "/tmp/db-dump.sql.gz", "backups/db-dump-2026-02-17.sql.gz")
```

## Streaming Upload and Download

For streaming data without loading the entire file into memory:

```python
from google.cloud import storage
import io

def stream_upload(bucket_name, destination_blob, data_generator):
    """Stream data to GCS without loading it all into memory."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)

    # Use a writer to stream data
    with blob.open("w") as f:
        for line in data_generator:
            f.write(line + "\n")

    print(f"Streamed data to gs://{bucket_name}/{destination_blob}")

def stream_download(bucket_name, blob_name):
    """Stream data from GCS, processing line by line."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    # Read line by line without loading the entire file
    with blob.open("r") as f:
        for line_number, line in enumerate(f, 1):
            # Process each line
            if line_number <= 5:
                print(f"Line {line_number}: {line.strip()}")

    print(f"Finished streaming from gs://{bucket_name}/{blob_name}")

# Generate data and stream it to GCS
def generate_data():
    """Simulate generating data rows."""
    for i in range(100000):
        yield f"{i},value_{i},{i * 0.5}"

stream_upload("my-bucket", "data/generated.csv", generate_data())
stream_download("my-bucket", "data/generated.csv")
```

## Upload with Progress Tracking

When uploading large files, it is helpful to show progress:

```python
from google.cloud import storage
import os

def upload_with_progress(bucket_name, source_file, destination_blob):
    """Upload a file and print progress updates."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(destination_blob)

    file_size = os.path.getsize(source_file)
    print(f"Uploading {source_file} ({file_size / 1024 / 1024:.1f} MB)")

    # Use resumable upload and track progress via chunk callbacks
    blob.chunk_size = 5 * 1024 * 1024  # 5 MB chunks

    blob.upload_from_filename(source_file)

    print(f"Upload complete: gs://{bucket_name}/{destination_blob}")

upload_with_progress("my-bucket", "/tmp/large-file.zip", "uploads/large-file.zip")
```

## Error Handling

Production code should handle common errors gracefully:

```python
from google.cloud import storage
from google.api_core import exceptions

def safe_download(bucket_name, blob_name, destination_path):
    """Download a file with proper error handling."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_name)

    try:
        blob.download_to_filename(destination_path)
        print(f"Downloaded successfully to {destination_path}")

    except exceptions.NotFound:
        print(f"Object not found: gs://{bucket_name}/{blob_name}")

    except exceptions.Forbidden:
        print(f"Permission denied for gs://{bucket_name}/{blob_name}")

    except exceptions.ServiceUnavailable:
        print("GCS service temporarily unavailable, retry later")

    except Exception as e:
        print(f"Unexpected error: {e}")

safe_download("my-bucket", "data/report.csv", "/tmp/report.csv")
```

## Batch Operations

When working with many files, listing and processing in batches is more efficient:

```python
from google.cloud import storage
import os

def download_all_in_prefix(bucket_name, prefix, local_dir):
    """Download all objects under a prefix to a local directory."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List all objects with the given prefix
    blobs = bucket.list_blobs(prefix=prefix)

    for blob in blobs:
        # Skip directory markers
        if blob.name.endswith("/"):
            continue

        # Create local directory structure
        local_path = os.path.join(local_dir, blob.name)
        os.makedirs(os.path.dirname(local_path), exist_ok=True)

        # Download the file
        blob.download_to_filename(local_path)
        print(f"Downloaded: {blob.name}")

    print(f"All files downloaded to {local_dir}")

download_all_in_prefix("my-bucket", "data/2026/02/", "/tmp/downloads/")
```

The Python client library handles most of the complexity of working with Cloud Storage - retries, chunked uploads, authentication. Focus on your application logic and let the library handle the plumbing.
