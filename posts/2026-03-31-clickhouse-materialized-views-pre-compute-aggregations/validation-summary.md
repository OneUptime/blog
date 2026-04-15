# Validation Summary: How to Use Materialized Views to Pre-Compute Aggregations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Materialized Views (TO syntax with explicit target tables)
- SummingMergeTree engine
- AggregatingMergeTree engine
- Aggregate function combinators (-State / -Merge)
- ClickHouse system tables (system.query_log)

## Sources Consulted
- ClickHouse official documentation: Materialized Views — https://clickhouse.com/docs/guides/developer/cascading-materialized-views
- ClickHouse official documentation: SummingMergeTree — https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse official documentation: AggregatingMergeTree — https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse official documentation: AggregateFunction type and -State/-Merge combinators — https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse official documentation: system.tables — https://clickhouse.com/docs/operations/system-tables/tables
- ClickHouse official documentation: system.query_log — https://clickhouse.com/docs/operations/system-tables/query_log

## Issues Found
1. **Incorrect monitoring query using `system.tables.last_exception`**: The post queried `SELECT name, last_exception FROM system.tables WHERE name LIKE '%_mv'` to check for materialized view errors. The `system.tables` table does not have a `last_exception` column. Replaced this with a query against `system.query_log` filtering for `type = 'ExceptionWhileProcessing'`, which is the correct way to find materialized view insertion errors.

## Review Notes
- The AggregatingMergeTree example references columns (`country`, `session_duration_ms`) not defined in the `events` source table from the earlier section. This is acceptable as a standalone conceptual example, but readers following along sequentially would need to add those columns to their `events` table.
- The chaining section references an `events_hourly` table that was never explicitly defined. Again acceptable as a conceptual example, but could be confusing to readers trying to run all examples end-to-end.
- All SQL syntax is correct for current ClickHouse versions: `CREATE MATERIALIZED VIEW ... TO ... AS SELECT`, `SummingMergeTree(column)`, `AggregateFunction(func, type)`, `-State`/`-Merge` combinators, `toDate()`, `toStartOfHour()`, `today() - N`, and `count()`.
- The backfill pattern (INSERT INTO target SELECT ... directly, bypassing the MV) is correctly described.
- The note about using `sum()` when querying `SummingMergeTree` is correct — unmerged parts may contain duplicate keys that haven't been collapsed yet.
