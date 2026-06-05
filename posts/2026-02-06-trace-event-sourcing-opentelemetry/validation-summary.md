# Validation Summary: How to Trace Event Sourcing Systems with OpenTelemetry: From Command to Event

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Python API and SDK
- OTLP trace exporting
- Event sourcing
- CQRS projections
- PostgreSQL database spans
- Distributed tracing span links

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API reference: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python OTLP exporters documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/db/

## Issues Found
- The event store examples used older database semantic convention attributes `db.system` and `db.operation`. Updated them to the current stable OpenTelemetry database span attributes `db.system.name` and `db.operation.name`.

## Review Notes
The Python snippets are syntactically valid. The examples reference application-specific classes such as `OrderAggregate` and `Event`, so they are illustrative rather than standalone runnable examples. Span links, `start_as_current_span`, span attributes, span events, `SpanKind.CLIENT`, `BatchSpanProcessor`, and the OTLP gRPC span exporter usage are consistent with current OpenTelemetry documentation.
