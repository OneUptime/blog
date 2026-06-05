# Validation Summary: How to Monitor Redis Performance and Cache Hit Rates with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry ioredis instrumentation
- OpenTelemetry Collector Redis receiver
- Redis server metrics and INFO command
- Prometheus alerting rules and PromQL
- Node.js and JavaScript

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry ioredis instrumentation README: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-ioredis
- OpenTelemetry Collector Redis receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/redisreceiver
- OpenTelemetry Collector Redis receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/metadata.yaml
- OpenTelemetry Prometheus/OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
- The npm install command imported `PeriodicExportingMetricReader` from `@opentelemetry/sdk-metrics` but did not install that package directly. Added `@opentelemetry/sdk-metrics` to the install command.
- The text said auto-instrumentation directly gives command latency and throughput. The ioredis instrumentation primarily creates spans; throughput metrics depend on backend span-metric derivation or a separate metrics pipeline. Updated the wording to clarify this.
- The Redis receiver password example used `${REDIS_PASSWORD}`. The current Collector Redis receiver documentation shows the supported environment-variable reference form as `${env:REDIS_PASSWORD}`. Updated the snippet.
- The Redis receiver config comment said the `metrics` block collected metrics from all databases, but the listed entries enable disabled metrics such as `redis.maxmemory`, `redis.cmd.calls`, and `redis.cmd.usec`. Updated the comment.
- The Prometheus memory alert used `redis_memory_used / redis_maxmemory`, but OpenTelemetry-to-Prometheus translation commonly adds the `_bytes` unit suffix for byte metrics. Updated the expression to `redis_memory_used_bytes / redis_maxmemory_bytes`.
- The Redis memory alert did not guard against `maxmemory` being `0`, which is valid when Redis has no configured memory limit. Added `and redis_maxmemory_bytes > 0`.
- Added a short note before the Prometheus alert examples explaining OpenTelemetry-to-Prometheus name and label translation so the alert metric names are technically grounded.

## Review Notes
The Redis receiver metrics referenced in the post are present in the current OpenTelemetry Collector contrib Redis receiver metadata. Several receiver metrics, including `redis.maxmemory`, `redis.cmd.calls`, and `redis.cmd.usec`, are disabled by default and must be enabled as shown. The ioredis instrumentation README notes semantic convention migration support through `OTEL_SEMCONV_STABILITY_OPT_IN`; the post's warning about sanitizing `db.statement` remains valid, but future updates may want to mention `db.query.text` for stable database semantic conventions.
