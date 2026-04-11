# Validation Summary: How to Integrate Redis with Jaeger for Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py client)
- Jaeger (distributed tracing backend)
- OpenTelemetry Python SDK
- OpenTelemetry OTLP gRPC exporter
- OpenTelemetry Redis auto-instrumentation
- OpenTelemetry Collector
- Docker

## Sources Consulted
- OpenTelemetry Python SDK documentation (https://opentelemetry.io/docs/languages/python/)
- OpenTelemetry Collector configuration documentation (https://opentelemetry.io/docs/collector/configuration/)
- Jaeger documentation on OTLP support (https://www.jaegertracing.io/docs/)
- opentelemetry-instrumentation-redis source code and PyPI documentation
- OpenTelemetry Collector contrib changelog regarding jaeger exporter removal

## Issues Found

1. **Missing `import json` in application code example**: The `get_user_profile` function uses `json.loads()` and `json.dumps()` but did not import the `json` module. Added `import json` to the code block.

2. **Deprecated `jaeger` exporter in OTel Collector config**: The OpenTelemetry Collector's `jaeger` exporter was deprecated and fully removed in collector-contrib v0.86.0 (October 2023). The config used `jaeger` exporter on port 14250 (Jaeger's native gRPC protocol). Changed to `otlp/jaeger` exporter targeting port 4317 (Jaeger's OTLP gRPC endpoint), which is the modern recommended approach.

3. **Incorrect `db.statement` attribute value**: The post showed `db.statement = GET user:123`, but the `opentelemetry-instrumentation-redis` package sanitizes command arguments by replacing them with `?` for security. Corrected to `db.statement = GET ?`.

4. **Incorrect Redis span names**: The post referenced span names as `redis GET` and `redis SET`, but the instrumentation library creates spans named simply `GET`, `SET`, `SETEX`, etc. (the bare Redis command name). Corrected all references to use the actual span names.

## Review Notes
- The `--collector.otlp.enabled=true` flag in the Docker command is redundant for Jaeger 1.35+ (OTLP is enabled by default) but is harmless. If Jaeger v2 (released late 2024, built on the OTel Collector architecture) becomes the `latest` tag, this flag may cause an error since v2 uses a different configuration model. Consider pinning to a specific version tag.
- The `net.peer.name` and `net.peer.port` attributes shown in the span attributes section use the older OpenTelemetry semantic conventions. Newer conventions use `server.address` and `server.port`, but the current Redis instrumentation library still uses the older names, so these are accurate for now.
- `span.duration` listed under "Key span attributes" is not technically a span attribute — it is metadata shown in the Jaeger UI timeline. This is a minor presentation nuance and the intent is clear from context.
