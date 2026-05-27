# Validation Summary: Troubleshoot BigQuery Storage Write API CommitStream Offset Already Exists Error

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Storage Write API
- BigQuery Write streams
- Python google-cloud-bigquery-storage client
- Google Cloud Logging metrics

## Sources Consulted
- BigQuery Storage Write API overview: https://docs.cloud.google.com/bigquery/docs/write-api
- BigQuery Storage Write API best practices: https://docs.cloud.google.com/bigquery/docs/write-api-best-practices
- BigQuery Storage Write API streaming guide: https://docs.cloud.google.com/bigquery/docs/write-api-streaming
- Python AppendRowsRequest reference: https://docs.cloud.google.com/python/docs/reference/bigquerystorage/latest/google.cloud.bigquery_storage_v1.types.AppendRowsRequest
- Python WriteStream reference: https://docs.cloud.google.com/python/docs/reference/bigquerystorage/latest/google.cloud.bigquery_storage_v1.types.WriteStream
- Python FinalizeWriteStreamResponse reference: https://docs.cloud.google.com/python/docs/reference/bigquerystorage/latest/google.cloud.bigquery_storage_v1.types.FinalizeWriteStreamResponse
- gcloud logging metrics create reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create

## Issues Found
- The post described the error as happening during a `CommitStream` call, but the BigQuery Storage Write API uses `AppendRows` for writes and `BatchCommitWriteStreams` for pending-stream commits. Updated the title, description, and introduction to refer to `AppendRows`.
- The sample error used the default stream with an offset error. Offsets are not allowed on the `_default` stream, so the example was changed to an application-created stream.
- The stream-mode list omitted the pending stream type and overstated buffered-stream usage. Updated the list to match the official default, committed, pending, and buffered stream descriptions.
- The explanation treated offsets as request sequence numbers. BigQuery offsets are row offsets from the start of the stream, so the offset explanation and sequence diagram now show row-count-based offsets.
- The retry guidance said to always treat `ALREADY_EXISTS` as success. Official docs say it can be ignored for idempotent retries, but it can also indicate an incorrect offset. Updated the guidance to treat it as success only when retrying the same batch at the same offset.
- The Python append example used `bigquery_storage_v1.types.Int64Value`, assigned raw rows directly to `proto_rows`, returned the original offset after success, and did not check the embedded `StorageErrorCode.OFFSET_ALREADY_EXISTS`. Updated the snippet to pass an integer offset, use `AppendRowsRequest.ProtoData`, check the embedded storage error code, and advance by row count.
- The offset checkpoint example tracked the last offset as if every append wrote one row. Updated it to store and return the next row offset to write.
- The section claiming `get_write_stream()` exposes `commit_count` was incorrect; `WriteStream` has no `commit_count` field. Replaced it with a `finalize_write_stream()` example that returns the finalized stream row count, and clarified that durable checkpoints are still needed for active-stream recovery.

## Review Notes
The `gcloud logging metrics create` command structure and flags are consistent with the Cloud SDK reference, but the exact log filter may need project-specific tuning because Storage Write API errors often appear in application logs rather than only BigQuery resource logs.
