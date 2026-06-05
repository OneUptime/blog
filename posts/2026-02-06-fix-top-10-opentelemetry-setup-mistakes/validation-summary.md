# Validation Summary: How to Fix the Top 10 OpenTelemetry Setup Mistakes That Silently Drop Your

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Python API
- OpenTelemetry Collector
- OTLP over gRPC and HTTP/protobuf
- Collector processors and exporters
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries docs: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting docs: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector exporterhelper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector memory_limiter processor README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api

## Issues Found
- The JavaScript `service.name` example used `new Resource(...)`. Current OpenTelemetry JavaScript docs use `resourceFromAttributes(...)` from `@opentelemetry/resources`, so the snippet was updated to the current API.
- The `memory_limiter` explanation said the Collector will OOM-crash without it. The processor helps prevent out-of-memory situations but is not a complete replacement for sizing and configuration, so the wording was adjusted to avoid an absolute claim.
- The debug exporter section said it writes every single telemetry item to stdout. Current debug exporter behavior depends on verbosity, sampling, and output configuration, so the wording was corrected while preserving the production warning.
- The sending queue section implied that missing explicit queue configuration means no queue and immediate loss. Current exporterhelper defaults enable `sending_queue` and `retry_on_failure` for exporters that use it, so the section was updated to focus on tuning or avoiding disabled/undersized queues.

## Review Notes
The remaining examples and claims match current OpenTelemetry documentation: SDK initialization must happen before app modules are loaded, `service.name` should be set explicitly, OTLP defaults are 4317 for gRPC and 4318 for HTTP, Collector components must be enabled in `service.pipelines`, spans should be ended, span names should remain low-cardinality, and `BatchSpanProcessor` is preferred for production applications.
