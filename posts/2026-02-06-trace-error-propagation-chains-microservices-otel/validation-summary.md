# Validation Summary: How to Trace Error Propagation Chains Across Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Python tracing API
- OpenTelemetry exception span events
- Distributed tracing
- Grafana Tempo TraceQL
- Python

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry trace exception semantic convention: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry trace API status specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry service resource semantic convention: https://opentelemetry.io/docs/specs/semconv/resource/service/
- Grafana Tempo TraceQL query construction docs: https://grafana.com/docs/tempo/latest/traceql/construct-traceql-queries/

## Issues Found
- The error chain analyzer used `span.startTimeUnixNano` as the node timestamp while claiming to sort errors chronologically. Because parent spans often start before downstream spans, this can order propagation incorrectly. Changed the analyzer to prefer the exception event's `timeUnixNano`, falling back to span start time only when the event timestamp is unavailable.
- `format_chain()` assumed `chain.root_cause` was always present and would raise an `AttributeError` for traces with no matching error events. Added a guard that returns a clear "No error spans found." message.
- The TraceQL explanation described the query as directly finding errors propagated from payment to the API gateway, but the `>>` operator follows descendant span structure from the API gateway to downstream services. Updated the sentence to describe the downstream call path and the corresponding upstream error propagation.

## Review Notes
The OpenTelemetry Python APIs used in the snippets are current: `start_as_current_span()`, `set_attribute()`, `record_exception()`, and `set_status()` are valid APIs. OpenTelemetry recommends recording exceptions as span events with the event name `exception` and attributes such as `exception.type` and `exception.message`; setting span status to `ERROR` with recorded exceptions is consistent with the official guidance. The custom `error.*` attributes in the post are application-specific metadata, not standardized OpenTelemetry semantic convention attributes.
