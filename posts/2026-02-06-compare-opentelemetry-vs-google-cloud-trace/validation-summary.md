# Validation Summary: How to Compare OpenTelemetry vs Google Cloud Trace

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDKs
- OpenTelemetry Collector
- Google Cloud Trace
- Google Cloud Logging
- Google Kubernetes Engine
- Go
- Python
- YAML Collector configuration

## Sources Consulted
- Google Cloud Trace Go instrumentation sample: https://docs.cloud.google.com/trace/docs/setup/go-ot
- Google Cloud OpenTelemetry Python Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/latest/_autosummary/opentelemetry.exporter.cloud_trace.html
- OpenTelemetry Collector Contrib googlecloud exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/googlecloudexporter
- OpenTelemetry Collector Contrib resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector Contrib probabilistic sampler and tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/probabilisticsamplerprocessor and https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/tailsamplingprocessor
- Google Cloud Logging structured logging documentation: https://docs.cloud.google.com/logging/docs/structured-logging
- Google Cloud Trace log integration documentation: https://docs.cloud.google.com/trace/docs/trace-log-integration
- OpenTelemetry Python trace ID formatting API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- Google-Built OpenTelemetry Collector on GKE documentation: https://docs.cloud.google.com/stackdriver/docs/instrumentation/opentelemetry-collector-gke
- Google Cloud Observability pricing: https://cloud.google.com/products/observability/pricing
- Google Cloud Trace quotas and retention documentation: https://docs.cloud.google.com/trace/docs/quotas

## Issues Found
- The Go example called `processRequest(ctx)` without defining `processRequest`, so the example was not syntactically complete. Added a minimal placeholder function.
- The Python tracing example called `process(request)` without defining `process`, so the example was not self-contained. Added a minimal placeholder function.
- The Collector example used `resourcedetection`, which is now documented as a deprecated alias. Updated the processor type and pipeline reference to `resource_detection`.
- The Cloud Logging correlation example used raw OpenTelemetry Python integer trace and span IDs and omitted the required `projects/[PROJECT_ID]/traces/[TRACE_ID]` trace resource format. Updated the example to use `format_trace_id`, `format_span_id`, and the full Cloud Logging trace field format.
- The GKE section described the Collector as a managed component and referred to a GKE OpenTelemetry add-on. Current Google documentation describes deploying the Google-Built OpenTelemetry Collector on GKE, and OpenTelemetry auto-instrumentation uses the OpenTelemetry Operator pattern. Updated the wording and comments accordingly.

## Review Notes
The core recommendation to use OpenTelemetry SDKs with a Collector and the `googlecloud` exporter for Cloud Trace is consistent with Google Cloud guidance. Pricing and 30-day Cloud Trace retention matched current Google Cloud documentation as of 2026-06-06. The direct in-process Cloud Trace exporters are valid, but Google currently recommends the Collector path when the environment supports it.
