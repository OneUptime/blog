# Validation Summary: How to Create a Materialized View in ClickHouse Step by Step

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- ClickHouse (SQL, DDL/DML)
- MergeTree table engine
- AggregatingMergeTree table engine
- SummingMergeTree table engine
- Materialized Views (with TO syntax)
- AggregateFunction / SimpleAggregateFunction data types
- State / Merge aggregate function combinators (countState/countMerge, uniqState/uniqMerge, sumState/sumMerge, avgState/avgMerge)
- system.tables, system.query_log, system.parts

## Sources Consulted
- ClickHouse SHOW statements reference: https://clickhouse.com/docs/sql-reference/statements/show
- ClickHouse CREATE VIEW reference: https://clickhouse.com/docs/sql-reference/statements/create/view
- ClickHouse AggregateFunction data type: https://clickhouse.com/docs/sql-reference/data-types/aggregatefunction
- ClickHouse parser source (`ParserTablePropertiesQuery.cpp`): https://github.com/ClickHouse/ClickHouse/blob/master/src/Parsers/ParserTablePropertiesQuery.cpp
- ClickHouse AggregatingMergeTree docs and materialized-view guides (Altinity, ClickHouse blog)

## Issues Found
1. **Invalid `SHOW CREATE MATERIALIZED VIEW` syntax.** The post used `SHOW CREATE MATERIALIZED VIEW page_views_hourly_mv;`. Verified via the ClickHouse parser source (`ParserTablePropertiesQuery.cpp`): after `SHOW CREATE`, the parser only accepts `TABLE`, `VIEW`, `DATABASE`, or `DICTIONARY` — there is no `MATERIALIZED VIEW` branch. The documented/working form is `SHOW CREATE TABLE <mv_name>`. Changed the statement to `SHOW CREATE TABLE page_views_hourly_mv;`.

## Review Notes
- `AggregateFunction(count)` (with no type argument) is used for the row-count column. This is accepted by ClickHouse because `count()` takes no arguments; many official examples elsewhere use `AggregateFunction(count, UInt64)` for clarity, but both forms are valid. Left as-is.
- The backfill `INSERT INTO page_views_hourly SELECT ...` goes directly into the target table (bypassing the MV) and uses `-State` combinators to produce the correct `AggregateFunction` values — this is the recommended pattern when the MV was created with `TO` (which disallows `POPULATE`).
- `DROP VIEW page_views_hourly_mv;` correctly drops only the materialized view and not the target table — consistent with ClickHouse semantics for MVs created with `TO <table>`.
- The `system.tables` filter `engine = 'MaterializedView'` is correct; MVs register with that engine name regardless of the target table's engine.
- Minor style note (not an error): `INTERVAL 24 HOUR` works; `INTERVAL 1 DAY` would also be valid.
- Column-name ordering caveat worth mentioning in a future revision: ClickHouse matches MV output to the target table by column name, not position — aliasing every projected column (as the post already does) is the safe practice.
