# Validation Summary: How to Monitor gRPC Streaming Calls with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Go
- OpenTelemetry gRPC instrumentation
- gRPC streaming
- Node.js gRPC (`@grpc/grpc-js`)
- Node.js streams
- OpenTelemetry traces and metrics

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry gRPC instrumentation for Node.js: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-grpc.html
- OpenTelemetry metrics OTLP HTTP exporter for JavaScript: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-metrics-otlp-http.html
- gRPC Node.js basics tutorial: https://grpc.io/docs/languages/node/basics/
- gRPC Node.js `ServerWritableStream` documentation: https://grpc.github.io/grpc/node/grpc-ServerWritableStream.html
- gRPC Node.js `ServerReadableStream` documentation: https://grpc.github.io/grpc/node/grpc-ServerReadableStream.html
- gRPC Node.js `ServerDuplexStream` documentation: https://grpc.github.io/grpc/node/grpc-ServerDuplexStream.html
- OpenTelemetry Go `otelgrpc` package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
- Node.js stream documentation for `write()` / `drain`: https://nodejs.org/download/release/v22.12.0/docs/api/stream.html

## Issues Found
- The Node.js OpenTelemetry setup used `new Resource(...)`, which is not the current documented JavaScript resource setup. Updated it to use `resourceFromAttributes(...)`.
- The metrics section defined instruments, but the SDK setup did not configure a metric reader or metrics exporter. Added the OTLP metrics exporter and `PeriodicExportingMetricReader` to make the metric examples exportable.
- The server-streaming Node.js example used `async function*` with `call.write()`, which does not match the documented `@grpc/grpc-js` server-streaming handler shape. Changed it to an async handler that writes to the server writable stream and calls `call.end()`.
- The JavaScript span status examples used numeric status codes. Updated them to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.
- The per-message spans were created as children of the RPC context, but the message processing and writes did not run with the message span active. Wrapped the relevant work in `context.with(trace.setSpan(...))` so downstream auto-instrumented spans can appear under the per-message spans.
- The client-streaming and bidirectional examples were missing imports for OpenTelemetry APIs used in the snippets. Added the imports to make the examples self-contained.
- The bidirectional streaming example did not guarantee span cleanup when message processing or writes threw. Added try/catch/finally blocks that record exceptions and end spans.
- The Go example imported `context` without using it, which would not compile, and said it used `otelgrpc` without showing the actual server instrumentation. Removed the unused import and added `grpc.StatsHandler(otelgrpc.NewServerHandler())`.
- The backpressure note said to detect when writes block. For Node.js streams, `write()` signals backpressure by returning `false` and later emitting `drain`; updated the wording accordingly.

## Review Notes
- The examples still use illustrative placeholder functions and generated protobuf types such as `subscribeToPriceFeed`, `processChunk`, `processMessage`, `generateSessionId`, `server`, and `pb.Service_StreamUpdatesServer`. That is appropriate for a tutorial, but readers need to provide those pieces in a real service.
- The custom `rpc.grpc.stream.*` and `rpc.grpc.bidi.*` attributes are application-specific, not official OpenTelemetry semantic convention attributes.
