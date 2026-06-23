# Validation Summary: How to Monitor Redis Cache Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry Redis instrumentation
- OpenTelemetry OTLP exporters
- Redis and redis-py
- Flask instrumentation
- Prometheus / Grafana query examples
- Distributed tracing and custom metrics

## Sources Consulted
- OpenTelemetry Python Redis instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/redis/redis.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Redis semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/redis/
- redis-py connection documentation: https://redis.readthedocs.io/en/stable/connections.html
- Redis redis-py production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- OpenTelemetry Python Redis instrumentation source: https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation/opentelemetry-instrumentation-redis

## Issues Found
- The auto-instrumentation section claimed Redis spans include full keys and response sizes by default. OpenTelemetry Python Redis instrumentation sanitizes command arguments and records command/connection details; it does not generally expose raw keys or response length by default. Updated the example attributes and comments to describe sanitized command text, connection attributes, timing, and semantic-convention mode differences.
- The best-practices semantic convention example used legacy database and network attribute names while describing standard OpenTelemetry Redis semantic conventions. Updated the example to current stable names such as `db.system.name`, `db.operation.name`, `db.namespace`, `server.address`, and `server.port`.
- Manual Redis tracing examples used legacy `db.system` and `db.operation` attributes. Updated them to `db.system.name` and `db.operation.name` for consistency with current semantic conventions.
- Observable gauge callbacks returned `(value, attributes)` tuples. Current OpenTelemetry Python documentation shows callbacks returning `Observation` objects. Added `Observation` imports and changed the callbacks to return `Observation(...)`.
- A connection-pool comment described the available connection collection as a queue size. Updated it to describe the redis-py pool's available connection list more accurately.
- The batch example said MGET auto-instrumentation shows all keys accessed. Updated it to say the command is auto-traced with sanitized command details.

## Review Notes
- The post uses some custom cache attributes such as `cache.key` and `db.redis.key`; these are not standard semantic conventions, but they are acceptable as custom attributes. Teams should avoid recording sensitive or high-cardinality keys in production unless they have masking and cardinality controls.
- Static syntax validation was run against all Python code fences; all 15 Python blocks compiled successfully. Runtime execution was not performed because the local environment does not have the Redis/OpenTelemetry instrumentation packages installed.
