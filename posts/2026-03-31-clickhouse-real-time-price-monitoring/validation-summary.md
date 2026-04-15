# Validation Summary: How to Build Real-Time Price Monitoring with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, AggregatingMergeTree engine)
- ClickHouse SQL (window functions, aggregate combinators, materialized views)
- ClickHouse data types (UInt64, LowCardinality, Decimal, DateTime64)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE and MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: AggregatingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation: Aggregate function combinators (-State/-Merge) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation: Window functions (lagInFrame) — https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse documentation: argMax aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse documentation: DateTime64 type and now64() — https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation: Materialized views — https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found
No technical issues found.

## Review Notes
- The summary mentions "OHLC-style statistics" but the materialized view tracks min, max, and avg — not the full Open/High/Low/Close quartet. This is a loose characterization rather than an error, since "OHLC-style" is used informally.
- The `lagInFrame` window function is ClickHouse-specific (as opposed to standard SQL `lag`). This is fine and is the idiomatic ClickHouse approach, though readers coming from other databases should be aware of the distinction.
- The price change detection query correctly handles NULL values from `lagInFrame` on the first row per product (the NULL propagates through arithmetic and is filtered out by the WHERE clause).
