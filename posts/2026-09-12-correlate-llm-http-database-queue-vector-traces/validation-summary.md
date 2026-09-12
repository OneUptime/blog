# Validation Summary: Correlate LLM Spans with HTTP, Database, Queue, and Vector Traces

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- OpenTelemetry Python API
- Python asynchronous application instrumentation
- HTTP and database client instrumentation
- Message queue producer and consumer tracing
- Vector search and retrieval-augmented generation tracing
- LLM observability

## Sources Consulted
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
- [OpenTelemetry Python instrumentation](https://opentelemetry.io/docs/languages/python/instrumentation/)
- [OpenTelemetry Python propagation](https://opentelemetry.io/docs/languages/python/propagation/)
- [OpenTelemetry messaging span semantic conventions](https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/)
- [OpenTelemetry Propagators API specification](https://opentelemetry.io/docs/specs/otel/context/api-propagators/)

## Issues Found
No technical issues found.

## Review Notes
The Python examples use current OpenTelemetry APIs: `trace.get_tracer`, `start_as_current_span`, `propagate.inject`, `propagate.extract`, and `SpanKind`. The default dictionary carrier is suitable for the shown propagation calls, subject to adapting it to the broker's metadata format as the post states. Using the extracted creation context as the parent of a processing span is allowed for a single-message scenario; the post correctly recommends links when a single parent would misrepresent batch or multi-message causality. The messaging semantic conventions referenced by the post are currently marked Development, so their details may evolve.
