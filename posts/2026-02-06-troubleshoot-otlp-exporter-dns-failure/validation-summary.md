# Validation Summary: How to Troubleshoot the Unhandled Promise Rejection from OTLPExporterBase

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry OTLP trace exporters
- Node.js promise rejection handling
- Node.js DNS resolution APIs
- Kubernetes init containers

## Sources Consulted
- OpenTelemetry JavaScript `SpanExporter` API reference: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_sdk-node.node.SpanExporter.html
- OpenTelemetry JavaScript OTLP HTTP trace exporter reference: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-http.html
- OpenTelemetry JavaScript `NodeSDK` API reference: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.NodeSDK.html
- OpenTelemetry JavaScript `sdk-node` documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JavaScript diagnostic logging documentation: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- Node.js CLI documentation for `--unhandled-rejections`: https://nodejs.org/dist/latest/docs/api/cli.html#--unhandled-rejectionsmode
- Node.js DNS documentation for `dns.lookup()` and `dns.promises.lookup()`: https://nodejs.org/download/release/v18.18.2/docs/api/dns.html
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/

## Issues Found
- The post incorrectly stated that the OTLP exporter's `export()` method returns a Promise. Current OpenTelemetry JavaScript defines `SpanExporter.export()` as a callback-based method returning `void`, so the explanation was updated to describe asynchronous exporter internals and affected versions instead.
- The global `unhandledRejection` handler examples were too broad and would hide unrelated application promise bugs. They now handle the exporter DNS failure case and rethrow unrelated rejections.
- The package update command omitted `@opentelemetry/sdk-node`, even though the post uses `NodeSDK`. The command now updates the SDK package together with the trace SDK and OTLP exporters.
- The DNS preflight example used `dns.promises.resolve()`, which does not use the same OS lookup path as Node networking APIs. It now uses `dns.promises.lookup()` and the `node:dns` import.
- The retry example could generate a malformed URL when `OTEL_EXPORTER_OTLP_ENDPOINT` was missing or had a trailing slash. It now provides a default endpoint and trims one trailing slash before appending `/v1/traces`.
- The HTTP exporter section overstated that HTTP is inherently more graceful than gRPC. It now focuses on documented timeout and retry behavior for the HTTP OTLP exporter.
- The defensive setup imported `DiagConsoleLogger` and `DiagLogLevel` but did not register a diagnostic logger. It now calls `diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN)`.

## Review Notes
The Kubernetes init container pattern is technically valid, but the example only waits for TCP reachability on port 4318. A production setup may also want Collector readiness checks or a bounded retry loop to avoid a Pod waiting indefinitely.
