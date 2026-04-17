# Validation Summary: How to Build Energy Consumption Analytics with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree family, SummingMergeTree, AggregatingMergeTree, Materialized Views, window functions)
- SQL (ClickHouse dialect)
- Time-series analytics patterns (rolling averages, peak demand, cost aggregation)

## Sources Consulted
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse SimpleAggregateFunction docs: https://clickhouse.com/docs/sql-reference/data-types/simpleaggregatefunction
- ClickHouse QUALIFY docs: https://clickhouse.com/docs/sql-reference/statements/select/qualify
- ClickHouse window functions reference: https://clickhouse.com/docs/sql-reference/window-functions
- ClickHouse date/time function docs (toYear, toMonth, toYYYYMM, toStartOfHour, toDayOfWeek, toHour, today, now): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse MergeTree TTL & partitioning docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree

## Issues Found

1. **Window function result referenced in WHERE clause (Anomaly Detection query).**
   The original query filtered on `spike_ratio > 2.0` in a `WHERE` clause at the same level where `rolling_avg` (a window function) and the derived `spike_ratio` were defined. In ClickHouse (and standard SQL), `WHERE` is evaluated before window functions, so referencing a window function result — directly or via an alias that transitively depends on one — errors out. `QUALIFY` (ClickHouse 24.5+) or a wrapping subquery is required.

   **Fix:** Wrapped the window-function SELECT in a subquery and moved the `spike_ratio > 2.0` filter to the outer SELECT. This is portable across all ClickHouse versions that support window functions (21.5+).

2. **SummingMergeTree used for a table that stores a peak (max) value.**
   The original `energy_daily_summary` table was a `SummingMergeTree` with a plain `Float64 peak_kwh` column. During background merges, SummingMergeTree sums all non-key numeric columns — so peak values from different insert batches for the same `(site_id, day)` would be added together, producing inflated, incorrect peaks rather than preserving the maximum.

   **Fix:** Switched the engine to `AggregatingMergeTree` and typed all value columns as `SimpleAggregateFunction` with the appropriate aggregate: `sum` for `total_kwh` and `total_cost`, `max` for `peak_kwh`. `SimpleAggregateFunction` is the right pick here because each of these aggregates has an intermediate state that equals the final value, avoiding the overhead of `-State`/`-Merge` combinators. The materialized view SELECT itself did not need to change — ClickHouse will apply the correct per-column aggregation during merges.

## Review Notes
- Readers should be aware that `AggregatingMergeTree` merges are asynchronous and may be partial at read time. To guarantee correct aggregates on the summary table, queries should wrap reads in the matching aggregate (`sum(total_kwh)`, `max(peak_kwh)`) with `GROUP BY (site_id, day)`, or use `FINAL`.
- The `TTL recorded_at + INTERVAL 5 YEAR` on the raw table drops rows after 5 years but does not automatically cascade to the summary table; operators wanting parallel retention on the summary would need a separate TTL there.
- The Cost Breakdown query uses `today() - INTERVAL 365 DAY` (returns Date) compared against a `DateTime` column — this works via ClickHouse's implicit conversion but will include any records timestamped at 00:00:00 exactly 365 days ago; good enough for analytics, worth noting for strict windowing.
- The post could mention that QUALIFY (24.5+ with the new analyzer, which is default from 24.3 / fully default in 24.8) is a cleaner alternative to the subquery pattern used for the spike-ratio filter, for readers on modern ClickHouse.
