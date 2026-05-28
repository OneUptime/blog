# Validation Summary: How to Export Traces from Cloud Trace to BigQuery for Custom Latency Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Trace
- BigQuery
- Google Cloud CLI
- BigQuery CLI
- Python Google Cloud client libraries
- Looker Studio

## Sources Consulted
- Cloud Trace: Configure exports: https://docs.cloud.google.com/trace/docs/trace-export-configure
- Cloud Trace: Export to BigQuery: https://docs.cloud.google.com/trace/docs/trace-export-bigquery
- Cloud Trace v1 API: projects.traces.list: https://docs.cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- Cloud Trace v2 API reference: https://docs.cloud.google.com/trace/docs/reference/v2/rpc/google.devtools.cloudtrace.v2
- Python client library for Cloud Trace v1: TraceServiceClient: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.services.trace_service.TraceServiceClient
- BigQuery scheduled queries: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- Cloud Logging routed logs to BigQuery: https://docs.cloud.google.com/logging/docs/export/bigquery

## Issues Found
- The post incorrectly said there is no direct Cloud Trace export path and recommended routing trace logs through a Cloud Logging sink. Cloud Trace has its own trace sink commands for BigQuery export, so the setup section was corrected to use `gcloud alpha trace sinks create` and `gcloud alpha trace sinks describe`.
- The post omitted the current deprecation state of Cloud Trace sinks. Google deprecated BigQuery export by Cloud Trace sinks on February 18, 2026 and states that those sinks are scheduled for removal on or after February 18, 2027. The setup section now includes that caveat and points new long-term setups toward Observability Analytics.
- The IAM command used a BigQuery dataset IAM binding flow for a logging sink writer identity. The corrected command follows the Cloud Trace export documentation and grants `roles/bigquery.dataEditor` to the trace sink writer identity with `gcloud projects add-iam-policy-binding`.
- The API example used `google.cloud.trace_v2.TraceServiceClient().list_traces`, but the v2 Trace API is for writing spans and does not expose `list_traces`. The example now uses the Cloud Trace v1 client, whose `list_traces` method supports reading traces with `COMPLETE` view.
- The API example attempted to read `span.status.code`, which is not a field on Cloud Trace v1 `TraceSpan`. The example now exports the labels map and derives an `http_status_code` field from the `/http/status_code` label when present.
- The table schema and error-rate query referenced a `status` column and treated OpenTelemetry status code `2` as an error. The schema and query now use the exported `http_status_code` value and count HTTP 5xx responses.
- The query section did not distinguish between Cloud Trace sink output and the custom flattened table created by the API example. The text now states that the sample SQL targets the flattened `spans` table.

## Review Notes
The sample SQL is valid for the flattened API-created table in the post. Cloud Trace sink exports use a nested schema based on the Trace v2 `Span` resource and create ingestion-time partitioned tables, so users who choose the trace sink path would need to adapt the queries to that exported schema.
