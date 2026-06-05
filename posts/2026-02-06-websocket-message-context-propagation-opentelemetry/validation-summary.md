# Validation Summary: Trace WebSocket Message Flows with Per-Message OpenTelemetry Context Propagation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API
- W3C Trace Context
- WebSocket
- Node.js `ws`
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- `ws` official README and API examples: https://github.com/websockets/ws
- MDN WebSocket message event documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event

## Issues Found
- The message envelope required `traceparent`, but OpenTelemetry's documented carrier type allows `traceparent` and `tracestate` to be optional. Changed `traceparent` to optional to match the injected carrier shape.
- The client and server spans used default/internal or server span kinds for message send/receive work. Updated message send/reply spans to `SpanKind.PRODUCER` and receive processing spans to `SpanKind.CONSUMER`, matching OpenTelemetry messaging semantics for propagated message creation and processing contexts.
- The `ws` server example typed incoming message data as `string`, but current `ws` examples expose message data as raw data that may be a buffer. Updated the snippet to use `RawData` and parse `raw.toString()`.
- The response section said to link request and response messages with span links, but the example did not create OpenTelemetry span links. Updated the text to describe correlation through reply metadata and active trace context propagation, which is what the code actually does.
- The response helper used the `WebSocket` type without importing it in the server snippet. Updated the `ws` import to include `WebSocket`.

## Review Notes
The propagation approach is technically valid for custom protocols: inject context into a carrier before sending, extract it on receipt, and create downstream spans from the extracted context. Future improvements could use stable semantic attribute names from OpenTelemetry messaging conventions instead of custom `ws.*` attributes, but the custom attributes shown are not technically invalid.
