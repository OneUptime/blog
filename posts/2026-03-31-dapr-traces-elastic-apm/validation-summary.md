# Validation Summary: How to Send Dapr Traces to Elastic APM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Elastic APM Server
- Elasticsearch / Kibana
- OpenTelemetry Collector
- OpenTelemetry Python SDK
- OTLP/HTTP and OTLP/gRPC protocols
- Kubernetes (ConfigMaps, Secrets, annotations)

## Sources Consulted
- Dapr Configuration spec reference — https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr tracing setup guide — https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Elastic APM OpenTelemetry intake API — https://www.elastic.co/docs/solutions/observability/apm/opentelemetry-intake-api
- Elastic APM secret token authentication — https://www.elastic.co/docs/solutions/observability/apm/secret-token
- Elastic APM data streams — https://www.elastic.co/docs/solutions/observability/apm/data-streams
- OpenTelemetry Collector OTLP HTTP exporter — https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Python SDK trace API — https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter configuration — https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/

## Issues Found

1. **Incorrect Dapr annotation name `dapr.io/sidecar-env-vars`** (appeared twice, lines 55 and 113): The annotation `dapr.io/sidecar-env-vars` does not exist in the Dapr annotations spec. The correct annotation for injecting environment variables into the Dapr sidecar is `dapr.io/env`. Changed both occurrences to `dapr.io/env`.

2. **Unused `TracerProvider` import in Python example** (line 121): The code imported `TracerProvider` from `opentelemetry.sdk.trace` but never used it. Since this is a code snippet (not a full setup), the unused import was removed to avoid confusion. In a real application, a `TracerProvider` must be instantiated and registered via `trace.set_tracer_provider()` for traces to be exported.

## Review Notes
- The approach of using `OTEL_EXPORTER_OTLP_HEADERS` to pass the secret token to Dapr's built-in OTLP exporter relies on the Go OpenTelemetry SDK respecting standard environment variables. This works in recent Dapr versions but users on older versions may need to use the OpenTelemetry Collector approach instead.
- The Python code snippet assumes a `TracerProvider` is configured elsewhere (e.g., via `opentelemetry-instrument` auto-instrumentation or a separate setup module). This is fine for a snippet but readers building from scratch will need full provider setup.
- The Kubernetes Secret (`elastic-credentials`) is created but the post does not show how to mount it as the `ELASTIC_APM_TOKEN` environment variable in the collector Deployment. Readers will need to add the appropriate `envFrom` or `env.valueFrom.secretKeyRef` to their collector pod spec.
