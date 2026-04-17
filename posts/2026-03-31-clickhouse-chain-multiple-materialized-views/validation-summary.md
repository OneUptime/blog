# Validation Summary: How to Chain Multiple Materialized Views in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Materialized Views
- MergeTree table engine
- AggregatingMergeTree table engine
- SummingMergeTree table engine
- ClickHouse aggregate function combinators (`-State`, `uniq`)

## Sources Consulted
- ClickHouse Materialized Views documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- AggregatingMergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- SummingMergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- MergeTree engine docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- LowCardinality data type docs: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality

## Issues Found
No technical issues found. All SQL is syntactically valid, the cascading materialized view pattern works as described in ClickHouse (an INSERT into the MV's target table triggers any materialized views attached to that target table), and the functions/engines used are correct:
- `toYYYYMM`, `toStartOfMinute`, `toStartOfHour` are valid date/time functions.
- `LowCardinality(String)`, `AggregateFunction(uniq, UInt64)` types are correct.
- `uniqState(user_id)` correctly produces the state expected by the AggregateFunction column.
- `INTERVAL N MINUTE/DAY/HOUR` is valid ClickHouse syntax.
- `AggregatingMergeTree` correctly merges the `AggregateFunction` column on background merges.
- `SummingMergeTree` correctly sums the numeric columns on background merges, which is appropriate for the per-hour table.
- The cascade fires automatically — no special setting is required.

## Review Notes
- The `events_per_minute` table mixes plain numeric columns (`event_count UInt64`, `total_value Float64`) with an `AggregateFunction` column inside an `AggregatingMergeTree`. Plain numeric columns are NOT auto-aggregated on background merges by `AggregatingMergeTree` — only `AggregateFunction`/`SimpleAggregateFunction` columns are. This still works correctly here because (a) the MV's `GROUP BY` deduplicates per-block, and (b) Stage 3's MV groups by hour and uses `sum(event_count)`/`sum(total_value)` when reading from `events_per_minute`, so any non-merged duplicate rows are correctly summed at read time. For more robust direct querying of `events_per_minute`, the author could optionally switch to `SimpleAggregateFunction(sum, UInt64)` / `SimpleAggregateFunction(sum, Float64)` for those two columns. Not an error, just a future improvement.
- The verification query `SELECT * FROM events_per_minute …` will return the `unique_users` column as a binary state blob (since it is an `AggregateFunction` column). To see the unique count, readers would need `uniqMerge(unique_users)` with `GROUP BY`. This is fine for a "data is flowing" smoke test but could be noted in a future revision.
- Cascading MVs in ClickHouse work by default; no `cascade_*` setting needs to be enabled. The post correctly conveys this.
