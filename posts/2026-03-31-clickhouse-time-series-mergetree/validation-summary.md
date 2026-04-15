# Validation Summary: How to Use ClickHouse for Time Series Data with MergeTree

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree engines)
- ClickHouse column codecs (DoubleDelta, Gorilla, FPC, Delta, LZ4, ZSTD)
- ClickHouse materialized views and SimpleAggregateFunction / AggregateFunction types
- ClickHouse TTL, partitioning, and partition management
- Time series data modeling patterns

## Sources Consulted
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation on AggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse documentation on column codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on partition management (ALTER TABLE DROP PARTITION): https://clickhouse.com/docs/en/sql-reference/statements/alter/partition

## Issues Found

### Issue 1: Invalid use of `SimpleAggregateFunction(avg, Float64)`
- **What was wrong:** The `host_metrics_1m` rollup table used `SimpleAggregateFunction(avg, Float64)` for the `avg_v` column. The `avg` function is not supported by `SimpleAggregateFunction` because computing an average requires maintaining both a running sum and a count as intermediate state — it cannot be represented as a single value of the result type. Supported functions for `SimpleAggregateFunction` include `any`, `anyLast`, `min`, `max`, `sum`, `groupBitAnd`, `groupBitOr`, `groupBitXor`, etc.
- **What was changed:** Changed the column type to `AggregateFunction(avg, Float64)`, updated the materialized view to use `avgState(value)` instead of `avg(value)`, and updated the rollup query to use `avgMerge(avg_v)` with a proper `GROUP BY` clause. Also applied `max()` to the `max_v` SimpleAggregateFunction column in the query for correctness with potentially unmerged parts.
- **Why:** This would cause a CREATE TABLE error in ClickHouse. The `AggregateFunction` type with `-State`/`-Merge` combinators is the correct way to store pre-aggregated averages.

### Issue 2: Partition ID format mismatch
- **What was wrong:** The `DROP PARTITION '202312'` example referenced the `host_metrics` table, which uses `PARTITION BY toYYYYMMDD(ts)` (daily partitions). The partition ID `'202312'` is in `YYYYMM` format, which would only be valid for monthly partitions (`toYYYYMM`). No daily partition would match this ID.
- **What was changed:** Changed `'202312'` to `'20231201'` to match the `YYYYMMDD` daily partition format used by `host_metrics`.
- **Why:** The original command would silently do nothing (no matching partition), which could confuse readers trying to follow the tutorial.

## Review Notes
- The codec recommendations (DoubleDelta for timestamps, Gorilla for floats, FPC for structured floats, Delta for monotonic integers) are accurate and well-chosen.
- The compression ratio claims (30-100x for DoubleDelta on timestamps, 4-10x for Gorilla on floats) are reasonable for typical time series workloads.
- The `SimpleAggregateFunction(max, Float64)`, `SimpleAggregateFunction(min, Float64)`, and `SimpleAggregateFunction(sum, UInt64)` usages are all correct.
- The batch insert recommendation (at least 1,000 rows) aligns with ClickHouse best practices.
- The `Map(String, String)` type with `CODEC(ZSTD(3))` for tags is a valid pattern in modern ClickHouse versions.
- The `index_granularity = 8192` setting is the default value; including it explicitly is fine for pedagogical purposes.
