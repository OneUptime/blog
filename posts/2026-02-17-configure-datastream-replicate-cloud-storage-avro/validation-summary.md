# Validation Summary: How to Configure Datastream to Replicate to Cloud Storage in Avro Format

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Datastream
- Cloud Storage
- Avro
- MySQL CDC
- BigQuery external tables and load jobs
- Google Cloud CLI
- gsutil
- Python client libraries for Cloud Storage and BigQuery
- Cloud Functions and Pub/Sub notifications

## Sources Consulted
- Google Cloud Datastream: Configure a Cloud Storage destination - https://docs.cloud.google.com/datastream/docs/destination-gcs
- Google Cloud Datastream: Events and streams - https://docs.cloud.google.com/datastream/docs/events-and-streams
- Google Cloud SDK: gcloud datastream connection-profiles create - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/create
- Google Cloud SDK: gcloud datastream streams create - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK: gcloud datastream streams update - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update
- Google Cloud Datastream Python API: GcsDestinationConfig - https://cloud.google.com/python/docs/reference/datastream/latest/google.cloud.datastream_v1.types.GcsDestinationConfig
- BigQuery: Load Avro data from Cloud Storage - https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-avro
- BigQuery: Data definition language for external tables - https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language

## Issues Found
- The Cloud Storage connection profile used non-existent `--gcs-bucket` and `--gcs-root-path` flags. Updated them to the documented `--bucket` and `--root-path` flags.
- The stream creation command passed inline JSON to flags that expect paths to YAML or JSON files. Added `mysql_source_config.json` and `gcs_destination_config.json` examples and passed those filenames to the CLI.
- The GCS destination config used incorrect file rotation fields (`fileRotation.intervalSeconds` and `maxFileSizeBytes`) and an unsupported 120-second interval. Updated it to `fileRotationInterval` and `fileRotationMb`, with a 60-second interval within Datastream's documented 15-60 second range.
- The stream start command omitted `--update-mask=state`. Added it to match the documented `gcloud datastream streams update` example.
- The documented GCS file layout incorrectly used separate database and table folders and omitted the minute path segment. Updated the path structure to `{root_path}/{object_name}/yyyy/mm/dd/hh/mm/`.
- The Avro event example used flattened `_metadata_*` fields that do not match Datastream's documented metadata model. Updated the example and Python/BigQuery snippets to use generic metadata and `source_metadata` fields.
- The BigQuery external table and load examples used URI patterns that no longer matched the corrected Datastream path layout. Updated the sample URIs.
- The Cloud Function extracted the table name from the wrong path segment. Updated it to read the Datastream object name segment.
- The Avro-vs-JSON comparison claimed Avro file size was smaller due to compression. Changed this to binary encoding because the reviewed Datastream docs do not document compression as the reason.

## Review Notes
The examples are still illustrative and assume the user has already created a valid MySQL source connection profile and granted any required IAM permissions for cross-project buckets. BigQuery can load and query Avro files natively, but raw Datastream Avro is an event stream shape; production pipelines commonly transform these raw CDC events before loading them into final analytics tables.
