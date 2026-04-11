# Validation Summary: How to Integrate Redis with OpenTelemetry (Traces)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py, ioredis)
- OpenTelemetry SDK (Python and Node.js)
- opentelemetry-instrumentation-redis (Python auto-instrumentation)
- @opentelemetry/instrumentation-ioredis (Node.js auto-instrumentation)
- OTLP gRPC trace exporter
- OpenTelemetry context propagation API
- Redis Pub/Sub
- Redis pipelines
- Jaeger

## Sources Consulted
- opentelemetry-python-contrib GitHub repository (opentelemetry-instrumentation-redis v0.62b0 source code)
- opentelemetry-js-contrib GitHub repository (@opentelemetry/instrumentation-ioredis v0.62.0 source code)
- opentelemetry-js GitHub repository (@opentelemetry/sdk-node, @opentelemetry/exporter-trace-otlp-grpc source code)
- PyPI package listings for opentelemetry-exporter-otlp-proto-grpc (v1.41.0)
- OpenTelemetry semantic conventions for `net.peer.name` deprecation status

## Issues Found
1. **Node.js code used top-level `await` in a CommonJS module.** The code snippet used `require()` (CommonJS syntax) alongside a bare `await client.set('key', 'value')` at the top level. Top-level `await` is only supported in ES modules, not CommonJS. This would cause a `SyntaxError` if copied into a standard `.js` file. **Fix:** Wrapped the Redis client usage in an `async function main()` with a `main()` call.

## Review Notes
- The post mentions `net.peer.name` as a span attribute. While the OpenTelemetry semantic conventions have deprecated `net.peer.name` in favor of `server.address`, the current `opentelemetry-instrumentation-redis` Python package (v0.62b0) still emits `net.peer.name`. The post accurately reflects current library behavior, but this attribute will likely change in a future release of the instrumentation library.
- The Pub/Sub context propagation example uses `json.dumps` and `json.loads` without showing `import json`. This is acceptable for a code snippet (not a complete program), but readers may need to add the import.
