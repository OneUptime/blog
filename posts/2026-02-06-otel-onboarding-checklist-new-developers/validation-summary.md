# Validation Summary: How to Build an OpenTelemetry Onboarding Checklist for New Developers Joining

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Jaeger
- Docker Compose
- Python OpenTelemetry API
- Go OpenTelemetry API
- jq

## Sources Consulted
- OpenTelemetry Collector documentation: https://opentelemetry.io/docs/collector/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go metrics API documentation: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry semantic convention metric naming and units documentation: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- Jaeger getting started documentation: https://www.jaegertracing.io/docs/latest/getting-started/
- Jaeger API documentation for OTLP support: https://www.jaegertracing.io/docs/latest/architecture/apis/

## Issues Found
- The Docker Compose example mounted the Collector config to `/etc/otelcol/config.yaml` while using the `otel/opentelemetry-collector-contrib` image. The contrib distribution defaults to `/etc/otelcol-contrib/config.yaml`, so the custom config might not be loaded. Updated the volume mount path.
- The Go metric snippet used `ctx` and `attribute.String` without defining or importing them. Added the `context` and `attribute` imports and changed `createOrder` to accept `ctx context.Context`.
- The Go counter was named `orders.created.count` while also setting a unit. OpenTelemetry metric guidance says conventional metric names should not include units when the unit is provided in metadata, and non-unit count annotations should use UCUM-style curly braces. Updated the metric name to `order.created` and the unit to `{order}`.

## Review Notes
- The Python span example matches current OpenTelemetry Python manual instrumentation patterns, including `trace.get_tracer`, `start_as_current_span`, and `set_attribute`.
- The Collector OTLP receiver and OTLP exporter configuration is valid for sending traces to Jaeger over OTLP/gRPC with insecure local TLS settings.
- Jaeger all-in-one supports OTLP ingestion on ports 4317 and 4318 in current documentation. Older Jaeger 1.x releases required `COLLECTOR_OTLP_ENABLED=true`; keeping that environment variable is harmless for the local onboarding example.
- The examples use `latest` container tags, which is acceptable for a local onboarding checklist but should be pinned in production training material.
