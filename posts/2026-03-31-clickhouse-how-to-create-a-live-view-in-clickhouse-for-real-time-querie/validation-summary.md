# Validation Summary: How to Create a Live View in ClickHouse for Real-Time Queries

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ClickHouse (Live Views, MergeTree, Materialized Views)
- SQL (ClickHouse dialect)
- HTTP interface (`curl`)
- Python `clickhouse-connect` client

## Sources Consulted
- [ClickHouse CREATE VIEW docs](https://clickhouse.com/docs/sql-reference/statements/create/view)
- [ClickHouse System Tables docs](https://clickhouse.com/docs/operations/system-tables)
- [clickhouse-connect Advanced Querying docs](https://clickhouse.com/docs/integrations/language-clients/python/advanced-querying)
- [Altinity: Making Data Come to Life with ClickHouse Live View Tables](https://altinity.com/blog/2019-11-13-making-data-come-to-life-with-clickhouse-live-view-tables)

## Issues Found
- **`system.live_views` does not exist.** The post queried a non-existent `system.live_views` system table. ClickHouse tracks Live Views in `system.tables` with `engine = 'LiveView'`. Fixed the query in the "Live View Limitations" section to use `system.tables` with the appropriate `engine` and `database` filter.

## Review Notes
- Live Views are officially **deprecated** in the current ClickHouse documentation (recommendation is to use Refreshable Materialized Views). The post already notes that the feature is experimental and advises readers to check documentation for their specific version, so the hedging is adequate, but a future rewrite could migrate the examples to Refreshable Materialized Views.
- `SET allow_experimental_live_view = 1;` is correct as the enabling setting.
- `CREATE LIVE VIEW ... WITH REFRESH N` syntax is correct and consistent with ClickHouse docs.
- `WATCH [db.]live_view [EVENTS] [LIMIT n]` syntax — all three WATCH variants in the post are valid.
- `clickhouse-connect` Python client exposes `query_rows_stream` as a documented streaming method, so the Python example is correct.
- `curl` HTTP interface example with `WATCH` query over long-polling is valid.
- Comparison table of Regular / Materialized / Live views is technically accurate.
