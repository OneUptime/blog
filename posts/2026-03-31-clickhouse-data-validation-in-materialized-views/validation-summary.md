# Validation Summary: How to Implement Data Validation Rules in ClickHouse Materialized Views

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (Materialized Views, MergeTree engine)
- SQL (DDL, DML, string/date functions)
- Data validation / ETL patterns

## Sources Consulted
- ClickHouse CREATE MATERIALIZED VIEW docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse CREATE TABLE (AS table) docs: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse date/time functions (`now`, `toDateTime`, `toDate`, `INTERVAL`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse string functions (`lower`, `upper`, `trim`): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse null-handling functions (`coalesce`, `ifNull`): https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls
- ClickHouse UUID functions (`toUUID`): https://clickhouse.com/docs/en/sql-reference/functions/uuid-functions

## Issues Found
- **Quarantine table column mismatch**: The `invalid_orders` table was created with `CREATE TABLE invalid_orders AS orders`, which copies only the five columns of `orders`. However, the materialized view `quarantine_orders_mv` performs `SELECT *, now() AS rejected_at`, producing six columns. ClickHouse requires the MV's SELECT column list to match the target table schema, so this would fail at view creation or on insert. Fixed by replacing the `AS orders` shortcut with an explicit `CREATE TABLE` definition that includes the `rejected_at DateTime` column alongside the original columns.

## Review Notes
- The `event_id IS NOT NULL` check in the normalization example only has an effect if `raw_events.event_id` is declared as `Nullable(UUID)`. For a plain `UUID` column, the predicate is always true but harmless — left as-is since the post does not declare the `raw_events` schema and the check is defensively correct either way.
- `CREATE TABLE ... AS source ENGINE = MergeTree() ORDER BY ts` is valid ClickHouse syntax: the engine override accepts associated MergeTree clauses (ORDER BY, PARTITION BY, etc.).
- `now() + INTERVAL 1 DAY` is valid ClickHouse interval arithmetic.
- Note for future readers: materialized views in ClickHouse fire only on inserts into the source table; they do not backfill historical data unless you run a manual `INSERT ... SELECT` into the target. The post correctly scopes its claim to "executes automatically on every INSERT".
