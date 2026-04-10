# Validation Summary: How to Trace Redis Operations in Distributed Systems

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- OpenTelemetry (Python SDK and Node.js SDK)
- opentelemetry-instrumentation-redis (Python auto-instrumentation)
- @opentelemetry/instrumentation-ioredis (Node.js auto-instrumentation)
- OTLP gRPC exporter
- ioredis (Node.js Redis client)
- redis-py (Python Redis client)
- W3C Trace Context propagation (traceparent header)
- Jaeger, Grafana Tempo, OneUptime (trace backends)

## Sources Consulted
- OpenTelemetry Python SDK documentation: https://opentelemetry.io/docs/languages/python/
- OpenTelemetry Python Redis instrumentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/redis/redis.html
- OpenTelemetry JS SDK documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JS ioredis instrumentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-ioredis
- OpenTelemetry Semantic Conventions for database spans: https://opentelemetry.io/docs/specs/semconv/database/
- OpenTelemetry OTLP exporter specification (default gRPC port 4317): https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Context Propagation API: https://opentelemetry.io/docs/concepts/context-propagation/

## Issues Found
No technical issues found.

## Review Notes
- The `db.statement` attribute shown as `SET user:42` on line 51 is slightly simplified for illustration purposes. The actual captured statement may include the value argument (e.g., `SET user:42 alice`) depending on the instrumentation's sanitization settings. This is acceptable as an illustrative example.
- The Node.js example correctly places `sdk.start()` before `require("ioredis")`, which is essential for auto-instrumentation to work via monkey-patching. This is a common source of errors in practice, and the post gets it right.
- All import paths, package names, class names, and API calls are current and correct as of the latest stable releases of the referenced libraries.
