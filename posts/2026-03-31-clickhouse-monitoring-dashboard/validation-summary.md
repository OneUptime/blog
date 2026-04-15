# Validation Summary: How to Use clickhouse-monitoring Dashboard

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (system tables: system.processes, system.query_log, system.replicas)
- clickhouse-monitoring (duyet/clickhouse-monitoring Next.js dashboard)
- Grafana (datasource provisioning, alerting, custom panels)
- grafana-clickhouse-datasource plugin
- Docker Compose

## Sources Consulted
- GitHub: https://github.com/duyet/clickhouse-monitoring — verified the actual project repository; https://github.com/Altinity/clickhouse-monitoring returns 404
- ClickHouse system.processes docs: https://clickhouse.com/docs/en/operations/system-tables/processes — verified columns: elapsed, read_rows, memory_usage, query, is_cancelled
- ClickHouse system.query_log docs: https://clickhouse.com/docs/en/operations/system-tables/query_log — verified columns: event_time, written_rows, written_bytes, type (QueryFinish), query_kind (Insert), query_duration_ms, user
- ClickHouse system.replicas docs: https://clickhouse.com/docs/en/operations/system-tables/replicas — verified columns: inserts_in_queue, merges_in_queue
- Grafana ClickHouse datasource plugin: https://grafana.com/grafana/plugins/grafana-clickhouse-datasource/ — verified plugin ID
- Grafana global variables docs — verified $__timeFrom() and $__timeTo() are standard Grafana variables

## Issues Found

1. **Incorrect repository URL**: The post referenced `https://github.com/Altinity/clickhouse-monitoring` which returns a 404. Changed to the correct URL: `https://github.com/duyet/clickhouse-monitoring`.

2. **Incorrect author attribution**: The post attributed the project to "Mikhail Shiryaev" but the actual author is Duyet Le. Corrected the attribution.

3. **Incorrect project description**: The post described clickhouse-monitoring as a "ready-made Grafana dashboard" but it is actually a Next.js-based web monitoring dashboard. Corrected the description to accurately reflect the project's technology.

4. **Incorrect setup description**: The post stated that `docker-compose up -d` "starts Grafana, a ClickHouse datasource plugin, and the dashboard definitions." In reality it starts a Next.js application. Corrected the description.

## Review Notes
- All SQL queries against ClickHouse system tables are syntactically correct and use valid column names for the referenced system tables.
- The Grafana datasource provisioning YAML uses the correct plugin type identifier (`grafana-clickhouse-datasource`) and valid configuration fields.
- The Grafana macros `$__timeFrom()` and `$__timeTo()` are standard Grafana global variables that work across datasources. The ClickHouse-specific plugin also offers `$__fromTime` and `$__toTime` as alternative macros, but both forms are valid.
- The post's Grafana sections (datasource configuration, custom panels, alerting) are presented as complementary tooling alongside the clickhouse-monitoring dashboard, which is now accurately reflected after the fixes.
