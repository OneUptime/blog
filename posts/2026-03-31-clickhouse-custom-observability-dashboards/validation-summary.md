# Validation Summary: How to Build Custom Observability Dashboards on ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- Grafana (dashboard/visualization)
- Grafana ClickHouse data source plugins (`grafana-clickhouse-datasource`, `vertamedia-clickhouse-datasource`)
- OpenTelemetry Collector ClickHouse exporter (`otel_traces`, `otel_logs` schema)
- SQL (ClickHouse dialect: `toStartOfMinute`, `countIf`, `quantile`, `mapContains`, Map access)
- Grafana templating/macros (`$__timeFilter()`, `$service`, `$operation`)

## Sources Consulted
- OpenTelemetry Collector Contrib ClickHouse exporter source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/clickhouseexporter (specifically `exporter_traces.go` which writes `spanStatus.Code().String()`)
- pdata StatusCode `String()` implementation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/pdata/ptrace/status_code.go (returns "Unset", "Ok", "Error")
- Grafana ClickHouse data source (official): https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/
- Vertamedia/Altinity ClickHouse plugin: https://grafana.com/grafana/plugins/vertamedia-clickhouse-datasource/ and https://github.com/Altinity/clickhouse-grafana
- ClickHouse SQL function reference for `toStartOfMinute`, `countIf`, `quantile`, `mapContains`, and Map column access.

## Issues Found
1. **Incorrect `StatusCode` literal values.** The post used `StatusCode = 'STATUS_CODE_ERROR'` in three queries (error rate panel, top slow endpoints, and implicitly in the summary). The OpenTelemetry Collector ClickHouse exporter writes `spanStatus.Code().String()`, which returns `"Unset"`, `"Ok"`, or `"Error"` — not the protobuf enum names. Integration tests and the exporter README confirm `"Error"` is the correct string. Changed all three occurrences to `StatusCode = 'Error'`.
2. **Misleading plugin attribution.** The post said "Install the official Altinity ClickHouse plugin in Grafana" and then listed `vertamedia-clickhouse-datasource` first with `grafana-clickhouse-datasource` annotated as "or the official plugin". In reality, `grafana-clickhouse-datasource` is the first-party Grafana Labs plugin, and `vertamedia-clickhouse-datasource` is the Altinity-maintained community plugin (originally by Vertamedia). Rewrote the intro line and the two code-block comments to attribute each plugin correctly, with the Grafana Labs plugin listed first as the default recommendation.

## Review Notes
- ClickHouse SQL functions (`toStartOfMinute`, `countIf`, `quantile`, `round`, `avg`, `mapContains`, Map element access with `['key']`) are all current and correct.
- `Duration` being stored in nanoseconds in `otel_traces` is correct per the OTel Collector schema, so dividing by `1e6` to get milliseconds is accurate.
- `SeverityText` values (`'ERROR'`, `'WARN'`, `'INFO'`) align with OpenTelemetry log severity text conventions as written by the Collector's ClickHouse log exporter.
- `$__timeFilter()` is supported by both ClickHouse Grafana plugins, so the queries work with either choice.
- The Service Dependency Map query relies on `peer.service` being set in span attributes; this is an OpenTelemetry semantic-conventions attribute and is only populated by properly instrumented clients/servers, so results will vary by instrumentation quality (not an error, just a caveat).
