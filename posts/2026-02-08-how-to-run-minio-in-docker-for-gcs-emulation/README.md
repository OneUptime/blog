# How to Run MinIO in Docker for GCS Emulation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, MinIO, Google Cloud Storage, GCS, Cloud Emulation, S3, Docker Compose

Description: Use MinIO in Docker as a local Google Cloud Storage emulator for development and testing workflows

---

Google Cloud Storage (GCS) is a core service in GCP applications, but developing against it requires a GCP project, credentials, and an internet connection. MinIO can serve as a local stand-in for GCS during development. While MinIO implements the S3 API natively, the Google Cloud Storage client libraries support S3-compatible backends through interoperability mode. This means you can point your GCS code at MinIO with minimal configuration changes. Docker makes the setup trivial.

This guide shows you how to deploy MinIO in Docker, configure Google Cloud client libraries to use it, and structure your application for easy switching between local and cloud storage.

## Why MinIO for GCS Emulation

Google provides a limited GCS emulator as part of their testing tools, but it has restrictions and does not support all API features. MinIO offers a more complete storage implementation. The trade-off is that you use the S3-compatible API rather than the native GCS JSON API. In practice, for most operations (uploading, downloading, listing, deleting objects), the S3 interoperability layer works well.

GCS supports S3-compatible access through its XML API, so applications that use the S3 SDK against GCS in production can use MinIO locally without any changes.

## Quick Start

Start MinIO with custom credentials:

```bash
# Start MinIO configured for GCS emulation
docker run -d \
  --name minio-gcs \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=gcs-access-key \
  -e MINIO_ROOT_PASSWORD=gcs-secret-key \
  -v minio-gcs-data:/data \
  minio/minio:latest server /data --console-address ":9001"
```

## Docker Compose Setup

A more complete configuration for team use:

```yaml
# docker-compose.yml - MinIO as GCS emulator
version: "3.8"

services:
  storage:
    image: minio/minio:latest
    container_name: gcs-emulator
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: gcs-access-key
      MINIO_ROOT_PASSWORD: gcs-secret-key
    volumes:
      - storage-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  # Initialize buckets that mirror your GCS buckets
  storage-init:
    image: minio/mc:latest
    depends_on:
      storage:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://storage:9000 gcs-access-key gcs-secret-key;
      mc mb --ignore-existing local/app-uploads;
      mc mb --ignore-existing local/app-assets;
      mc mb --ignore-existing local/app-backups;
      mc anonymous set download local/app-assets;
      echo 'Bucket initialization complete';
      "

volumes:
  storage-data:
```

Start the stack:

```bash
# Launch MinIO and initialize buckets
docker compose up -d
```

## Using the S3-Compatible API with Python (boto3)

The most straightforward approach is to use the AWS S3 SDK, since MinIO speaks S3 natively:

```python
# storage.py - S3-compatible access to MinIO (GCS emulation)
import boto3
from botocore.client import Config

def get_storage_client():
    """Create an S3 client pointing at the local MinIO instance."""
    return boto3.client(
        "s3",
        endpoint_url="http://localhost:9000",
        aws_access_key_id="gcs-access-key",
        aws_secret_access_key="gcs-secret-key",
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )

client = get_storage_client()

# Upload a file
client.upload_file("local_image.png", "app-uploads", "images/photo.png")
print("Uploaded image")

# Generate a signed URL (like GCS signed URLs)
url = client.generate_presigned_url(
    "get_object",
    Params={"Bucket": "app-uploads", "Key": "images/photo.png"},
    ExpiresIn=3600
)
print(f"Signed URL: {url}")

# List objects with a prefix (like GCS prefix filtering)
response = client.list_objects_v2(Bucket="app-uploads", Prefix="images/")
for obj in response.get("Contents", []):
    print(f"  {obj['Key']} - {obj['Size']} bytes")
```

## Using the Google Cloud Storage Client Library

If your application uses the official Google Cloud Storage Python library, you can use an adapter approach:

```python
# gcs_adapter.py - abstraction layer that works with both GCS and MinIO
import os
from io import BytesIO

class StorageClient:
    """Storage client that switches between GCS and MinIO based on environment."""

    def __init__(self):
        self.env = os.environ.get("STORAGE_BACKEND", "local")

        if self.env == "local":
            import boto3
            from botocore.client import Config
            self._client = boto3.client(
                "s3",
                endpoint_url=os.environ.get("STORAGE_ENDPOINT", "http://localhost:9000"),
                aws_access_key_id=os.environ.get("STORAGE_ACCESS_KEY", "gcs-access-key"),
                aws_secret_access_key=os.environ.get("STORAGE_SECRET_KEY", "gcs-secret-key"),
                config=Config(signature_version="s3v4"),
                region_name="us-east-1"
            )
            self.backend = "s3"
        else:
            from google.cloud import storage
            self._client = storage.Client()
            self.backend = "gcs"

    def upload_bytes(self, bucket_name, blob_name, data, content_type="application/octet-stream"):
        """Upload bytes to storage."""
        if self.backend == "s3":
            self._client.put_object(
                Bucket=bucket_name,
                Key=blob_name,
                Body=data,
                ContentType=content_type
            )
        else:
            bucket = self._client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            blob.upload_from_string(data, content_type=content_type)

    def download_bytes(self, bucket_name, blob_name):
        """Download bytes from storage."""
        if self.backend == "s3":
            response = self._client.get_object(Bucket=bucket_name, Key=blob_name)
            return response["Body"].read()
        else:
            bucket = self._client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            return blob.download_as_bytes()

    def delete_object(self, bucket_name, blob_name):
        """Delete an object from storage."""
        if self.backend == "s3":
            self._client.delete_object(Bucket=bucket_name, Key=blob_name)
        else:
            bucket = self._client.bucket(bucket_name)
            blob = bucket.blob(blob_name)
            blob.delete()

    def list_objects(self, bucket_name, prefix=""):
        """List objects in a bucket with optional prefix."""
        if self.backend == "s3":
            response = self._client.list_objects_v2(Bucket=bucket_name, Prefix=prefix)
            return [obj["Key"] for obj in response.get("Contents", [])]
        else:
            bucket = self._client.bucket(bucket_name)
            return [blob.name for blob in bucket.list_blobs(prefix=prefix)]
```

Use the adapter in your application:

```python
# Usage in application code
storage = StorageClient()
storage.upload_bytes("app-uploads", "data/report.json", b'{"status": "ok"}',
                     content_type="application/json")
```

## Node.js Integration

```javascript
// storage.js - MinIO as GCS emulator in Node.js
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

function getStorageClient() {
  const isLocal = process.env.STORAGE_BACKEND !== "gcs";

  if (isLocal) {
    return new S3Client({
      endpoint: process.env.STORAGE_ENDPOINT || "http://localhost:9000",
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY || "gcs-access-key",
        secretAccessKey: process.env.STORAGE_SECRET_KEY || "gcs-secret-key",
      },
      forcePathStyle: true,
    });
  }

  // For production GCS, use the S3-compatible XML API endpoint
  return new S3Client({
    endpoint: "https://storage.googleapis.com",
    region: "us-central1",
    credentials: {
      accessKeyId: process.env.GCS_ACCESS_KEY,
      secretAccessKey: process.env.GCS_SECRET_KEY,
    },
  });
}

async function uploadFile(bucket, key, body) {
  const client = getStorageClient();
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
  }));
  console.log(`Uploaded ${key} to ${bucket}`);
}

// Example usage
uploadFile("app-uploads", "test.txt", "Hello from MinIO!");
```

## Testing with MinIO

Write integration tests that work against MinIO locally and GCS in production:

```python
# test_storage.py - integration tests using MinIO
import pytest
import boto3
from botocore.client import Config

@pytest.fixture
def s3_client():
    """Create an S3 client for testing against MinIO."""
    client = boto3.client(
        "s3",
        endpoint_url="http://localhost:9000",
        aws_access_key_id="gcs-access-key",
        aws_secret_access_key="gcs-secret-key",
        config=Config(signature_version="s3v4"),
        region_name="us-east-1"
    )
    # Create test bucket
    try:
        client.create_bucket(Bucket="test-bucket")
    except client.exceptions.BucketAlreadyOwnedByYou:
        pass
    yield client
    # Cleanup: delete all objects and the bucket
    response = client.list_objects_v2(Bucket="test-bucket")
    for obj in response.get("Contents", []):
        client.delete_object(Bucket="test-bucket", Key=obj["Key"])
    client.delete_bucket(Bucket="test-bucket")

def test_upload_and_download(s3_client):
    """Test that we can upload and download objects."""
    test_data = b"test content for GCS emulation"
    s3_client.put_object(Bucket="test-bucket", Key="test.txt", Body=test_data)
    response = s3_client.get_object(Bucket="test-bucket", Key="test.txt")
    assert response["Body"].read() == test_data

def test_list_objects_with_prefix(s3_client):
    """Test prefix-based listing (mirrors GCS prefix behavior)."""
    s3_client.put_object(Bucket="test-bucket", Key="dir/a.txt", Body=b"a")
    s3_client.put_object(Bucket="test-bucket", Key="dir/b.txt", Body=b"b")
    s3_client.put_object(Bucket="test-bucket", Key="other/c.txt", Body=b"c")

    response = s3_client.list_objects_v2(Bucket="test-bucket", Prefix="dir/")
    keys = [obj["Key"] for obj in response["Contents"]]
    assert keys == ["dir/a.txt", "dir/b.txt"]
```

## Conclusion

MinIO in Docker serves as a practical local substitute for Google Cloud Storage. The S3 interoperability approach works well for the vast majority of storage operations. By using an abstraction layer in your application, you can switch between MinIO and real GCS with an environment variable change. This pattern speeds up development, enables offline work, and makes integration tests fast and free. Start by mirroring your GCS bucket structure in MinIO, use the adapter pattern for backend-agnostic code, and run your test suite against MinIO in CI before deploying to GCP.
