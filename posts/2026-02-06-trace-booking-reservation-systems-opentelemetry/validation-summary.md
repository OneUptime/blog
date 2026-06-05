# Validation Summary: How to Trace Booking and Reservation Systems with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry Node.js SDK
- OpenTelemetry OTLP gRPC trace exporter
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry tracing, spans, span status, events, exceptions, and metrics
- Distributed tracing for booking and reservation workflows

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript semantic-conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/functions/_opentelemetry_resources.resourceFromAttributes.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/concepts/semantic-conventions/

## Issues Found
- The setup snippet imported `Resource` from `@opentelemetry/resources` and used `new Resource(...)`. Current OpenTelemetry JavaScript documentation uses `resourceFromAttributes(...)`, so the snippet was updated accordingly.
- The setup snippet imported `SemanticResourceAttributes`, which is deprecated in favor of `ATTR_*` constants. It now imports `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The OTLP gRPC exporter URL used `grpc://otel-collector:4317`. The OTLP exporter specification requires gRPC endpoint URLs with `http` or `https` schemes when using URL-form endpoints, so this was changed to `http://otel-collector:4317`.
- The payment span used `trace.SpanKind.CLIENT`, but `SpanKind` is exported from `@opentelemetry/api`, not as a property of the `trace` namespace. The snippet now imports `SpanKind` and uses `SpanKind.CLIENT`.

## Review Notes
The examples remain illustrative and depend on application-specific objects such as `inventoryDb`, `distributedLock`, `paymentGateway`, and rollback/confirmation helpers. The tracing and metrics API usage is otherwise consistent with current OpenTelemetry JavaScript documentation.
