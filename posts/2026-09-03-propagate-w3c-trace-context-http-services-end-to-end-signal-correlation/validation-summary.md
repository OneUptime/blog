# Validation Summary: How to Propagate W3C Trace Context Across HTTP Services for End-to-End Signal Correlation

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- W3C Trace Context (`traceparent` and `tracestate`)
- W3C Baggage
- OpenTelemetry context propagation and tracing APIs
- HTTP client and server instrumentation
- Trace and log correlation

## Sources Consulted

- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [W3C Baggage](https://www.w3.org/TR/baggage/)
- [OpenTelemetry Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/)
- [OpenTelemetry General SDK Configuration](https://opentelemetry.io/docs/languages/sdk-configuration/general/#otel_propagators)
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/)
- [OpenTelemetry Trace Context in non-OTLP Log Formats](https://opentelemetry.io/docs/specs/otel/compatibility/logging_trace_context/)

## Issues Found

- The framework-independent pseudocode ended its client and server spans only on the successful path. If context injection or the HTTP request threw an exception, both `end()` calls would be skipped. Wrapped both span lifetimes in `try`/`finally` blocks so each span is always ended, matching the OpenTelemetry requirement that created spans be ended and the post's lifecycle guidance.

## Review Notes

- The pseudocode is intentionally language-neutral and illustrates lifecycle ordering rather than a directly executable language API.
- `OTEL_PROPAGATORS=tracecontext,baggage` is the current OpenTelemetry default and remains a valid explicit configuration.
