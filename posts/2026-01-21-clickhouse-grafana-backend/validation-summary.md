# Validation Summary: How to Use ClickHouse as a Backend for Grafana Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Grafana
- Grafana ClickHouse data source plugin
- SQL
- Docker Compose
- Grafana provisioning YAML
- ClickHouse materialized views and query cache

## Sources Consulted
- Grafana ClickHouse data source configuration documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/configure/
- Grafana ClickHouse query editor and macro documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/query-editor/
- Grafana ClickHouse template variables documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/template-variables/
- Grafana ClickHouse troubleshooting documentation: https://grafana.com/docs/plugins/grafana-clickhouse-datasource/latest/troubleshooting/
- ClickHouse Grafana integration documentation: https://clickhouse.com/docs/integrations/grafana
- ClickHouse AggregatingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse query cache documentation: https://clickhouse.com/docs/operations/query-cache
- ClickHouse AggregateFunction type documentation: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction

## Issues Found
- The Grafana provisioning snippet used the older `server` field and an unnecessary top-level `url`. Updated it to use the current ClickHouse plugin `jsonData.host`, `port`, and `protocol` fields.
- The macro expansion examples used generic timestamp strings and undocumented interval macros for the ClickHouse data source. Updated them to match the current plugin documentation for `$__timeFilter`, `$__timeInterval`, `$__fromTime`, `$__toTime`, `$__interval_s`, and `$__timeInterval_ms`.
- Several string template variable examples used unformatted `$variable` interpolation in `IN` clauses. Updated those examples to `${variable:singlequote}` to produce valid ClickHouse SQL for string and multi-value variables.
- The connection pooling configuration used outdated field names. Updated it to the current `maxOpenConns`, `maxIdleConns`, and `connMaxLifetime` keys shown in the Grafana ClickHouse troubleshooting documentation.

## Review Notes
- The Docker Compose plugin installation command, `grafana-cli` install command, ClickHouse HTTP/native ports, SQL examples, materialized view pattern, query cache usage, and query log troubleshooting examples were consistent with current official documentation.
- The pre-aggregation example uses `SummingMergeTree` with `AggregateFunction` state columns. ClickHouse documentation states that `SummingMergeTree` behaves like `AggregatingMergeTree` for `AggregateFunction` columns, so the example is valid, though `AggregatingMergeTree` may be clearer for future readers when most stored columns are aggregate states.
