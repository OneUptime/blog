# Validation Summary: How to Build Span Event Design

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (specifically the `@opentelemetry/api` JavaScript/TypeScript package)
- Distributed tracing concepts (spans, span events, exception events, semantic conventions)
- TypeScript
- Mermaid diagrams for visualization

## Sources Consulted
- OpenTelemetry JS API `Span` interface: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.Span.html
- OpenTelemetry specification for span events and `recordException`: https://opentelemetry.io/docs/specs/otel/trace/api/#record-exception
- OpenTelemetry semantic conventions for exceptions: https://opentelemetry.io/docs/specs/semconv/exceptions/exceptions-spans/
- `@opentelemetry/api` source: https://github.com/open-telemetry/opentelemetry-js/blob/main/api/src/trace/span.ts

## Issues Found

1. **Incorrect `recordException` signature (Section 3, "Handling Multiple Exceptions")** — The original code called `span.recordException(lastError, { 'attempt.number': attempt, 'retry.will_retry': attempt < maxRetries })`, passing an attributes object as the second argument. The OpenTelemetry JS API signature is `recordException(exception: Exception, time?: TimeInput): void` — the second argument is a `TimeInput` (timestamp), not an attributes bag. Passing attributes there would either be ignored or cause a runtime type confusion (the SDK treats it as a TimeInput). Fixed by splitting into `span.recordException(lastError)` followed by a separate `span.addEvent('fetch.attempt_failed', { ... })` that captures the retry-specific context.

2. **Non-existent `span.startTime` property (Section 5, "Business Event Implementation")** — The original code computed `Date.now() - span.startTime[0] * 1000` to derive the checkout duration. The `Span` interface in `@opentelemetry/api` does not expose `startTime`; that property only exists on `ReadableSpan` in the SDK (`@opentelemetry/sdk-trace-base`), which is not what user code receives from `tracer.startSpan(...)`. This code would fail to type-check and would throw at runtime. Fixed by capturing `const checkoutStartMs = Date.now()` before starting the span and using `Date.now() - checkoutStartMs` for the duration calculation.

## Review Notes

- Exception semantic conventions (`exception.type`, `exception.message`, `exception.stacktrace`, `exception.escaped`) used in the structure diagram match the current OpenTelemetry semantic conventions for exceptions.
- The `addEvent`, `setStatus`, `setAttribute`, `recordException`, and `end` API usage (other than the issues fixed above) is consistent with the current `@opentelemetry/api` interface.
- `SpanStatusCode.OK` and `SpanStatusCode.ERROR` are valid enum members.
- The post correctly describes that span events are timestamped annotations attached to spans with name, timestamp, and attributes — matching the OpenTelemetry specification.
- The advice to keep attribute cardinality bounded and avoid PII aligns with OpenTelemetry guidance.
- The decision matrix for "event vs child span" is reasonable guidance, though the spec itself does not strictly prescribe one over the other in every case — this is a judgement call presented as such.
- Minor: the `Span` import in `Section 5 – Business Event Implementation` is unused but harmless and not technically incorrect, so left as-is.
