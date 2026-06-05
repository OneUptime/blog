# Validation Summary: How to Replace Google Cloud Trace Client Libraries with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Google Cloud Trace
- Google Cloud Telemetry (OTLP) API
- OpenTelemetry SDKs and exporters
- OpenTelemetry Collector
- Go
- Python
- Node.js
- Google Cloud Run
- Google Kubernetes Engine

## Sources Consulted
- Google Cloud Trace instrumentation overview: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Trace migration to OTLP endpoints: https://docs.cloud.google.com/trace/docs/migrate-to-otlp-endpoints
- Google Cloud Trace Go OpenTelemetry sample: https://docs.cloud.google.com/trace/docs/setup/go-ot
- Google Cloud Run distributed tracing documentation: https://docs.cloud.google.com/run/docs/trace
- Google Cloud Telemetry (OTLP) API overview: https://cloud.google.com/stackdriver/docs/reference/telemetry/overview
- Google Cloud OpenTelemetry Python documentation: https://google-cloud-opentelemetry.readthedocs.io/en/latest/index.html
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- Google Cloud OpenTelemetry JavaScript exporter repository: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/

## Issues Found
- The post said the Cloud Trace backend natively accepts OTLP data. Updated this to refer to Google Cloud's Telemetry (OTLP) API, which is the documented OTLP ingestion path for traces.
- The post said Cloud Trace client libraries receive only maintenance updates. Removed this unsupported maintenance-status claim because the official Cloud Trace setup page recommends OpenTelemetry but does not make that specific lifecycle statement.
- The Node.js snippet used `new Resource(...)` from `@opentelemetry/resources`, which is no longer the documented construction API in current OpenTelemetry JavaScript. Updated it to `resourceFromAttributes(...)`.
- The Node.js snippet imported and instantiated `GcpDetector` from the package root. Current `@opentelemetry/resource-detector-gcp` exports `gcpDetector` from the package root, so the snippet now uses `resourceDetectors: [gcpDetector]`.
- The Cloud Run section said Cloud Run provides a native OTLP endpoint and forwards traces to Cloud Trace when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Replaced this with the documented behavior: Cloud Run automatically creates request traces and populates `traceparent`; custom OpenTelemetry spans should be exported directly to `https://telemetry.googleapis.com` with authentication or through a Collector.
- The authentication note only mentioned `roles/cloudtrace.agent` and said spans would be silently dropped. Clarified that the Cloud Trace exporter uses ADC and needs `roles/cloudtrace.agent`, while direct Telemetry API export needs `roles/telemetry.tracesWriter`.
- The summary referred to a "Cloud Trace OTLP endpoint." Updated it to "Telemetry (OTLP) API."

## Review Notes
The direct Google Cloud Trace exporters shown in the language snippets are still usable, but Google Cloud's current documentation recommends OTLP export to the Telemetry API, usually through a Collector when the environment supports one. The Go code was not compiled locally because the workspace image does not include the `go` toolchain; it was checked against Google Cloud and OpenTelemetry documentation instead. The corrected Node.js snippet was validated against the latest npm packages in a temporary directory.
