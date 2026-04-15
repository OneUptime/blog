# Validation Summary: How to Use ClickHouse as a Backend for qryn

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- qryn (polyglot observability backend)
- Grafana (Loki, Prometheus, Tempo data sources)
- Docker Compose
- Promtail (log shipping)
- Prometheus (remote write)
- OpenTelemetry Collector (OTLP traces)
- LogQL

## Sources Consulted
- qryn Docker Hub: https://hub.docker.com/r/qxip/qryn
- qryn Installation Docs: https://github.com/metrico/qryn-docs/blob/main/docs/installation.md
- qryn-minimal docker-compose example: https://github.com/metrico/qryn-minimal/blob/main/docker-compose.yml
- qryn Wiki - Inserting Logs: https://github.com/metrico/qryn/wiki/Inserting-Logs-to-qryn
- qryn Wiki - Prometheus Write Input: https://github.com/metrico/qryn/wiki/Prometheus-Write-Input
- qryn Wiki - ClickHouse Schema: https://github.com/metrico/qryn/wiki/ClickHouse-Schema
- qryn Wiki - Table Replication Support: https://github.com/metrico/qryn/wiki/qryn-tables-replication-support
- OpenTelemetry OTLP HTTP Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry OTLP gRPC Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found

1. **Incorrect Prometheus remote write URL**: The post used `/api/v1/write` as the Prometheus remote write endpoint. The officially documented qryn endpoint is `/api/v1/prom/remote/write`. Changed the URL in the Prometheus remote_write config accordingly.

2. **Wrong OTLP exporter type**: The post configured the OpenTelemetry Collector with the `otlp` exporter, which is the gRPC-based exporter. qryn accepts OTLP data over HTTP on port 3100, not gRPC. Changed the exporter type from `otlp` to `otlphttp`, which correctly sends data over HTTP and automatically appends the standard `/v1/traces`, `/v1/metrics`, and `/v1/logs` paths.

3. **Inaccurate ClickHouse table names**: The post listed `logs_v2`, `metrics_v2`, `time_series`, and `traces_v2` as tables created by qryn. According to the qryn ClickHouse Schema documentation, the actual tables are `samples_v3` (metric samples), `time_series` (metric label metadata), `time_series_gin` (inverted index for labels), `settings`, and `ver`. Updated the table listing to match documented schema.

## Review Notes
- The Docker Compose setup uses `version: '3.8'`, which is deprecated in newer versions of Docker Compose (v2+) where the `version` field is ignored. This is not technically wrong but may warrant a note in a future update.
- The `CLICKHOUSE_DB` is set to `cloki` (the original project name), while the qryn docs default to `qryn`. Both are valid; `cloki` is a conventional choice given the project's history.
- The post could benefit from mentioning that qryn also supports Tempo-compatible trace querying via Grafana's Tempo data source, since the architecture diagram mentions Tempo but the data source configuration section only covers Loki and Prometheus.
