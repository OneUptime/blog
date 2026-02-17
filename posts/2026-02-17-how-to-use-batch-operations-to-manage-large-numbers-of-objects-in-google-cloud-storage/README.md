# How to Use Batch Operations to Manage Large Numbers of Objects in Google Cloud Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Storage, Batch Operations, Data Management, Automation

Description: Learn how to efficiently manage large numbers of objects in Google Cloud Storage using batch operations, parallel processing, and scripting techniques.

---

When you need to update metadata on a million objects, change the storage class of an entire bucket's contents, or delete thousands of files matching a pattern, doing it one object at a time is painfully slow. Google Cloud Storage provides several approaches for batch operations that let you process large numbers of objects efficiently.

This guide covers the tools and techniques for managing objects at scale - from built-in batch APIs to parallel scripting patterns.

## The Batch JSON API

The Cloud Storage JSON API supports batching multiple requests into a single HTTP call. You can combine up to 100 operations per batch request:

```python
from google.cloud import storage
from google.cloud.storage import batch

def batch_update_metadata(bucket_name, prefix, metadata_updates):
    """Update metadata on multiple objects using batch API."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    # List objects to update
    blobs = list(bucket.list_blobs(prefix=prefix))

    # Process in batches of 100 (API limit per batch request)
    batch_size = 100
    for i in range(0, len(blobs), batch_size):
        batch_blobs = blobs[i:i + batch_size]

        # Use the client's batch context manager
        with client.batch():
            for blob in batch_blobs:
                blob.metadata = metadata_updates
                blob.patch()

        print(f"Updated batch {i // batch_size + 1}: "
              f"{len(batch_blobs)} objects")

    print(f"Total updated: {len(blobs)} objects")

# Update metadata on all objects in a prefix
batch_update_metadata(
    "my-bucket",
    "data/2026/",
    {"processed": "true", "pipeline-version": "3.2"}
)
```

## Parallel Operations with gcloud

The gcloud CLI supports parallel operations natively through the `-m` flag in gsutil or through built-in parallelism in `gcloud storage`:

```bash
# Delete all objects under a prefix (parallel by default in gcloud storage)
gcloud storage rm gs://my-bucket/tmp/**

# Copy many files in parallel
gcloud storage cp -r gs://source-bucket/data/ gs://dest-bucket/data/

# Using gsutil with explicit parallel flag
gsutil -m rm gs://my-bucket/old-data/**

# Parallel copy with gsutil
gsutil -m cp -r ./local-data/ gs://my-bucket/uploads/
```

## Changing Storage Class in Bulk

To move objects to a different storage class, you need to rewrite them:

```python
from google.cloud import storage
import concurrent.futures

def change_storage_class(bucket_name, prefix, target_class, max_workers=20):
    """Change the storage class of all objects under a prefix."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    blobs = list(bucket.list_blobs(prefix=prefix))
    total = len(blobs)
    changed = 0

    def rewrite_blob(blob):
        """Rewrite a single blob to change its storage class."""
        # Skip if already in the target class
        if blob.storage_class == target_class:
            return False

        # Rewrite the blob with the new storage class
        new_blob = bucket.blob(blob.name)
        new_blob.storage_class = target_class

        token = None
        while True:
            token, _, _ = new_blob.rewrite(blob, token=token)
            if token is None:
                break
        return True

    # Process blobs in parallel using a thread pool
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(rewrite_blob, blob): blob for blob in blobs}

        for future in concurrent.futures.as_completed(futures):
            blob = futures[future]
            try:
                if future.result():
                    changed += 1
                    if changed % 100 == 0:
                        print(f"Progress: {changed}/{total} objects changed")
            except Exception as e:
                print(f"Error processing {blob.name}: {e}")

    print(f"Changed storage class of {changed} objects to {target_class}")

# Move old data to Coldline storage
change_storage_class("my-bucket", "archive/2024/", "COLDLINE")
```

## Bulk Deletion Patterns

### Delete by Prefix

```bash
# Delete everything under a prefix
gcloud storage rm -r gs://my-bucket/temp/

# Delete with a pattern (using gsutil glob)
gsutil -m rm gs://my-bucket/logs/2024-*.log
```

### Delete by Age Using a Script

```python
from google.cloud import storage
from datetime import datetime, timedelta, timezone
import concurrent.futures

def delete_objects_older_than(bucket_name, prefix, days, dry_run=True):
    """Delete objects older than a specified number of days."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    blobs = list(bucket.list_blobs(prefix=prefix))

    # Filter to objects older than the cutoff
    old_blobs = [b for b in blobs if b.time_created < cutoff]

    print(f"Found {len(old_blobs)} objects older than {days} days "
          f"(out of {len(blobs)} total)")

    if dry_run:
        print("DRY RUN - no objects will be deleted")
        for blob in old_blobs[:10]:
            print(f"  Would delete: {blob.name} (created: {blob.time_created})")
        if len(old_blobs) > 10:
            print(f"  ... and {len(old_blobs) - 10} more")
        return

    # Delete in parallel
    def delete_blob(blob):
        blob.delete()
        return blob.name

    deleted = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(delete_blob, b): b for b in old_blobs}

        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
                deleted += 1
                if deleted % 100 == 0:
                    print(f"Deleted {deleted}/{len(old_blobs)} objects")
            except Exception as e:
                blob = futures[future]
                print(f"Error deleting {blob.name}: {e}")

    print(f"Deleted {deleted} objects")

# First do a dry run
delete_objects_older_than("my-bucket", "logs/", 90, dry_run=True)

# Then execute for real
delete_objects_older_than("my-bucket", "logs/", 90, dry_run=False)
```

## Bulk Metadata Updates

### Using the JSON API Batch

```python
from google.cloud import storage

def bulk_set_content_type(bucket_name, prefix, extension_map):
    """Set correct content types based on file extensions."""
    client = storage.Client()
    bucket = client.bucket(bucket_name)

    blobs = list(bucket.list_blobs(prefix=prefix))
    updated = 0

    # Process in batches
    batch_size = 100
    for i in range(0, len(blobs), batch_size):
        batch_blobs = blobs[i:i + batch_size]

        with client.batch():
            for blob in batch_blobs:
                # Determine the correct content type from the extension
                for ext, content_type in extension_map.items():
                    if blob.name.endswith(ext):
                        blob.content_type = content_type
                        blob.patch()
                        updated += 1
                        break

        print(f"Processed batch: {min(i + batch_size, len(blobs))}/{len(blobs)}")

    print(f"Updated content type on {updated} objects")

# Fix content types for mistyped uploads
extension_map = {
    ".json": "application/json",
    ".csv": "text/csv",
    ".html": "text/html",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".pdf": "application/pdf",
}

bulk_set_content_type("my-bucket", "uploads/", extension_map)
```

## Bulk Copy Between Buckets

### Using gcloud for Large Transfers

```bash
# Copy all objects between buckets (parallel by default)
gcloud storage cp -r gs://source-bucket/ gs://destination-bucket/

# Copy with storage class change
gcloud storage cp -r gs://source-bucket/data/ gs://archive-bucket/data/ \
  --storage-class=COLDLINE
```

### Using Python for Filtered Copies

```python
from google.cloud import storage
import concurrent.futures

def copy_objects_filtered(source_bucket, dest_bucket, prefix, filter_func, max_workers=20):
    """Copy objects between buckets with a custom filter function."""
    client = storage.Client()
    src_bucket = client.bucket(source_bucket)
    dst_bucket = client.bucket(dest_bucket)

    blobs = list(src_bucket.list_blobs(prefix=prefix))
    filtered = [b for b in blobs if filter_func(b)]

    print(f"Copying {len(filtered)} objects (filtered from {len(blobs)})")

    def copy_blob(blob):
        src_bucket.copy_blob(blob, dst_bucket, blob.name)
        return blob.name

    copied = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(copy_blob, b): b for b in filtered}

        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
                copied += 1
                if copied % 100 == 0:
                    print(f"Copied {copied}/{len(filtered)}")
            except Exception as e:
                blob = futures[future]
                print(f"Error copying {blob.name}: {e}")

    print(f"Copied {copied} objects to {dest_bucket}")

# Copy only CSV files larger than 1 MB
copy_objects_filtered(
    "raw-data-bucket",
    "processed-data-bucket",
    "exports/",
    lambda b: b.name.endswith('.csv') and b.size > 1024 * 1024
)
```

## Node.js Batch Operations

```javascript
const { Storage } = require('@google-cloud/storage');
const pLimit = require('p-limit');

const storage = new Storage();

async function batchDeleteByPrefix(bucketName, prefix, concurrency = 20) {
  const bucket = storage.bucket(bucketName);

  // List all files with the prefix
  const [files] = await bucket.getFiles({ prefix });

  console.log(`Found ${files.length} files to delete`);

  // Limit concurrent operations to avoid overwhelming the API
  const limit = pLimit(concurrency);

  let deleted = 0;
  const tasks = files.map(file =>
    limit(async () => {
      await file.delete();
      deleted++;
      if (deleted % 100 === 0) {
        console.log(`Deleted ${deleted}/${files.length}`);
      }
    })
  );

  await Promise.all(tasks);
  console.log(`Deleted ${deleted} files`);
}

// Delete all temp files
batchDeleteByPrefix('my-bucket', 'tmp/', 30);
```

## Performance Tips for Batch Operations

**Use parallel workers.** Whether it is Python's ThreadPoolExecutor, gsutil's `-m` flag, or p-limit in Node.js, parallel processing is essential for large-scale operations.

**Batch API requests where possible.** The JSON API batch endpoint reduces HTTP overhead by combining up to 100 operations per request.

**Monitor API quotas.** Cloud Storage has per-project rate limits. For very large operations, you might need to add rate limiting to avoid hitting 429 (Too Many Requests) errors.

**Use exponential backoff.** When processing many objects, some requests will fail temporarily. Implement retry logic with exponential backoff.

**Consider Storage Transfer Service.** For bucket-to-bucket operations involving terabytes of data, the Storage Transfer Service is often faster and more reliable than scripted batch operations.

**Process in stages.** For millions of objects, break the work into smaller prefixes and process them separately. This makes it easier to track progress and resume after failures.

Batch operations on Cloud Storage are all about combining the right tool with the right level of parallelism. For simple tasks, gcloud and gsutil handle it well. For custom logic and filtering, Python or Node.js scripts with parallel workers give you the flexibility you need.
