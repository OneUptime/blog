# How to Build a Scheduled Python Cloud Function That Exports Firestore Collections to Cloud Storage as JSON

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Firestore, Cloud Storage, Data Export

Description: Build a scheduled Cloud Function in Python that exports Firestore collections to Cloud Storage as JSON files for backup, analysis, and data warehouse ingestion.

---

Firestore is great for real-time reads and writes, but it is not designed for bulk analysis or long-term archival storage. Exporting Firestore collections to Cloud Storage as JSON gives you a backup strategy, feeds data into analytics pipelines, and makes it possible to query your Firestore data with tools like BigQuery. In this post, I will build a scheduled Cloud Function that handles this export automatically.

## Why Export Firestore to Cloud Storage?

There are several practical reasons. First, backup: Firestore's built-in export creates a proprietary format that is not easy to work with. JSON exports are human-readable and can be imported into other systems. Second, analytics: you can load JSON files from Cloud Storage into BigQuery for analysis without affecting your Firestore read quotas. Third, compliance: some industries require data exports in specific formats for audit purposes.

## Setting Up the Cloud Function

Here is the Cloud Function that exports specified Firestore collections to Cloud Storage.

```python
# main.py - Scheduled Firestore export to Cloud Storage
import functions_framework
from google.cloud import firestore, storage
from datetime import datetime, timezone
import json
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
BUCKET_NAME = os.environ.get("EXPORT_BUCKET", "my-firestore-exports")
COLLECTIONS = os.environ.get("COLLECTIONS", "users,orders,products").split(",")
PROJECT_ID = os.environ.get("GCP_PROJECT")

# Initialize clients (reused across invocations)
db = firestore.Client(project=PROJECT_ID)
storage_client = storage.Client()

@functions_framework.http
def export_firestore(request):
    """Export specified Firestore collections to Cloud Storage as JSON.

    Triggered by Cloud Scheduler via HTTP.
    """
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M-%S")
    results = {}

    for collection_name in COLLECTIONS:
        collection_name = collection_name.strip()
        try:
            count = export_collection(collection_name, timestamp)
            results[collection_name] = {"status": "success", "documents": count}
            logger.info(f"Exported {count} documents from {collection_name}")
        except Exception as e:
            results[collection_name] = {"status": "error", "error": str(e)}
            logger.error(f"Failed to export {collection_name}: {e}")

    # Write a manifest file summarizing the export
    write_manifest(timestamp, results)

    return {
        "status": "complete",
        "timestamp": timestamp,
        "results": results,
    }
```

## Exporting a Single Collection

The core export logic reads all documents from a collection and writes them as a JSON file.

```python
def export_collection(collection_name, timestamp):
    """Export all documents from a Firestore collection to a JSON file in GCS."""
    bucket = storage_client.bucket(BUCKET_NAME)

    # Build the output path: exports/2024-01-15_10-30-00/users.json
    blob_path = f"exports/{timestamp}/{collection_name}.json"
    blob = bucket.blob(blob_path)

    documents = []
    doc_count = 0

    # Stream all documents from the collection
    for doc in db.collection(collection_name).stream():
        doc_data = doc.to_dict()

        # Add the document ID to the data
        doc_data["_document_id"] = doc.id
        doc_data["_collection"] = collection_name

        # Convert non-serializable types
        doc_data = convert_firestore_types(doc_data)

        documents.append(doc_data)
        doc_count += 1

        # For very large collections, write in chunks to avoid memory issues
        if doc_count % 10000 == 0:
            logger.info(f"  Read {doc_count} documents from {collection_name}...")

    # Write all documents as a JSON array
    json_content = json.dumps(documents, indent=2, default=str)
    blob.upload_from_string(json_content, content_type="application/json")

    logger.info(f"Wrote {doc_count} documents to gs://{BUCKET_NAME}/{blob_path}")
    return doc_count
```

## Handling Firestore Data Types

Firestore has types that do not serialize to JSON directly. Handle the conversions.

```python
from google.cloud.firestore_v1._helpers import GeoPoint
from google.protobuf.timestamp_pb2 import Timestamp

def convert_firestore_types(data):
    """Convert Firestore-specific types to JSON-serializable formats."""
    if isinstance(data, dict):
        converted = {}
        for key, value in data.items():
            converted[key] = convert_firestore_types(value)
        return converted

    elif isinstance(data, list):
        return [convert_firestore_types(item) for item in data]

    elif isinstance(data, datetime):
        return data.isoformat()

    elif isinstance(data, GeoPoint):
        return {"latitude": data.latitude, "longitude": data.longitude}

    elif isinstance(data, bytes):
        import base64
        return base64.b64encode(data).decode("utf-8")

    elif hasattr(data, 'path'):
        # Document reference - convert to the path string
        return data.path

    return data
```

## Chunked Export for Large Collections

For collections with millions of documents, you cannot hold everything in memory. Stream directly to Cloud Storage.

```python
import io

def export_large_collection(collection_name, timestamp):
    """Export a large collection using streaming writes to Cloud Storage."""
    bucket = storage_client.bucket(BUCKET_NAME)
    blob_path = f"exports/{timestamp}/{collection_name}.jsonl"
    blob = bucket.blob(blob_path)

    # Use a resumable upload for large files
    buffer = io.BytesIO()
    doc_count = 0
    buffer_size = 0
    max_buffer_size = 50 * 1024 * 1024  # 50MB buffer

    # Start streaming documents
    for doc in db.collection(collection_name).stream():
        doc_data = doc.to_dict()
        doc_data["_document_id"] = doc.id
        doc_data = convert_firestore_types(doc_data)

        # Write each document as a single JSON line (JSONL format)
        line = json.dumps(doc_data, default=str) + "\n"
        line_bytes = line.encode("utf-8")

        buffer.write(line_bytes)
        buffer_size += len(line_bytes)
        doc_count += 1

        if doc_count % 10000 == 0:
            logger.info(f"  Processed {doc_count} documents from {collection_name}")

    # Upload the buffer
    buffer.seek(0)
    blob.upload_from_file(buffer, content_type="application/x-ndjson")

    logger.info(f"Wrote {doc_count} documents ({buffer_size / 1e6:.1f} MB) to {blob_path}")
    return doc_count
```

## Exporting Subcollections

Firestore subcollections are not included when you iterate a parent collection. You need to handle them explicitly.

```python
def export_collection_with_subcollections(parent_collection, timestamp, subcollections=None):
    """Export a collection and its subcollections."""
    bucket = storage_client.bucket(BUCKET_NAME)
    total_docs = 0

    # Export the parent collection
    for doc in db.collection(parent_collection).stream():
        doc_data = doc.to_dict()
        doc_data["_document_id"] = doc.id
        doc_data = convert_firestore_types(doc_data)

        # Check for subcollections
        if subcollections:
            for sub_name in subcollections:
                sub_docs = []
                for sub_doc in doc.reference.collection(sub_name).stream():
                    sub_data = sub_doc.to_dict()
                    sub_data["_document_id"] = sub_doc.id
                    sub_data = convert_firestore_types(sub_data)
                    sub_docs.append(sub_data)

                if sub_docs:
                    doc_data[f"_subcollection_{sub_name}"] = sub_docs
                    total_docs += len(sub_docs)

        total_docs += 1

    logger.info(f"Exported {total_docs} total documents including subcollections")
    return total_docs

# Usage: export orders with their line_items subcollection
# export_collection_with_subcollections("orders", timestamp, subcollections=["line_items"])
```

## Writing the Export Manifest

A manifest file records what was exported, when, and the status of each collection.

```python
def write_manifest(timestamp, results):
    """Write a manifest file summarizing the export."""
    bucket = storage_client.bucket(BUCKET_NAME)
    manifest_path = f"exports/{timestamp}/manifest.json"
    blob = bucket.blob(manifest_path)

    manifest = {
        "export_timestamp": timestamp,
        "project": PROJECT_ID,
        "bucket": BUCKET_NAME,
        "collections": results,
        "total_documents": sum(
            r["documents"] for r in results.values() if r["status"] == "success"
        ),
        "errors": [
            {"collection": k, "error": v["error"]}
            for k, v in results.items()
            if v["status"] == "error"
        ],
    }

    blob.upload_from_string(
        json.dumps(manifest, indent=2),
        content_type="application/json",
    )

    logger.info(f"Manifest written to gs://{BUCKET_NAME}/{manifest_path}")
```

## Deploying and Scheduling

Deploy the Cloud Function and set up a Cloud Scheduler job to trigger it.

```bash
# Deploy the export function
gcloud functions deploy export-firestore \
    --gen2 \
    --runtime=python311 \
    --region=us-central1 \
    --source=. \
    --entry-point=export_firestore \
    --trigger-http \
    --memory=1Gi \
    --timeout=540s \
    --set-env-vars="EXPORT_BUCKET=my-firestore-exports,COLLECTIONS=users,orders,products,GCP_PROJECT=my-project"

# Create a Cloud Scheduler job to run the export daily at 2 AM
gcloud scheduler jobs create http firestore-daily-export \
    --schedule="0 2 * * *" \
    --uri="https://us-central1-my-project.cloudfunctions.net/export-firestore" \
    --http-method=POST \
    --oidc-service-account-email=my-scheduler-sa@my-project.iam.gserviceaccount.com \
    --time-zone="UTC"
```

## Setting Up Lifecycle Rules for Old Exports

Configure Cloud Storage lifecycle rules to automatically delete old exports.

```bash
# Create a lifecycle rule to delete exports older than 90 days
cat > lifecycle.json << 'LIFECYCLE'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 90, "matchesPrefix": ["exports/"]}
    }
  ]
}
LIFECYCLE

gsutil lifecycle set lifecycle.json gs://my-firestore-exports
```

## Loading Exports into BigQuery

The exported JSON files can be loaded directly into BigQuery for analysis.

```python
from google.cloud import bigquery

client = bigquery.Client()

def load_export_to_bigquery(export_timestamp, collection_name, dataset, table_name):
    """Load a Firestore export from Cloud Storage into BigQuery."""
    source_uri = f"gs://my-firestore-exports/exports/{export_timestamp}/{collection_name}.json"

    job_config = bigquery.LoadJobConfig(
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
        autodetect=True,  # Let BigQuery infer the schema
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )

    table_id = f"my-project.{dataset}.{table_name}"
    load_job = client.load_table_from_uri(source_uri, table_id, job_config=job_config)
    load_job.result()

    print(f"Loaded {load_job.output_rows} rows into {table_id}")
```

## Monitoring Exports

Regular exports are critical for backup and compliance. If they fail silently, you might not notice until you need the data. OneUptime (https://oneuptime.com) can monitor your export function endpoint and alert you when the scheduled export fails or when execution time increases significantly, indicating potential issues with growing collection sizes.

## Summary

A scheduled Cloud Function that exports Firestore collections to Cloud Storage gives you reliable backups, analytics-ready data, and a foundation for data warehouse ingestion. Handle Firestore-specific types during serialization, use JSONL format for large collections, include subcollections when needed, write a manifest for each export, and set up lifecycle rules to manage storage costs. This pattern scales well and requires minimal maintenance once configured.
