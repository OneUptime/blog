# Validation Summary: How to Use Dapr with GCP Cloud Trace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Google Cloud Trace (distributed tracing)
- OpenTelemetry Collector (with Google Cloud exporter)
- Zipkin (trace format and proxy)
- Python / Flask (trace context propagation example)
- Go / OpenTelemetry Go SDK (custom span attributes example)
- Google Cloud CLI (gcloud)
- Docker

## Sources Consulted
- Dapr Configuration reference — https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr Zipkin tracing setup — https://docs.dapr.io/operations/observability/tracing/zipkin/
- Dapr W3C TraceContext overview — https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr service invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- OpenTelemetry Collector Google Cloud exporter — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/googlecloudexporter/README.md
- openzipkin/zipkin-gcp GitHub — https://github.com/openzipkin/zipkin-gcp
- openzipkin/zipkin-gcp Docker Hub — https://hub.docker.com/r/openzipkin/zipkin-gcp
- Google Cloud Trace Zipkin docs — https://cloud.google.com/trace/docs/zipkin
- Google Cloud Trace REST API (projects.traces.list) — https://cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- gcloud alpha trace SDK reference — https://cloud.google.com/sdk/gcloud/reference/alpha/trace
- OpenTelemetry Go SDK (otel package) — https://pkg.go.dev/go.opentelemetry.io/otel
- OpenTelemetry Go SDK (attribute package) — https://pkg.go.dev/go.opentelemetry.io/otel/attribute

## Issues Found

1. **Incorrect Docker image for Zipkin-to-Cloud Trace proxy**: The post used `gcr.io/cloud-trace/zipkin-collector:latest` with a `--google-project-id` CLI flag. This image does not exist. Fixed to use `openzipkin/zipkin-gcp:latest` with the correct environment variables (`STORAGE_TYPE=stackdriver` and `STACKDRIVER_PROJECT_ID`).

2. **Non-existent `gcloud trace traces list` command**: The `gcloud trace traces list` command does not exist in any gcloud release track (GA, beta, or alpha). Replaced with a direct REST API call to `cloudtrace.googleapis.com/v1/projects/{project}/traces` using `curl` and `gcloud auth print-access-token`.

3. **Missing Go imports**: The Go code snippet for custom span attributes only imported `go.opentelemetry.io/otel` but used `context.Context` and `attribute.String()` without importing `"context"` or `"go.opentelemetry.io/otel/attribute"`. This would fail to compile. Added the missing imports.

4. **Non-canonical OTel exporter endpoint**: The Cloud Trace exporter endpoint was specified as `cloudtrace.googleapis.com:443`. While functionally equivalent, the canonical form in official documentation is `cloudtrace.googleapis.com` without the port suffix (port 443 is implied by gRPC/TLS defaults). Fixed to match canonical form.

## Review Notes
- The Zipkin proxy approach (Approach 2) is increasingly deprecated in favor of the OpenTelemetry Collector (Approach 1). OpenTelemetry formally deprecated its Zipkin exporters in December 2025. The post correctly positions the OTel Collector as the "recommended approach," but readers should be aware the Zipkin proxy path may be removed entirely in the future.
- The Go code example omits TracerProvider initialization (e.g., `sdktrace.NewTracerProvider(...)` with `otel.SetTracerProvider(tp)`). Without this setup, `otel.Tracer()` falls back to a no-op provider and spans are not exported. This is acceptable for a focused snippet but could confuse readers trying to run it end-to-end.
- The Python Flask example correctly demonstrates manual trace header forwarding, though as the code comment notes, Dapr's service invocation already handles this automatically — the example is illustrative rather than strictly necessary.
