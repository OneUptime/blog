# Validation Summary: How to Compare Trace Latency Over Time Using Cloud Trace Analysis Reports

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Trace
- Cloud Trace Explorer
- Cloud Trace API v1
- Python
- BigQuery Standard SQL
- Latency percentiles and SLO reporting

## Sources Consulted
- Google Cloud Trace: Find and explore traces: https://docs.cloud.google.com/trace/docs/finding-traces
- Google Cloud Trace API v1 `projects.traces.list` REST reference: https://docs.cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- Google Cloud Trace Python client `TraceServiceClient` v1 reference: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.services.trace_service.TraceServiceClient
- Google Cloud Trace Python client `ListTracesRequest` reference: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.types.ListTracesRequest
- Google Cloud Trace filter syntax reference: https://docs.cloud.google.com/trace/docs/trace-filters
- BigQuery aggregate functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions

## Issues Found
- The post described a current Cloud Console page named **Trace > Analysis Reports** with a built-in two-period "Compare" workflow. Current Google Cloud documentation describes **Trace Explorer**, not a separate Analysis Reports page, and documents heatmaps, latency percentile charts, and filtering rather than a side-by-side comparison report. Updated the title, description, access instructions, comparison workflow, and wrap-up to use Trace Explorer and manual/programmatic comparison.
- The Python example imported `google.cloud.trace_v2` and called `TraceServiceClient.list_traces`. The current Python client documents `list_traces` on `google.cloud.trace_v1.services.trace_service.TraceServiceClient`; v2 is for writing spans through methods such as `create_span` and `batch_write_spans`. Updated the example to use `trace_v1.TraceServiceClient` and `trace_v1.ListTracesRequest.ViewType.ROOTSPAN`.
- The Python examples used `datetime.utcnow()`, which returns a naive datetime. Updated the examples to use `datetime.now(timezone.utc)` so the timestamps passed to the Cloud Trace client are explicitly UTC-aware.

## Review Notes
- The BigQuery snippets are syntactically plausible Standard SQL, but they assume a custom or exported table named `trace_analytics.spans` with fields such as `duration_ms`, `span_name`, and `parent_span_id`. That schema is not a built-in universal Cloud Trace table schema, so readers need to adapt the table and field names to their export pipeline.
- The embedded Python snippets were checked with `ast.parse` using `python3`.
