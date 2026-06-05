# Validation Summary: How to Troubleshoot Context Loss in Node.js Worker Threads When

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js worker threads
- OpenTelemetry JavaScript API
- OpenTelemetry Node SDK
- OpenTelemetry context propagation
- OTLP HTTP trace exporter
- Piscina worker pool

## Sources Consulted
- Node.js Worker Threads API documentation: https://nodejs.org/api/worker_threads.html
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Node SDK API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry OTLP HTTP trace exporter documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- Piscina API documentation: https://piscinajs.dev/api-reference/Instance

## Issues Found
- The error status examples used `trace.SpanStatusCode.ERROR`, but `SpanStatusCode` is exported from `@opentelemetry/api` rather than from the `trace` namespace. Updated the examples to import `SpanStatusCode` and use `SpanStatusCode.ERROR`.
- The SDK resource example used `new Resource(...)`. Current OpenTelemetry JavaScript resource examples use `resourceFromAttributes(...)` from `@opentelemetry/resources`. Updated the snippet accordingly.
- The Piscina example used `filename: './worker.js'`, while Piscina documents `filename` as an absolute path or absolute `file://` URL. Updated the example to use `path.resolve(__dirname, 'worker.js')`.
- The exporter caveat stated that each worker creates a separate exporter connection. That is too specific because connection behavior depends on exporter transport and runtime pooling. Updated it to say each worker creates its own exporter and span processor, producing independent export pipelines.

## Review Notes
The core guidance is technically correct: worker thread data is cloned across the worker boundary, OpenTelemetry context must be propagated manually with `propagation.inject()` and `propagation.extract()` for this custom dispatch path, and OpenTelemetry SDK initialization must happen inside worker threads before worker code acquires tracers.
