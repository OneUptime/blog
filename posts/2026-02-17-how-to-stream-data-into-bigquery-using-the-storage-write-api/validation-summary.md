# Validation Summary: How to Stream Data into BigQuery Using the Storage Write API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Storage Write API
- Python
- Node.js
- Java
- Protocol Buffers
- gRPC
- GoogleSQL

## Sources Consulted
- Google Cloud BigQuery Storage Write API introduction: https://docs.cloud.google.com/bigquery/docs/write-api
- Google Cloud Storage Write API streaming guide and official code samples: https://docs.cloud.google.com/bigquery/docs/write-api-streaming
- Google Cloud BigQuery Storage Write API best practices: https://docs.cloud.google.com/bigquery/docs/write-api-best-practices
- Google Cloud BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Google Cloud supported protocol buffer and Arrow data types: https://cloud.google.com/bigquery/docs/supported-data-types

## Issues Found
- The cost comparison claimed the Storage Write API was free with committed-mode caveats. Updated it to the current pricing model: $0.025 per GiB with the first 2 TiB per month free.
- The throughput comparison used unsupported row-per-second numbers. Replaced it with the quota model described by Google: project throughput and connection quotas, with one connection generally supporting at least 1 MBps and often more.
- The delivery guarantee description implied committed mode alone provides exactly-once delivery. Clarified that exactly-once requires application-created committed streams with stream offsets.
- The write-mode section omitted pending streams and described buffered streams as the normal batch atomicity option. Added pending streams for atomic batch loads and clarified that buffered streams are advanced and generally recommended only for Apache Beam BigQuery I/O.
- The Python examples did not actually append data to BigQuery and referenced a JSON writer pattern that does not exist in the Python client. Replaced them with working `AppendRowsStream` examples that send serialized Protocol Buffer rows to the default stream.
- The Python default stream path used `/streams/_default`, which is not the form used by the Python `AppendRows` sample. Updated it to `{table_path}/_default`.
- The Node.js example imported the low-level write client but never created a Storage Write API connection or appended rows. Replaced it with the official managed writer pattern using `WriterClient`, `JSONWriter`, `getWriteStream`, `createStreamConnection`, `appendRows`, and `getResult`.
- The Java example omitted the `ApiFuture` import, imported an unused protobuf descriptor class, and printed an append offset for the default stream where offsets are not the right guarantee to highlight. Fixed the imports, managed the write client lifecycle, and changed the success message.
- The production best practices said to finalize and commit all explicit streams. Clarified that pending streams must be finalized and batch-committed, while committed and buffered streams only need finalization for cleanup.
- Monitoring guidance was generic. Added the official `INFORMATION_SCHEMA.WRITE_API_TIMELINE` and Google Cloud metrics references.

## Review Notes
The examples assume a destination table whose schema matches the row fields shown. The Python examples also assume `events_pb2.py` has been generated from the included `events.proto` snippet before running.
