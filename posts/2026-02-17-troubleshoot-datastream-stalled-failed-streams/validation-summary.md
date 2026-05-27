# Validation Summary: How to Troubleshoot Datastream Stalled or Failed Streams

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Datastream
- Google Cloud CLI
- Cloud Monitoring
- Cloud Logging
- BigQuery
- MySQL binary logs
- PostgreSQL WAL and replication slots

## Sources Consulted
- Google Cloud Datastream: Monitor a stream - https://docs.cloud.google.com/datastream/docs/monitor-a-stream
- Google Cloud Datastream: BigQuery destination - https://docs.cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream: Events and streams - https://docs.cloud.google.com/datastream/docs/events-and-streams
- Google Cloud Datastream: Diagnose issues - https://docs.cloud.google.com/datastream/docs/diagnose-issues
- Google Cloud Datastream: Troubleshoot a stream - https://docs.cloud.google.com/datastream/docs/troubleshoot-a-stream
- Google Cloud Datastream: Recover a stream - https://docs.cloud.google.com/datastream/docs/recover-a-stream
- Google Cloud SDK: gcloud datastream streams update - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/update
- Google Cloud SDK: gcloud datastream streams create - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/streams/create
- Google Cloud SDK: gcloud datastream connection-profiles update - https://docs.cloud.google.com/sdk/gcloud/reference/datastream/connection-profiles/update
- Google Cloud SDK: gcloud monitoring policies create - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring metrics list for Datastream - https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h#datastream
- Google Cloud SDK: gcloud alpha services quota list - https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota/list

## Issues Found
- The BigQuery freshness queries used `datastream_metadata.source_timestamp` directly as a timestamp. Datastream's BigQuery metadata stores `SOURCE_TIMESTAMP` as an integer, and the event metadata defines source timestamps as epoch milliseconds, so the queries now wrap the value with `TIMESTAMP_MILLIS(...)`.
- The Datastream total latency metric was written as `datastream.googleapis.com/stream/total_latency`. The current Cloud Monitoring metric is `datastream.googleapis.com/stream/total_latencies`, so the metric lookup command was corrected.
- The BigQuery quota command was described as checking quota usage. The `gcloud alpha services quota list` command lists quota metrics, so the surrounding wording was adjusted.
- The primary-key guidance said tables without primary keys may be skipped silently. For BigQuery destinations, Datastream writes tables without primary keys in append-only mode; tables with unsupported primary key types are not replicated. The section was corrected.
- The alert policy example used obsolete `gcloud monitoring policies create` flags and described a state alert while querying event count. The example now uses current flags (`--if` and `--duration`) and alerts on the Datastream `stream/freshness` metric.

## Review Notes
The workspace does not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
