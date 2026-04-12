# How to Write a Script to Archive Old Data in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Scripting, Archival, Data Management, Operation

Description: Learn how to write a Python script to archive old MongoDB documents to a separate collection or S3 bucket before deleting them to manage collection size and retention.

---

## Overview

As collections grow, old data consumes storage and slows queries. An archival script moves documents older than a retention window to a cold storage collection or object storage bucket, then deletes them from the hot collection, keeping the active dataset lean.

## Archival Strategy

```text
Hot collection (app_events) - last 90 days
    |
    v
[Archive script runs weekly]
    |-> Copy documents older than 90 days to app_events_archive collection
    |-> Export to S3 as JSONL (optional)
    |-> Delete archived documents from app_events
```

## Python Archival Script

```python
#!/usr/bin/env python3
import os
import json
import gzip
from datetime import datetime, timedelta
from pymongo import MongoClient

MONGO_URI = os.environ["MONGO_URI"]
SOURCE_DB = "myapp"
SOURCE_COLLECTION = "app_events"
ARCHIVE_COLLECTION = "app_events_archive"
RETENTION_DAYS = 90
BATCH_SIZE = 1000

client = MongoClient(MONGO_URI)
db = client[SOURCE_DB]
source = db[SOURCE_COLLECTION]
archive = db[ARCHIVE_COLLECTION]

def archive_old_documents():
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    print(f"Archiving documents older than {cutoff.date()} from '{SOURCE_COLLECTION}'")

    total_archived = 0
    total_deleted = 0

    while True:
        # Fetch a batch of old documents
        batch = list(source.find(
            {"createdAt": {"$lt": cutoff}},
            batch_size=BATCH_SIZE
        ).limit(BATCH_SIZE))

        if not batch:
            break

        # Insert into archive collection
        try:
            archive.insert_many(batch, ordered=False)
        except Exception as e:
            print(f"Archive insert error (may be duplicates): {e}")

        # Delete archived batch from source
        ids = [doc["_id"] for doc in batch]
        result = source.delete_many({"_id": {"$in": ids}})

        total_archived += len(batch)
        total_deleted += result.deleted_count
        print(f"  Processed batch: {len(batch)} archived, {result.deleted_count} deleted")

    print(f"\nArchival complete: {total_archived} archived, {total_deleted} deleted")
    return total_archived, total_deleted

if __name__ == "__main__":
    archive_old_documents()
```

## Adding S3 Export Before Deletion

For long-term cold storage, export to S3 before deleting from MongoDB:

```python
import boto3

def export_batch_to_s3(batch, bucket, key_prefix):
    s3 = boto3.client("s3")
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    key = f"{key_prefix}/archive_{timestamp}.jsonl.gz"

    lines = "\n".join(json.dumps(doc, default=str) for doc in batch).encode("utf-8")

    import io
    buffer = io.BytesIO()
    with gzip.GzipFile(fileobj=buffer, mode="wb") as gz:
        gz.write(lines)

    buffer.seek(0)
    s3.upload_fileobj(buffer, bucket, key)
    print(f"Exported {len(batch)} documents to s3://{bucket}/{key}")
```

## Creating Indexes on the Archive Collection

```javascript
db.app_events_archive.createIndex({ createdAt: 1 })
db.app_events_archive.createIndex({ userId: 1, createdAt: -1 })
```

## Verifying Archival Integrity

After archiving, verify document counts match:

```python
def verify_archival(cutoff):
    source_count = source.count_documents({"createdAt": {"$lt": cutoff}})
    archive_count = archive.count_documents({"createdAt": {"$lt": cutoff}})

    if source_count == 0 and archive_count > 0:
        print(f"Verification passed: {archive_count} documents in archive, 0 remaining in source")
    else:
        print(f"WARNING: {source_count} documents still in source after archival")
```

## Scheduling the Script

```bash
# Run archival every Sunday at 3 AM
0 3 * * 0 /usr/local/bin/python3 /opt/scripts/mongodb_archive.py >> /var/log/mongodb-archive.log 2>&1
```

## Best Practices

- Use batch processing with a fixed `BATCH_SIZE` (500-2000 documents) rather than archiving all at once to avoid large write transactions that impact production performance.
- Always insert into the archive collection before deleting from the source - never delete first.
- Add a `archivedAt` field to archive documents for traceability: `doc["archivedAt"] = datetime.utcnow()`.
- Run archival during off-peak hours and monitor write throughput during execution to ensure it does not impact the application.

## Summary

A MongoDB archival script moves old documents in batches from the hot collection to a cold archive collection (or S3), then deletes them from the source. Process in small batches, always write before deleting, and verify integrity with document count checks after each run.
