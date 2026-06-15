# Validation Summary: How to Configure OpenTelemetry for GCP Functions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- OpenTelemetry tracing
- OTLP HTTP trace export
- Google Cloud Trace exporters
- Node.js
- Python
- Go
- gcloud CLI environment variable configuration

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry SDK for Node.js docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- Google Cloud OpenTelemetry Operations exporters for JavaScript: https://github.com/GoogleCloudPlatform/opentelemetry-operations-js
- OpenTelemetry Python context API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/context.html
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python SDK trace docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.html
- Google Cloud OpenTelemetry exporter for Python: https://github.com/GoogleCloudPlatform/opentelemetry-operations-python/tree/main/opentelemetry-exporter-gcp-trace
- Google Cloud Run functions writing guide: https://docs.cloud.google.com/run/docs/write-functions
- Google Cloud Run functions runtime support schedule: https://docs.cloud.google.com/functions/docs/runtime-support
- gcloud functions deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- OpenTelemetry Go OTLP HTTP exporter docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
- OpenTelemetry Go semantic conventions v1.24.0 docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0

## Issues Found
- The Node.js setup omitted `@google-cloud/functions-framework`, which Google Cloud documentation expects for function source projects. Added it to the `npm install` command.
- The Python HTTP example used `context.with_(parent_context)`, which is not part of the OpenTelemetry Python context API. Replaced it with `tracer.start_as_current_span(..., context=parent_context)`, which follows the documented manual propagation pattern.
- The Go example imported `otelhttp` without using it, which would cause a compile error. Removed the unused dependency and import.
- The Go example did not register the HTTP handler with the Functions Framework. Added `functions.HTTP("HttpFunction", HttpFunction)` in `init()`, matching Google Cloud's Go Functions Framework guidance.
- The Go example passed a full URL to `otlptracehttp.WithEndpoint`, but that option expects only `host:port`. Changed it to `WithEndpointURL` for full OTLP HTTP URLs such as `https://your-backend.example.com/v1/traces`.
- The Go example always configured a localhost OTLP exporter when no endpoint was set. Changed it to add the exporter only when `OTEL_EXPORTER_OTLP_ENDPOINT` is configured.
- The Go module declared `go 1.21`, which is no longer a current Cloud Run functions runtime as of the 2026-06-15 review date. Updated the example to `go 1.24`.
- The deploy command used `nodejs18`, which is decommissioned for Cloud Run functions by the 2026-06-15 review date. Updated it to `nodejs22`.
- The multi-line `--set-env-vars` example would be split by the shell into separate arguments. Changed it to a single `--set-env-vars=...` argument.
- The `cloudfunctions.yaml` example was not a supported Cloud Functions deployment configuration format. Replaced it with an `env.yaml` example intended for use with `gcloud functions deploy --env-vars-file`.

## Review Notes
- The Pub/Sub JavaScript example uses the older background-function style signature. It remains useful for first-generation functions, but a future update could add a CloudEvents version for second-generation / Cloud Run functions.
- The examples intentionally use synchronous span export for serverless reliability; this is technically valid but can add latency, so production deployments should balance reliability and request latency.
