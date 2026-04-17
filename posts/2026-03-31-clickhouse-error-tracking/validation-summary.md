# Validation Summary: How to Build Error Tracking with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL dialect, table engines)
- MergeTree engine
- AggregatingMergeTree engine
- SummingMergeTree engine (mentioned)
- Materialized Views
- ClickHouse aggregate functions (`count`, `countDistinct`/`uniqExact`, `any`, `groupArray`, `uniqState`, `countState`)
- ClickHouse date/time functions (`toYYYYMMDD`, `toStartOfHour`, `toStartOfFiveMinutes`, `DateTime64`)
- `LowCardinality` type
- `generateUUIDv4` function

## Sources Consulted
- ClickHouse MergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse SummingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse AggregatingMergeTree docs: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse Materialized View docs: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse aggregate function combinators (`-State`, `-Merge`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse `groupArray` parameterized form `groupArray(N)(x)`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray

## Issues Found
- **Materialized view used `SummingMergeTree` with `countDistinct(user_id)` — semantically incorrect.** `SummingMergeTree` merges same-key rows by summing numeric columns. `countDistinct` (alias for `uniqExact`) produces per-batch distinct counts, so summing them across batches overcounts unique users (user_ids appearing in multiple batches are counted multiple times). The fix is to use `AggregatingMergeTree` together with `-State` combinators, which persist aggregation state that merges correctly. I changed the engine to `AggregatingMergeTree()`, replaced `count()` with `countState()`, and replaced `countDistinct(user_id)` with `uniqState(user_id)`. Readers query these columns with `countMerge()` and `uniqMerge()`. Updated the summary paragraph to refer to `AggregatingMergeTree` accordingly.

## Review Notes
- `PARTITION BY toYYYYMMDD(occurred_at)` creates daily partitions. This works, but can be very granular for high-volume systems — `toYYYYMM` (monthly) or `toStartOfWeek` is often recommended for production. Not a correctness issue.
- The `fingerprint UInt64` column is user-supplied; the post does not describe how to compute it (commonly done client-side via a hash of normalized stack trace / error type). Out of scope for this post, but worth noting for readers.
- `groupArray(3)(error_type)` uses the parameterized `groupArray(max_size)(x)` form, which is valid.
- `DateTime64(3)` is the millisecond-precision variant; all date functions used (`toStartOfHour`, `toStartOfFiveMinutes`, `toYYYYMMDD`) are supported on `DateTime64`.
- The post doesn't show how to query the materialized view. After the fix, readers must use `countMerge(occurrences)` and `uniqMerge(affected_users)` or wrap the view in a `SELECT ... FINAL` / query via the underlying table with `-Merge` functions. This is standard `AggregatingMergeTree` usage but is not spelled out in the post.
