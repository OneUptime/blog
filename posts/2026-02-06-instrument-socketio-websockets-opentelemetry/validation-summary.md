# Validation Summary: How to Instrument Socket.io WebSockets with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- Socket.IO 4.x
- Engine.IO
- WebSocket
- Node.js
- Express
- JavaScript tracing and metrics

## Sources Consulted
- OpenTelemetry JavaScript instrumentation docs: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript browser docs: https://opentelemetry.io/docs/languages/js/getting-started/browser/
- OpenTelemetry resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry semantic conventions package docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- Socket.IO rooms docs: https://socket.io/docs/v4/rooms/
- Socket.IO middleware docs: https://socket.io/docs/v4/middlewares/
- Socket.IO server API docs: https://socket.io/docs/v4/server-api/

## Issues Found
- The dependency installation command omitted `@opentelemetry/auto-instrumentations-node`, even though `tracing.js` imports `getNodeAutoInstrumentations`. Added the missing package.
- The OpenTelemetry initialization used `new Resource(...)` and `SemanticResourceAttributes`, which are outdated for current OpenTelemetry JavaScript examples. Replaced them with `resourceFromAttributes(...)` and `ATTR_SERVICE_NAME` / `ATTR_SERVICE_VERSION`.
- The post created custom metrics but did not configure a metric exporter or metric reader, so metrics would not be exported by the SDK. Added `@opentelemetry/sdk-metrics`, `@opentelemetry/exporter-metrics-otlp-http`, `OTLPMetricExporter`, and `PeriodicExportingMetricReader`.
- The trace exporter example used the general `OTEL_EXPORTER_OTLP_ENDPOINT` value as a full traces URL. Changed it to `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` and added the matching metrics endpoint variable.
- The client-side trace-context example appended context after all event arguments, which would break Socket.IO acknowledgement callbacks because acknowledgements must remain the final callback argument. Updated the example to insert trace context before the acknowledgement callback.
- The server-side event wrapper did not extract the injected trace context, so the client and server spans would not form an end-to-end trace. Added context extraction before starting the server event span.
- The client-side snippet implied plain static browser execution while using CommonJS `require`. Clarified that the example assumes a bundled client with the web SDK configured.

## Review Notes
The remaining Socket.IO room, middleware, broadcast, and connection lifecycle examples align with the current Socket.IO 4.x documentation. Browser-side OpenTelemetry support remains experimental in the official JavaScript docs, so production use should be validated against the application's bundler, collector, and CORS/security requirements.
