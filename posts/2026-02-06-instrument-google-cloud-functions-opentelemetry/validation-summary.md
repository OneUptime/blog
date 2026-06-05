# Validation Summary: How to Instrument Google Cloud Functions with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Functions / Cloud Run functions
- Google Cloud SDK `gcloud functions deploy`
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python SDK
- OTLP gRPC trace export
- Google Cloud Trace exporter
- Node.js
- Python
- Pub/Sub CloudEvents

## Sources Consulted
- Google Cloud SDK `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Functions / Cloud Run functions Pub/Sub CloudEvent Python sample: https://docs.cloud.google.com/functions/docs/running/direct
- Google Cloud Functions / Cloud Run functions handler registration docs: https://docs.cloud.google.com/run/docs/write-http-functions
- Google Cloud Trace OpenTelemetry setup docs: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Trace OTLP migration docs: https://docs.cloud.google.com/trace/docs/migrate-to-otlp-endpoints
- Google Cloud collector-based OpenTelemetry sample overview: https://docs.cloud.google.com/trace/docs/setup/sample-overview
- OpenTelemetry JavaScript `@opentelemetry/resources` package documentation: https://www.npmjs.com/package/@opentelemetry/resources
- OpenTelemetry JavaScript `@opentelemetry/sdk-node` package documentation: https://www.npmjs.com/package/@opentelemetry/sdk-node
- OpenTelemetry JavaScript OTLP gRPC trace exporter documentation: https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-grpc
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/

## Issues Found
- The post described adding "tracing and metrics", but the examples only configure trace providers and trace exporters. Updated the description and introduction to refer to tracing only.
- The Node.js initialization imported and constructed `Resource`, which is not the current documented `@opentelemetry/resources` pattern. Replaced it with `resourceFromAttributes(...)`.
- The Python CloudEvent handler used Functions Framework but did not register the function as a CloudEvent handler. Added `import functions_framework` and `@functions_framework.cloud_event`, matching Google Cloud's Python CloudEvent examples.
- The Node.js force-flush helper checked `forceFlush` directly on the API tracer provider. In current OpenTelemetry JS, `trace.getTracerProvider()` can return a proxy provider, so the helper could silently skip flushing. Updated it to use the provider delegate when available before calling `forceFlush`.
- The Python requirements included `opentelemetry-instrumentation-requests`, but the example does not enable requests instrumentation or use outgoing HTTP calls. Removed the unused dependency to keep the serverless dependency set minimal.

## Review Notes
- The pinned Python OpenTelemetry versions are older than the latest available releases, but the APIs shown remain valid for the pinned versions.
- The Node.js deploy command flags match the current `gcloud functions deploy` reference for a Gen 2 HTTP-triggered function.
- Google now documents direct OTLP export to Cloud Trace via the Telemetry API as the preferred direct-export path for trace data; the separate Google Cloud Trace exporter package is still a plausible alternative, but future revisions could expand that section with OTLP-to-Google authentication details.
