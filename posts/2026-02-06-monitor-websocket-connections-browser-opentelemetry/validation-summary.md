# Validation Summary: How to Monitor WebSocket Connections from the Browser with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry browser tracing
- OpenTelemetry metrics
- OTLP HTTP exporters
- Browser WebSocket API
- JavaScript

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript package API documentation for `@opentelemetry/resources`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JavaScript package API documentation for `@opentelemetry/exporter-trace-otlp-http`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry JavaScript package API documentation for `@opentelemetry/exporter-metrics-otlp-http`: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-http.html
- MDN WebSocket `send()` documentation: https://developer.mozilla.org/docs/Web/API/WebSocket/send
- MDN WebSocket `message` event documentation: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket/message_event
- MDN WebSocket `CloseEvent.code` documentation: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code

## Issues Found
- The OpenTelemetry setup used `new Resource(...)` and `provider.addSpanProcessor(...)`, which do not match the current OpenTelemetry JS 2.x API surface. Updated the setup to use `defaultResource().merge(resourceFromAttributes(...))` and the `spanProcessors` constructor option for `WebTracerProvider`.
- The metrics example called `metrics.getMeter()` but the setup did not install or configure a metrics SDK, so metric instruments would use the no-op global meter provider. Added `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, an `OTLPMetricExporter`, a `PeriodicExportingMetricReader`, and `metrics.setGlobalMeterProvider(...)`.
- The WebSocket wrapper measured message size with `.length`, which is incorrect for `Blob`, `ArrayBuffer`, typed arrays, and UTF-8 byte size of strings. Added a `getMessageSize()` helper that handles browser WebSocket payload types.
- The wrapper always passed `protocols` as the second WebSocket constructor argument, even when it was undefined. Updated it to omit the second argument when no protocols are provided.
- The connection span could be ended more than once if an error event occurred after the connection was already opened. Added a small guard helper to end the connection span once.
- The post described `retryDelay * retryCount` as exponential backoff. Changed the wording to "increasing backoff" to match the code.
- The metrics helper described sent and received message counts but only included a send helper. Added `recordMessageReceived()`.
- The post called the wrapper a drop-in replacement, but the wrapper only proxies event handlers plus `send()` and `close()`. Clarified that applications reading properties such as `readyState`, `protocol`, or `bufferedAmount` should proxy those properties too.

## Review Notes
Browser OpenTelemetry instrumentation remains experimental and mostly unspecified in the official OpenTelemetry JavaScript documentation. The examples are valid for current OpenTelemetry JS APIs, but production browser deployments still need CORS, CSP, collector exposure, and payload-cardinality review.
