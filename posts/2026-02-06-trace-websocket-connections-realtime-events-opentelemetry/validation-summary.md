# Validation Summary: How to Trace WebSocket Connections and Real-Time Events with OpenTelemetry

## Status
validated

## Post Type
Tutorial / instrumentation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK and API
- OpenTelemetry trace context propagation
- OpenTelemetry Metrics API
- OTLP HTTP trace exporter
- Node.js
- ws WebSocket library
- WebSocket protocol lifecycle and messaging

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry JavaScript Meter API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Meter.html
- OpenTelemetry JavaScript published package type definitions for `@opentelemetry/resources` 2.7.1, `@opentelemetry/sdk-node` 0.218.0, `@opentelemetry/api` 1.9.1, and `@opentelemetry/semantic-conventions` 1.41.1: https://www.npmjs.com/org/opentelemetry
- ws API documentation: https://github.com/websockets/ws/blob/master/doc/ws.md
- ws README and published package metadata for ws 8.21.0: https://github.com/websockets/ws
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The SDK setup used `new Resource(...)` from `@opentelemetry/resources`. In the current OpenTelemetry JavaScript resources package, `Resource` is exported as a type/interface and resources are created with helpers such as `resourceFromAttributes()`. Updated the import and SDK configuration accordingly.
- The `ws` message handler inferred text versus binary messages with `typeof data === 'string'`. Current `ws` message callbacks provide `(data, isBinary)`, and `data` is documented as `ArrayBuffer`, `Blob`, `Buffer`, or `Buffer[]`. Updated the handler to use `isBinary` and added a small `getMessageSize()` helper that handles `Buffer`, fragmented `Buffer[]`, and `ArrayBuffer`-like payloads.
- The connection lifecycle snippet called `handleMessage(ws, data)` even though the later custom-attributes example defines `handleMessage(ws, raw, messageSpan)` and uses the span. Updated the call to pass `messageSpan`.
- The span hierarchy diagram showed a child `ws.connection.close` span, but the lifecycle code records close code and reason as attributes on the connection span and then ends it. Removed the extra close span from the diagram so it matches the implementation.

## Review Notes
The OpenTelemetry APIs for `trace.setSpan`, `tracer.startSpan`, `propagation.inject`, `propagation.extract`, `createUpDownCounter`, `createCounter`, and `createHistogram` match current documented JavaScript API usage. WebSocket-specific semantic attributes such as `ws.message.type` and `ws.event.type` are custom attributes rather than stable OpenTelemetry semantic conventions; this is acceptable for an instrumentation guide, but future revisions could mention that they are application-defined.
