# Validation Summary: How to Monitor Node.js Streams with OpenTelemetry Spans

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry NodeSDK
- OpenTelemetry OTLP HTTP trace exporter
- Node.js streams
- Node.js `fs`, `stream`, `stream/promises`, and `zlib` modules
- Axios HTTP client

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry `@opentelemetry/sdk-node` API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry `@opentelemetry/exporter-trace-otlp-http` API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- Node.js streams documentation: https://nodejs.org/api/stream.html
- Node.js `fs.createReadStream()` / `fs.createWriteStream()` documentation: https://nodejs.org/api/fs.html
- Node.js `zlib.gzipSync()` documentation: https://nodejs.org/api/zlib.html
- Node.js `process.memoryUsage()` documentation: https://nodejs.org/api/process.html#processmemoryusage

## Issues Found
- The install command omitted `@opentelemetry/exporter-trace-otlp-http`, even though the setup snippet imports `OTLPTraceExporter` from that package. Added the missing package to the `npm install` command.
- The examples used numeric OpenTelemetry status codes (`1` and `2`) directly. Updated error status handling to use `SpanStatusCode.ERROR`, matching the public JavaScript API, and removed the explicit success status from the pipeline example because successful spans are `Unset` by default.
- The `Writable.write()` wrapper did not handle the documented overload where the second argument is the callback. Added callback normalization before forwarding to the original `write()` method.
- The writable stream example counted string chunks with `chunk.length`, which can count characters rather than bytes. Updated byte accounting to use `Buffer.byteLength()` for non-Buffer chunks.
- The writable stream example could produce `NaN` and `-Infinity` latency attributes when a stream finished without writes. Added empty-array guards so the average and max latency attributes remain numeric.

## Review Notes
The examples are illustrative manual instrumentation snippets rather than a complete reusable stream instrumentation library. For high-throughput production streams, the post's advice to use sampling is important because per-chunk span events or child spans can generate large trace volumes.
