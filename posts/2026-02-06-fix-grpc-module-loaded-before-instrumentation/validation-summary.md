# Validation Summary: How to Fix OpenTelemetry gRPC Instrumentation Warning 'Module @grpc/grpc-js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry Node.js SDK
- OpenTelemetry gRPC instrumentation
- OTLP trace exporters for gRPC, HTTP/JSON, and HTTP/protobuf
- Node.js CommonJS module loading
- gRPC for Node.js (`@grpc/grpc-js`)
- npm dependency inspection

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry instrumentation package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation.html
- OpenTelemetry JavaScript `NodeTracerProvider` API docs: https://open-telemetry.github.io/opentelemetry-js/classes/_opentelemetry_sdk-node.node.NodeTracerProvider.html
- Current npm package metadata and published type/source packages for `@opentelemetry/exporter-trace-otlp-grpc`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/exporter-trace-otlp-proto`, `@opentelemetry/otlp-grpc-exporter-base`, `@opentelemetry/instrumentation`, `@opentelemetry/instrumentation-grpc`, `@opentelemetry/resources`, `@opentelemetry/sdk-trace-node`, and `@opentelemetry/sdk-trace-base`

## Issues Found
- The post stated that importing `@opentelemetry/exporter-trace-otlp-grpc` loads `@grpc/grpc-js` during initialization. Current OpenTelemetry JavaScript releases lazy-load `@grpc/grpc-js` in common OTLP gRPC exporter paths, so I updated the wording to describe this as an affected-setup issue rather than a universal current behavior.
- The manual `NodeTracerProvider` example used `new Resource(...)` and `provider.addSpanProcessor(...)`, which do not match the current OpenTelemetry JS 2.x public API. I changed the example to use `resourceFromAttributes(...)` and the `spanProcessors` constructor option.
- The diagnostic warning and verification log examples did not match the current instrumentation package wording. I updated them to the current warning and debug message format.

## Review Notes
The code snippets were smoke-tested against the latest published OpenTelemetry packages available on 2026-06-05. The high-level guidance remains valid: instrumentation must be registered before `@grpc/grpc-js` is loaded, and HTTP-based OTLP exporters avoid depending on `@grpc/grpc-js`.
