# Validation Summary: How to Track Power Grid Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree, Materialized Views, DateTime64, LowCardinality)
- SQL (CTEs, aggregate functions, window-based filtering)
- Power grid monitoring concepts (frequency excursions, voltage sags, load flow analysis)

## Sources Consulted
- ClickHouse documentation on MergeTree engine family: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on AggregateFunction type and -State/-Merge combinators: https://clickhouse.com/docs/en/sql-reference/data-types/aggregatefunction
- ClickHouse documentation on DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse documentation on date/time functions (toYYYYMMDD, toStartOfFifteenMinutes, toStartOfHour, today, now): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation on TTL: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl

## Issues Found

### 1. Integer division in Node Availability Summary (line 97)
**What was wrong:** The expression `countIf(status = 1) / count() * 100` performs integer division because both `countIf()` and `count()` return `UInt64`. Due to left-to-right evaluation, the division happens first, yielding 0 for any availability below 100% (and 1 only at exactly 100%). Multiplying by 100 afterward gives either 0 or 100 — no intermediate values.

**What was changed:** Rewritten to `countIf(status = 1) * 100.0 / count()`. The `100.0` float literal promotes the multiplication result to `Float64` before the division, preserving decimal precision (e.g., 99.7%).

### 2. AggregatingMergeTree with plain column types in Materialized View (lines 107-128)
**What was wrong:** The `grid_hourly_summary` target table used `AggregatingMergeTree()` engine but declared columns as plain `Float32`. The materialized view used standard aggregate functions (`avg`, `min`). `AggregatingMergeTree` requires `AggregateFunction(...)` column types to store intermediate aggregation state, and the MV must use `-State` combinators (`avgState`, `minState`) to produce that state. Without this, ClickHouse cannot properly merge partial aggregates during background part merges, leading to incorrect results when data for the same `(node_id, hour)` key arrives in multiple insert batches.

**What was changed:** Column types changed from `Float32` to `AggregateFunction(avg, Float32)` and `AggregateFunction(min, Float32)`. MV aggregate functions changed from `avg()`/`min()` to `avgState()`/`minState()`. To query the summary table, users would use `avgMerge(avg_freq_hz)` etc. with a GROUP BY.

## Review Notes
- When querying the `grid_hourly_summary` table, users need to use `-Merge` combinators (e.g., `SELECT node_id, hour, avgMerge(avg_freq_hz), avgMerge(avg_load_mw), minMerge(min_voltage_kv) FROM grid_hourly_summary GROUP BY node_id, hour`). The post could benefit from a query example showing this, but adding it was outside the scope of this technical correctness review.
- The `today() - 7` syntax in the Voltage Sag query is valid ClickHouse (integer subtraction on Date type subtracts days), though `today() - INTERVAL 7 DAY` would be more explicit and self-documenting.
- The `now()` function returns `DateTime` (second precision), not `DateTime64`. When compared with `DateTime64(3)` columns, ClickHouse performs implicit conversion, which works correctly for the queries in this post. For sub-second filtering, `now64(3)` would be more appropriate.
