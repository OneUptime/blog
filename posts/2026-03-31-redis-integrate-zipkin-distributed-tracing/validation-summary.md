# Validation Summary: How to Integrate Redis with Zipkin for Distributed Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py client)
- Zipkin (distributed tracing backend)
- OpenTelemetry Python SDK
- opentelemetry-instrumentation-redis
- opentelemetry-exporter-zipkin (JSON exporter)
- OpenTelemetry Collector (with Zipkin exporter and OTLP receiver)
- Docker

## Sources Consulted
- opentelemetry-instrumentation-redis source code in opentelemetry-python-contrib GitHub repository (span attribute names, span name format, db.statement sanitization behavior)
- OpenTelemetry semantic conventions for database client spans (attribute naming: db.system, net.peer.name, net.peer.port)
- OpenTelemetry Collector contrib Zipkin exporter documentation (format field valid values, endpoint format)
- opentelemetry-exporter-zipkin PyPI package (module path for ZipkinExporter)
- Zipkin API v2 documentation (endpoint path /api/v2/spans, supported content types)

## Issues Found

1. **Incorrect span attribute names in "Common Redis Span Attributes" section**: The post listed `db.type`, `peer.hostname`, and `peer.port` which are legacy Zipkin naming conventions. The OpenTelemetry Redis instrumentation actually sets `db.system`, `net.peer.name`, and `net.peer.port` per OTel semantic conventions, and these names are preserved as Zipkin tags. Fixed all three attribute names.

2. **Incorrect span name format**: The post showed `span.name: redis GET` and referenced filtering by `redis GET`/`redis SET` in the Zipkin UI instructions. The `opentelemetry-instrumentation-redis` library sets the span name to just the Redis command (e.g., `GET`, `SET`, `SETEX`), not prefixed with `redis`. Fixed the span name in the attributes section and the Zipkin UI filter instructions.

3. **Unsanitized db.statement value**: The post showed `db.statement: GET product:123` but the Redis instrumentation sanitizes query arguments by default, producing `GET ?` instead. Fixed to show the sanitized form.

## Review Notes
- The production section introducing the OTLP gRPC exporter would benefit from mentioning the additional `pip install opentelemetry-exporter-otlp-proto-grpc` dependency, but this is a completeness issue rather than a technical error.
- The `db.statement` sanitization behavior is configurable via `RedisInstrumentor().instrument(sanitize_query=False)` — users wanting full statements in traces can disable it. The post doesn't mention this option.
- OpenTelemetry semantic conventions are actively migrating attribute names (e.g., `net.peer.name` → `server.address`, `net.peer.port` → `server.port`, `db.system` → `db.system.name`). The current attribute names used in the post are correct for the stable instrumentation library as of early 2026, but may change in future versions.
