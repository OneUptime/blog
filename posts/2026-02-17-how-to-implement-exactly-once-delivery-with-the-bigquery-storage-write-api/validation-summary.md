# Validation Summary: How to Implement Exactly-Once Delivery with the BigQuery Storage Write API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Storage Write API
- Python
- Protocol Buffers
- SQL
- Mermaid sequence diagrams

## Sources Consulted
- Google Cloud BigQuery Storage Write API overview: https://cloud.google.com/bigquery/docs/write-api
- Google Cloud guide to streaming data with the Storage Write API: https://cloud.google.com/bigquery/docs/write-api-streaming
- Google Cloud BigQuery Storage Write API best practices: https://cloud.google.com/bigquery/docs/write-api-best-practices
- Google Cloud Python client reference for BigQueryWriteClient: https://cloud.google.com/python/docs/reference/bigquerystorage/latest/google.cloud.bigquery_storage_v1.client.BigQueryWriteClient
- Google Cloud BigQuery Storage API RPC reference: https://cloud.google.com/bigquery/docs/reference/storage/rpc/

## Issues Found
- The post incorrectly stated that committed streams must be committed to make data visible. Updated the explanation, sequence diagram, pipeline comments, and wrapper code to state that committed stream data is visible after successful append, and that `FinalizeWriteStream` is optional but useful for releasing the stream.
- The post used `BatchCommitWriteStreams` with committed streams. Official documentation states that `BatchCommitWriteStreams` atomically commits `PENDING` streams. Removed the committed-stream batch commit examples and replaced the code with a no-op explanation for committed streams.
- The post described abandoned committed-stream data as "uncommitted" and invisible. Updated the failure-handling guidance to clarify that acknowledged appends on committed streams are already visible, so retries should start only after the last saved checkpoint.
- The Python example used `types.Int64Value`, which is not the documented type for `AppendRowsRequest.offset`. Updated it to use `google.protobuf.wrappers_pb2.Int64Value`.
- The retry explanation implied BigQuery silently acknowledges duplicate offsets. Updated it to describe the documented `ALREADY_EXISTS` offset error and show handling for embedded append response errors.
- The post described exactly-once delivery too broadly. Updated the wording to clarify that the guarantee is within a write stream and prevents retry-related duplicate appends, not arbitrary upstream duplicate events.

## Review Notes
The main writer example still omits protobuf row serialization for clarity, so it remains illustrative rather than copy-paste complete. A future revision could add a fully runnable protobuf or Arrow example.
