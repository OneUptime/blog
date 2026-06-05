# Validation Summary: How to Monitor SaaS Platform White-Label Deployment Performance Across Customer

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Protocol exporters
- OpenTelemetry Collector
- OpenTelemetry Collector processors
- YAML configuration
- Python custom metrics and tracing

## Sources Consulted
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python metrics internal API documentation: https://opentelemetry-python.readthedocs.io/en/latest/_modules/opentelemetry/metrics/_internal.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry service semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector batch processor documentation: https://pkg.go.dev/go.opentelemetry.io/collector/processor/batchprocessor
- OpenTelemetry Collector attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md

## Issues Found
- The telemetry setup snippet imported and used `BatchSpanExporter`, which is not the correct OpenTelemetry Python span processor class. Changed it to `BatchSpanProcessor`, matching the official Python exporter examples.
- The telemetry setup snippet used `os.environ` without importing `os`. Added the missing import.
- The Collector configuration declared `groupbyattrs` but did not include it in the trace pipeline. Added it to the processor list so the declared grouping step is actually applied.
- The Collector configuration described the `batch` processor as batching per deployment, but the shown configuration batches telemetry generally. Updated the comment to avoid implying per-deployment batching.
- The Collector exporter comment implied conditional routing to a customer backend, but the shown pipeline only exports to the central backend. Updated the comment so it does not claim routing behavior that is not configured.
- The deployment health snippet used `time.time()` without importing `time`. Added the missing import.
- The version rollout snippet used undefined `meter` and `tracer` names. Added the corresponding OpenTelemetry imports and meter/tracer initialization.
- The version rollout metric was named as an active-version metric but implemented as a monotonic counter. Changed it to a health-check counter and recorded each health check with deployment, version, and health attributes.

## Review Notes
The Python and YAML snippets were syntax-checked after editing. The Collector example remains a simplified ingestion pipeline; true customer-specific conditional routing would need an explicit routing component or separate deployment-specific pipeline configuration.
