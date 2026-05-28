# Validation Summary: How to Build a Scheduled Python Cloud Function That Exports Firestore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Google Cloud Functions / Cloud Run functions
- Functions Framework for Python
- Cloud Firestore
- Cloud Storage
- Cloud Scheduler
- BigQuery
- Google Cloud CLI
- gsutil

## Sources Consulted
- Google Cloud Storage Python Blob API: https://docs.cloud.google.com/python/docs/reference/storage/latest/google.cloud.storage.blob.Blob
- BigQuery loading JSON data from Cloud Storage: https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-json
- Cloud Scheduler HTTP job CLI reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud Scheduler HTTP target authentication: https://docs.cloud.google.com/scheduler/docs/http-target-auth
- Cloud Storage Object Lifecycle Management: https://docs.cloud.google.com/storage/docs/lifecycle
- Firestore export and import documentation: https://firebase.google.com/docs/firestore/manage-data/export-import
- Firestore Python client library class reference: https://docs.cloud.google.com/python/docs/reference/firestore/latest/summary_class
- Firestore Python DocumentReference documentation: https://docs.cloud.google.com/python/docs/reference/firestore/latest/google.cloud.firestore_v1.document
- Cloud Run functions / Cloud Functions deployment documentation: https://cloud.google.com/functions/docs/deploy

## Issues Found
- The first collection export example said it wrote in chunks for large collections, but the code built one in-memory JSON array. I changed the comment to point readers to the JSONL streaming example for memory-safe exports.
- The large collection example claimed to stream directly to Cloud Storage, but it buffered the entire export in an `io.BytesIO` object and uploaded only at the end. I changed it to write JSONL records through `blob.open("w", content_type="application/x-ndjson")`.
- The Firestore type conversion snippet imported `Timestamp` but never used it. I removed the unused import.
- The subcollection export helper collected parent and child documents but never uploaded the result to Cloud Storage. I added a JSON upload to a `_with_subcollections.json` object.
- The BigQuery example configured `NEWLINE_DELIMITED_JSON` while pointing at the earlier `.json` array export. BigQuery requires one JSON object per line for JSON loads, so I changed the example to load the `.jsonl` export.

## Review Notes
- The deployment and scheduler commands use current documented flags, but a real deployment also needs the chosen runtime service account to have Firestore read and Cloud Storage write permissions, and the scheduler service account to have permission to invoke the function if the endpoint is not public.
