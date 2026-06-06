# Validation Summary: How to Configure Bugsnag Alongside OpenTelemetry for Dual Error Tracking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express
- Bugsnag JavaScript notifier
- Bugsnag Express plugin
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Node auto-instrumentation
- OTLP gRPC trace exporter

## Sources Consulted
- Bugsnag Express integration guide: https://docs.bugsnag.com/platforms/javascript/express/
- Bugsnag JavaScript configuration options: https://docs.bugsnag.com/platforms/javascript/configuration-options/
- Bugsnag Express asynchronous error handling and request-scoped client docs: https://docs.bugsnag.com/platforms/javascript/express/node-async/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript Tracer API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Tracer.html
- OpenTelemetry exception semantic convention: https://opentelemetry.io/docs/specs/otel/trace/exceptions/

## Issues Found
- The custom Express error handler sent the HTTP response before Bugsnag's Express error handler middleware could run, so the claim that Bugsnag would capture the error through its error handler middleware was incorrect. I changed the custom handler to record OpenTelemetry data, attach request-scoped Bugsnag metadata via `req.bugsnag`, and call `next(err)`, then wired Bugsnag's error handler before a final Express response handler.
- The OpenTelemetry status example used the numeric value `2` for errors. I changed it to `SpanStatusCode.ERROR`, which is the public API shown in OpenTelemetry JavaScript documentation.
- The manual `fetch-order` span ended only on success. I wrapped the async span body in `try/catch/finally` so exceptions are recorded, the span status is set to error, and `span.end()` always runs.

## Review Notes
The dependency installation command and the OTLP gRPC exporter setup are consistent with the current OpenTelemetry JavaScript exporter documentation. The Bugsnag initialization, `onError` callback, Express request handler, and metadata APIs are consistent with current Bugsnag JavaScript v7+ documentation.
