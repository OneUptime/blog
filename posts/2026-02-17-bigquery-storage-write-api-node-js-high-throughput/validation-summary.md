# Validation Summary: Use the Node.js BigQuery Storage Write API for High-Throughput Data Ingestion

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery Storage Write API
- Node.js
- `@google-cloud/bigquery-storage`
- `@google-cloud/bigquery`
- Express
- gRPC status codes

## Sources Consulted
- Google Cloud BigQuery Storage Write API introduction: https://cloud.google.com/bigquery/docs/write-api
- Google Cloud guide to streaming data with the Storage Write API: https://cloud.google.com/bigquery/docs/write-api-streaming
- Google Cloud Node.js BigQuery Storage client reference: https://cloud.google.com/nodejs/docs/reference/bigquery-storage/latest
- Google Cloud BigQuery quotas and limits: https://cloud.google.com/bigquery/quotas
- Google Cloud legacy streaming API documentation: https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Google Cloud BigQuery pricing: https://cloud.google.com/bigquery/pricing
- Google Cloud supported Storage Write API protocol buffer and Arrow data types: https://cloud.google.com/bigquery/docs/supported-data-types
- gRPC status code reference: https://grpc.io/docs/guides/status-codes/

## Issues Found
- The original default-stream Node.js sample used `BigQueryWriteClient.appendRows()` as a unary promise-style call and referenced `adapt.convertObjectToProto()`, which does not match the current official Node.js client examples. I changed the sample to use `managedwriter.WriterClient`, `JSONWriter`, `createStreamConnection()`, `writer.appendRows()`, and `pendingWrite.getResult()`.
- The original dependency command installed `protobufjs` directly but omitted `express`, even though the post includes an Express API. I changed the install command to include `express` and removed the direct `protobufjs` install.
- The legacy streaming insert limits were incorrect. The post said rows have a 1MB limit and requests can contain 10,000 rows. I corrected this to the documented 10MB maximum row size, 10MB HTTP request size, and 50,000 maximum rows per request.
- The post claimed legacy streaming data may take up to 90 minutes to become queryable. Google documents that acknowledged `tabledata.insertAll` rows are queryable immediately; the 90-minute caveat applies to streaming-buffer effects such as copy availability and ingestion-time partition metadata in rare cases. I corrected the wording.
- The post described exactly-once delivery for committed streams without consistently mentioning stream offsets. I updated the wording to make offsets explicit and added a committed-stream example using `writer.appendRows(rows, offset)`.
- The original code passed ISO timestamp strings through a generated protobuf descriptor where `TIMESTAMP` maps to an integer microsecond value. I updated the sample to pass JavaScript `Date` objects so `JSONWriter` can encode timestamps correctly.
- The retry sample checked only string error codes. I added the corresponding numeric gRPC status codes commonly surfaced by Node.js gRPC clients.

## Review Notes
The examples are still illustrative and require a configured Google Cloud project, enabled BigQuery Storage API, Application Default Credentials or equivalent credentials, and a target dataset/table. The batching sample uses an application-level row count; production systems should also size batches by serialized request size because Storage Write API `AppendRows` requests are limited to 10MB.
