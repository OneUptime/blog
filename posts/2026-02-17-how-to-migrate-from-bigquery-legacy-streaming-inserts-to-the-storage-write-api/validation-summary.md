# Validation Summary: How to Migrate from BigQuery Legacy Streaming Inserts to the Storage Write API

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google BigQuery
- BigQuery legacy streaming inserts (`tabledata.insertAll`)
- BigQuery Storage Write API
- Python
- Protocol Buffers
- gRPC
- GoogleSQL / BigQuery `INFORMATION_SCHEMA`

## Sources Consulted
- BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- Stream data using the Storage Write API: https://cloud.google.com/bigquery/docs/write-api-streaming
- BigQuery Storage Write API best practices: https://cloud.google.com/bigquery/docs/write-api-best-practices
- BigQuery quotas and limits: https://cloud.google.com/bigquery/quotas
- BigQuery pricing: https://cloud.google.com/bigquery/pricing
- `tabledata.insertAll` REST reference: https://cloud.google.com/bigquery/docs/reference/rest/v2/tabledata/insertAll
- Storage Write API supported protocol buffer and Arrow data types: https://cloud.google.com/bigquery/docs/supported-data-types
- `INFORMATION_SCHEMA.WRITE_API_TIMELINE` reference: https://cloud.google.com/bigquery/docs/information-schema-write-api

## Issues Found
- The post said the Storage Write API default stream is free and only storage is billed. Updated this to the current pricing model: Storage Write API ingestion is priced per GiB with the first 2 TiB per month free, while legacy streaming inserts are priced per 200 MiB.
- The throughput section used outdated row-per-second claims. Replaced them with quota-based wording that matches current official BigQuery limits for legacy streaming inserts and Storage Write API throughput.
- The delivery guarantees section implied committed mode always provides exactly-once delivery. Clarified that the default stream is at-least-once, and exactly-once semantics require application-created committed streams with managed stream offsets.
- The default stream path used `/streams/_default` in Python snippets. Updated it to the `AppendRows` stream name format ending in `/_default`.
- The Storage Write API writer example serialized JSON bytes but never actually called `AppendRows`. Reworked the example to use the Python client library's `AppendRowsStream`, `ProtoRows`, and a generated `event_pb2` message.
- The timestamp normalization example returned ISO strings. Updated it to produce epoch microseconds, which is the common `int64` representation for BigQuery `TIMESTAMP` columns in protocol buffer writes.
- The gRPC error handling example compared status codes to strings. Updated it to compare against `grpc.StatusCode` values.
- The monitoring SQL queried `streaming_buffer` fields from `__TABLES__`, which is not a valid SQL shape for Storage Write API monitoring. Replaced it with a query against `INFORMATION_SCHEMA.WRITE_API_TIMELINE`.
- The cost comparison SQL used `INFORMATION_SCHEMA.JOBS_BY_PROJECT` load jobs, which does not report streaming ingestion costs. Replaced it with a Storage Write API ingestion-volume query and noted that actual costs should be checked in Cloud Billing export.

## Review Notes
The Python Storage Write API example now assumes an `event_pb2.py` module generated from a protocol buffer schema matching the destination table. That is consistent with the official Python examples, but a future post revision could add the corresponding `.proto` file for a fully runnable sample.
