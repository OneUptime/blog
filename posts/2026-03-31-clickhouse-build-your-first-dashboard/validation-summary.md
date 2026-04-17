# Validation Summary: How to Build Your First ClickHouse Dashboard

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- ClickHouse (SQL, MergeTree engine, DateTime/LowCardinality types, random and array functions)
- Grafana (data sources, panels: Time series, Bar chart, Stat)
- grafana-clickhouse-datasource plugin (by Grafana Labs)
- Docker (for running Grafana)

## Sources Consulted
- ClickHouse random functions: https://clickhouse.com/docs/sql-reference/functions/random-functions
- ClickHouse date-time functions: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse array functions: https://clickhouse.com/docs/sql-reference/functions/array-functions
- ClickHouse MergeTree engine: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse network ports: https://clickhouse.com/docs/guides/sre/network-ports
- Grafana ClickHouse datasource plugin: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/
- Grafana ClickHouse plugin macros (query editor docs): https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/query-editor/#macros
- Grafana CLI plugin management: https://grafana.com/docs/grafana/latest/administration/cli/
- Grafana data source management: https://grafana.com/docs/grafana/latest/administration/data-source-management/

## Issues Found

1. **Outdated Grafana navigation path.** The post instructed readers to open "Configuration - Data Sources - Add data source". In Grafana 10 and later (current as of 2026), the navigation entry was renamed to "Connections" and "Configuration" is no longer the top-level path for data sources. Updated the step to "Connections - Data Sources - Add data source" to match current Grafana UI.

## Review Notes
- The `randUniform(min, max)` function is a real ClickHouse function (returns Float64). The pattern `now() - randUniform(0, 86400 * 7)` relies on ClickHouse's implicit cast from Float64 back to DateTime on INSERT, which works in current ClickHouse versions. A more explicit alternative (`now() - (rand() % (86400 * 7))`) would avoid the implicit cast but the current code is functional.
- `arrayElement(array, rand() % 3 + 1)` correctly uses 1-based indexing per ClickHouse semantics.
- `$__fromTime` and `$__toTime` are valid macros in the Grafana ClickHouse datasource plugin; they return DateTime values. Millisecond variants (`$__fromTime_ms`, `$__toTime_ms`) are also available for DateTime64(3) columns if the user later works with high-precision timestamps — worth mentioning in a follow-up post but not an error here.
- Plugin ID `grafana-clickhouse-datasource`, default ports (8123 for ClickHouse HTTP, 3000 for Grafana), default Grafana credentials (admin/admin), and `grafana-cli plugins install ...` syntax are all correct.
- The Docker command omits a Grafana image tag, which will pull `latest`. This is conventional for a getting-started tutorial but readers running this in production should pin a specific version.
