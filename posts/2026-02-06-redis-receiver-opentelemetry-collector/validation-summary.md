# Validation Summary: How to Configure the Redis Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Redis receiver
- Redis `INFO` and `CLUSTER INFO`
- Collector processors and exporters
- Prometheus alerting
- Kubernetes Deployment and ConfigMap manifests
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Redis receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/redisreceiver
- OpenTelemetry Collector Contrib Redis receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/redisreceiver/metadata.yaml
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter/debugexporter
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Kubernetes container command and args behavior: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/

## Issues Found
- Replaced deprecated `logging` exporter usage with the current `debug` exporter and `verbosity` setting.
- Corrected Redis receiver metric names that did not exist in the official receiver metadata, including `redis.memory.fragmentation`, `redis.commands.duration`, `redis.replication.connected_slaves`, `redis.replication.backlog_size`, `redis.replication.lag`, `redis.rdb.last_save_time`, and `redis.aof.size`.
- Removed claims and examples implying the receiver collects Redis `SLOWLOG`, `CLIENT LIST`, and replication lag metrics. The receiver is documented as collecting from a single Redis instance using `INFO`, with cluster metrics from `CLUSTER INFO`.
- Removed unsupported arbitrary `resource_attributes` values from Redis receiver examples. The receiver only exposes documented resource attributes such as `redis.version`, `server.address`, and `server.port`.
- Removed an invalid `metricstransform` cross-metric cache-hit-ratio calculation. The ratio should be calculated in Prometheus or the observability backend.
- Updated the multiple Redis database example. The receiver reports database-level keyspace metrics using the `db` metric attribute rather than by connecting separately to logical Redis databases.
- Updated Prometheus alert expressions to use Prometheus-compatible metric names rather than dotted OpenTelemetry metric names.
- Replaced deprecated `service.telemetry.metrics.address` with the current internal telemetry `readers` syntax.
- Fixed the Kubernetes Deployment example to use `args` for `--config=/conf/config.yaml`; using `command` would override the collector image entrypoint.
- Added missing `batch` processor and `otlp` exporter definitions to snippets that referenced them.

## Review Notes
Collector config snippets were validated with the current `otel/opentelemetry-collector-contrib:latest` image where self-contained. TLS examples failed only at runtime config validation for placeholder certificate paths such as `/etc/otel/certs/redis-ca.pem`, which is expected unless those files are mounted in the collector container.
