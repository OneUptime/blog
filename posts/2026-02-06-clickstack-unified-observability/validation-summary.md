# Validation Summary: How to Use ClickStack for Unified Logs, Traces, Metrics, and Session Replay

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickStack
- ClickHouse
- HyperDX UI
- OpenTelemetry Collector
- OpenTelemetry ClickHouse exporter
- Docker Compose
- SQL

## Sources Consulted
- ClickStack GitHub repository: https://github.com/ClickHouse/ClickStack
- ClickStack open source getting started guide: https://clickhouse.com/docs/use-cases/observability/clickstack/getting-started/oss
- ClickStack Docker Compose deployment guide: https://clickhouse.com/docs/use-cases/observability/clickstack/deployment/docker-compose
- ClickStack tables and schemas documentation: https://clickhouse.com/docs/use-cases/observability/clickstack/ingesting-data/schemas
- ClickStack session replay documentation: https://clickhouse.com/docs/use-cases/observability/clickstack/session-replay
- ClickHouse OpenTelemetry integration documentation: https://clickhouse.com/docs/observability/integrating-opentelemetry
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib ClickHouse exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter

## Issues Found
- The Docker Compose example used separate `clickhouse`, `otel-collector`, and `clickstack-ui` services with a `clickstack/ui:latest` image and port `3000`. Current ClickStack documentation uses ClickHouse-published ClickStack images, with the all-in-one image available as `clickhouse/clickstack-all-in-one:latest`; the HyperDX UI is exposed on port `8080`. Updated the Compose snippet to use the current all-in-one image and standard ClickStack ports.
- The schema examples used snake_case columns such as `trace_id`, `operation_name`, and `duration_ns`. Current ClickStack and the OpenTelemetry ClickHouse exporter use PascalCase columns such as `TraceId`, `SpanName`, and `Duration`. Updated the schema examples to match ClickStack-compatible table names and columns.
- The post showed a single `otel_metrics` table and `metrics_table_name` exporter setting. Current ClickHouse exporter metrics are split into type-specific tables such as `otel_metrics_gauge`, `otel_metrics_sum`, and `otel_metrics_histogram`, configured with `metrics_tables`. Updated the metrics schema, collector config, and query examples.
- The session replay table was named `session_replays` and used columns such as `session_id` and `event_data`. ClickStack stores session replay data in `hyperdx_sessions`, with event payloads in `Body` and metadata in `LogAttributes`. Updated the session schema accordingly.
- Cross-signal queries referenced the old column names and used numeric trace status code `2`. The current ClickHouse exporter stores status in `StatusCode` as strings such as `Error`. Updated the queries to use current ClickStack column names and `StatusCode = 'Error'`.

## Review Notes
The schema snippets are shortened examples based on the current ClickStack schemas. For production deployments, teams should use the ClickStack-provided schema or manage schema changes carefully, because the exporter requires compatible column names and types for inserts.
