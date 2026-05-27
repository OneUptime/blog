# Validation Summary: How to Set Up Cross-Project Trace Aggregation on Google Cloud

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Trace
- Google Cloud Observability trace scopes
- Cloud Trace sinks and BigQuery export
- OpenTelemetry Python SDK and Google Cloud Trace exporter
- OpenTelemetry Collector contrib googlecloud exporter
- W3C Trace Context propagation
- Google Cloud IAM and Terraform IAM bindings
- Kubernetes Deployment configuration

## Sources Consulted
- Google Cloud Trace: Configure exports: https://docs.cloud.google.com/trace/docs/trace-export-configure
- Google Cloud Trace: Create and manage trace scopes: https://docs.cloud.google.com/trace/docs/trace-scope/create-and-manage
- Google Cloud Trace: Find and explore traces: https://docs.cloud.google.com/trace/docs/finding-traces
- Google Cloud Trace setup and IAM guidance: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Python client library, Cloud Trace v1 `TraceServiceClient` and `ListTracesRequest`: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.services.trace_service.TraceServiceClient and https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.types.ListTracesRequest
- Google Cloud Python client library, Cloud Trace v1 `TraceSpan`: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v1.types.TraceSpan
- Google Cloud Python client library, Cloud Trace v2 `TraceServiceClient`: https://docs.cloud.google.com/python/docs/reference/cloudtrace/latest/google.cloud.trace_v2.services.trace_service.TraceServiceClient
- Google Cloud OpenTelemetry Python Cloud Trace exporter docs: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector contrib googlecloud exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Google Cloud Observability pricing: https://cloud.google.com/stackdriver/pricing

## Issues Found
- The post described Cloud Trace sinks as forwarding traces into another Cloud Trace project with `--destination=projects/project-central/traces`. Google Cloud Trace sinks export spans to BigQuery datasets, not Cloud Trace projects. Replaced the section with the GCP-native trace scopes workflow and clarified that trace sinks are for BigQuery export.
- The OpenTelemetry Collector config used `${SOURCE_PROJECT_ID}` environment substitution and an unsupported `trace.batch.max_batch_items` block under the `googlecloud` exporter. Updated the environment reference to `${env:SOURCE_PROJECT_ID}` and removed the unsupported exporter block.
- The Python Cloud Trace exporter example added source project information as a resource attribute but did not configure the exporter to copy resource attributes to Cloud Trace labels. Added `resource_regex` to the exporter example and explained when to use it.
- The query examples used `google.cloud.trace_v2` with `ListTracesRequest` and `list_traces`, but listing traces is exposed by the v1 client library. Updated the examples to `trace_v1.TraceServiceClient`, `trace_v1.ListTracesRequest`, and `ViewType.COMPLETE`.
- The Cloud Trace filter syntax used non-existent fields such as `rootSpan.name` and `spanName`. Replaced them with documented v1 filter syntax such as `root:checkout` and `span:auth-service`.
- The Python examples referenced v2-style span fields (`attributes`, `display_name`, `duration_ms`) on listed traces. Updated them to use v1 `TraceSpan` fields (`labels`, `name`, `start_time`, and `end_time`).
- The health-check snippet referenced `trace_v1` without importing it and did not apply its `time_range_hours` parameter. Added the import and bounded the query with `start_time` and `end_time`.
- The cost and best-practice sections referred to trace sinks as a duplicate Cloud Trace ingestion path. Reworded those references to central export and trace scopes.

## Review Notes
- Trace scopes provide a multi-project view in Trace Explorer; they do not move trace data into a central project. Centralized export through application instrumentation or an OpenTelemetry Collector is still the right pattern when all spans must be stored in one Cloud Trace project.
- Trace sinks are currently an alpha Google Cloud CLI surface and are for BigQuery export. They can be useful for analytics, but not for Cloud Trace aggregation.
- The service account examples use App Engine default service account addresses as placeholders. Real deployments should use the actual runtime service accounts for Cloud Run, GKE Workload Identity, Compute Engine, or App Engine.
