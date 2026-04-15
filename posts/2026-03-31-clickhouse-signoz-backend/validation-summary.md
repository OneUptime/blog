# Validation Summary: How to Use ClickHouse as a Backend for SigNoz

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (storage backend)
- SigNoz (open-source APM / observability platform)
- OpenTelemetry Collector (telemetry pipeline)
- Docker Compose (deployment)
- Helm (Kubernetes deployment)

## Sources Consulted
- SigNoz official documentation — https://signoz.io/docs/install/docker/
- SigNoz GitHub repository — https://github.com/SigNoz/signoz
- SigNoz Helm chart repository — https://github.com/SigNoz/charts
- SigNoz ClickHouse traces query docs — https://signoz.io/docs/userguide/writing-clickhouse-traces-query/
- SigNoz ClickHouse logs query docs — https://signoz.io/docs/userguide/logs_clickhouse_queries/
- SigNoz ClickHouse metrics query docs — https://signoz.io/docs/userguide/write-a-metrics-clickhouse-query/
- SigNoz distributed ClickHouse Kubernetes docs — https://signoz.io/docs/manage/administrator-guide/clickhouse/distributed-clickhouse/kubernetes/
- ClickHouse ALTER TABLE TTL docs — https://clickhouse.com/docs/sql-reference/statements/alter/ttl
- ClickHouse server configuration docs — https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- OpenTelemetry Collector OTLP exporter — https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found

1. **Outdated ClickHouse table names**: The post referenced legacy table names that have been superseded in current SigNoz versions. Fixed:
   - `signoz_traces.signoz_index_v2` → `signoz_traces.distributed_signoz_index_v3` (v3 schema added `ts_bucket_start` column for faster timestamp filtering)
   - `signoz_logs.logs` → `signoz_logs.distributed_logs_v2` (v2 logs table is the current primary table)
   - `signoz_metrics.samples_v4` → `signoz_metrics.distributed_samples_v4` (distributed variant is correct for queries)

2. **Incorrect ClickHouse XML config placement**: The `max_memory_usage` and `max_bytes_before_external_group_by` settings were placed directly under `<clickhouse>`, but these are query/session-level settings that must be placed under `<profiles><default>` in `users.xml`. Placing them directly under `<clickhouse>` in `config.xml` would have no effect. Fixed to use proper `<profiles><default>` nesting.

3. **TTL command referenced outdated table**: The `ALTER TABLE ... MODIFY TTL` command referenced `signoz_traces.signoz_index_v2`, which was updated to `signoz_traces.distributed_signoz_index_v3` to match the corrected table name.

4. **Incorrect Helm chart values**: The Helm `--set` flags used wrong parameter names. Fixed:
   - `clickhouse.replicaCount` → `clickhouse.layout.replicasCount` (correct nested path and plural form)
   - `clickhouse.shards` → `clickhouse.layout.shardsCount` (correct nested path with `Count` suffix)

5. **Non-existent `cluster.yaml` reference**: The post claimed SigNoz supports ClickHouse clusters via a `cluster.yaml` configuration in the Helm chart, but no such file exists. Fixed to reference "Helm value overrides" instead, which is how SigNoz actually configures ClickHouse clusters.

## Review Notes
- The `otlp` exporter name in the OpenTelemetry Collector config is a deprecated alias for `otlp_grpc`. It still works due to backward compatibility, but `otlp_grpc` is the current canonical name. Left as-is since `otlp` remains widely used in examples and documentation.
- The Docker Compose install command works as written. The official docs now recommend `git clone -b main` and `docker compose up -d --remove-orphans`, but the post's simpler command is functional.
- The `toDateTime(timestamp)` in the TTL expression is redundant if the `timestamp` column is already a DateTime type, but it is not incorrect — ClickHouse accepts it without error.
- SigNoz schemas are explicitly noted as not final in their documentation and may continue to change in future versions.
