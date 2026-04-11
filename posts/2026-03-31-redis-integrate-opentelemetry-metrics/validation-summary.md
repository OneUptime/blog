# Validation Summary: How to Integrate Redis with OpenTelemetry (Metrics)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server metrics via INFO command)
- OpenTelemetry Collector (Contrib distribution, Redis receiver)
- OpenTelemetry Python SDK (Metrics API)
- OTLP gRPC exporter
- Kubernetes (sidecar deployment pattern)

## Sources Consulted
- OpenTelemetry Collector Contrib Redis receiver documentation and metadata.yaml — https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/redisreceiver
- OpenTelemetry Python SDK metrics API documentation — https://opentelemetry.io/docs/languages/python/instrumentation/#metrics
- OpenTelemetry Collector configuration documentation — https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter specification — https://opentelemetry.io/docs/specs/otlp/

## Issues Found

1. **Incorrect metric descriptions for `redis.net.input` and `redis.net.output`**: The post described these as "Bytes received per second" and "Bytes sent per second" respectively. These are actually cumulative monotonic sums representing total bytes read from / written to the network (unit: `By`), not per-second rates. Fixed descriptions to "Total bytes read from the network" and "Total bytes written to the network".

2. **Observable gauge callback referenced before definition**: The `get_hit_rate` function was used in `callbacks=[get_hit_rate]` before it was defined, which would cause a `NameError` at runtime. Reordered the code so that `total_hits`, `total_requests`, and the `get_hit_rate` function are defined before `meter.create_observable_gauge()` is called.

3. **Tempo listed as a metrics backend**: The summary listed "Prometheus, Tempo, Grafana Cloud, or OneUptime" as OTLP-compatible backends for metrics. Tempo is a tracing backend (not a metrics backend), making it misleading in a metrics-focused article. Replaced "Tempo" with "Datadog" as a more appropriate example of a metrics-capable OTLP backend.

## Review Notes
- The OTel Collector OTLP gRPC exporter endpoint is specified as `http://backend:4317` with a scheme prefix. The canonical format for gRPC endpoints is `host:port` without a scheme, with `tls.insecure: true` for non-TLS connections. This works in practice with recent collector versions but is not the documented convention. Left as-is since it functions correctly.
- The Python code example does not import or initialize `redis_client`, which is expected for a snippet but worth noting for readers trying to use it directly.
- All metric names listed for the Redis receiver (`redis.clients.connected`, `redis.memory.used`, `redis.keyspace.hits`, `redis.keyspace.misses`, `redis.commands.processed`, `redis.net.input`, `redis.net.output`, `redis.rdb.changes_since_last_save`, `redis.uptime`) are confirmed as default-enabled metrics in the receiver.
- The Python SDK API usage (imports, `MeterProvider`, `PeriodicExportingMetricReader`, `create_counter`, `create_observable_gauge`, `Observation`) is all correct and current.
