# Validation Summary: How to Build Multi-Level Aggregation Chains with Materialized Views

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse Materialized Views
- AggregatingMergeTree engine
- Aggregate function combinators (`-State`, `-Merge`, `-MergeState`)

## Sources Consulted
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Materialized View docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse aggregate function combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse data types (Decimal, LowCardinality, Date, DateTime): https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse date/time functions (`toStartOfHour`, `toStartOfMonth`, `toDate`, `toYYYYMM`, `toYear`): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- **Performance Comparison query referenced a non-existent `date` column.** The raw table was defined with columns `event_time`, `user_id`, `event_type`, `country`, `revenue`, but the comparison query used `SELECT date, count() FROM raw_events ... GROUP BY date`. Fixed by changing `date` to `toDate(event_time) AS date` so the expression derives the date from `event_time`.

## Review Notes
- The chained Materialized View pattern (MV-on-MV-output) is a valid and widely used ClickHouse pattern. Inserts performed by an upstream MV into its target table will trigger downstream MVs that read from that target table.
- The `-State` / `-MergeState` / `-Merge` combinator usage is correct: raw events use `countState`/`uniqState`/`sumState`, the chained level uses `countMergeState`/`uniqMergeState`/`sumMergeState` to combine states into higher-level states, and final queries use `countMerge`/`uniqMerge`/`sumMerge` to finalize values.
- `AggregateFunction(count)`, `AggregateFunction(uniq, UInt64)`, and `AggregateFunction(sum, Decimal64(2))` declarations match the combinator calls.
- Backfill caveat (not a technical error, but worth being aware of): if the downstream Materialized Views are already attached when you run the backfill `INSERT` into an intermediate table, the MV will fire automatically and write to the downstream table, so the explicit second backfill could cause duplicates. In production you typically either (a) create tables first, backfill, then create the MVs, or (b) detach/attach the MVs during backfill. The post's individual SQL statements are all correct on their own.
- `today() - INTERVAL 12 MONTH` on a `Date` is supported in modern ClickHouse (it returns a `Date`), so the monthly query example is valid.
