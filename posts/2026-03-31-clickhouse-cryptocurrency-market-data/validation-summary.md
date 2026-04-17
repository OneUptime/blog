# Validation Summary: How to Track Cryptocurrency Market Data in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate functions)
- OHLCV candle computation
- VWAP (Volume-Weighted Average Price)
- Cross-exchange arbitrage analytics

## Sources Consulted
- ClickHouse Data Types: https://clickhouse.com/docs/en/sql-reference/data-types
- LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Aggregate functions (argMin, argMax, countIf, maxIf, minIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- Conditional functions (multiIf): https://clickhouse.com/docs/en/sql-reference/functions/conditional-functions
- Date/time functions (toStartOfMinute, toStartOfHour, toYYYYMMDD, today, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
No technical issues found.

All SQL is syntactically valid ClickHouse:
- `LowCardinality(String)`, `DateTime64(3)`, `Float64` are correct data types.
- `MergeTree()` engine with `PARTITION BY toYYYYMMDD(...)` and `ORDER BY (...)` is idiomatic.
- Aggregate functions `argMin`, `argMax`, `max`, `min`, `sum`, `count`, `countIf`, `maxIf`, `minIf` all exist and are used correctly.
- `multiIf` is the correct function for multi-branch conditionals.
- `toStartOfMinute`, `toStartOfHour`, `now() - INTERVAL 1 HOUR`, and `today()` are all valid.
- Comparing `DateTime64` with `today()` (Date) works due to implicit conversion.

## Review Notes
- The `argMin(price, traded_at)` / `argMax(price, traded_at)` pattern for open/close prices is the canonical ClickHouse idiom for OHLCV — correct usage.
- `PARTITION BY toYYYYMMDD(traded_at)` creates daily partitions (Int32 YYYYMMDD form), which is appropriate for high-cardinality tick data. `toDate(traded_at)` is a slightly more common alternative but both are valid.
- The cross-exchange divergence query uses `maxIf`/`minIf` on per-minute buckets; for infinitesimal windows `anyIf` or `argMaxIf(price, traded_at, exchange = 'X')` might better capture "latest price" semantics, but the `maxIf` approach is defensible for a divergence signal.
- No version-specific caveats — all functions have been stable in ClickHouse for years.
