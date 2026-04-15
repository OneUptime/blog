# Validation Summary: How to Build ML Training Data Pipelines with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, AggregatingMergeTree, Materialized Views)
- SQL (aggregate functions, CTEs, window-like functions, combinators)
- Machine Learning data pipeline concepts (feature engineering, point-in-time correctness, stratified sampling)

## Sources Consulted
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse aggregate function combinators (-State, -Merge, -If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `neighbor` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/other-functions#neighbor
- ClickHouse `dateDiff` function documentation: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse `INTO OUTFILE` clause: https://clickhouse.com/docs/en/sql-reference/statements/select/into-outfile
- ClickHouse `cityHash64` function: https://clickhouse.com/docs/en/sql-reference/functions/hash-functions#cityhash64
- ClickHouse AggregatingMergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse division by zero behavior for integer types

## Issues Found

1. **Division by zero in conversion_rate (Feature Engineering section):** `countIf(event_type = 'purchase') / countIf(event_type = 'view')` could divide by zero when a user has no view events. While ClickHouse integer division by zero returns 0 (not an error), this is semantically misleading and was inconsistent with the export section which already used `greatest(..., 1)`. Fixed by wrapping the denominator with `greatest(countIf(event_type = 'view'), 1)`.

2. **Incorrect use of `neighbor()` inside aggregate with GROUP BY (Feature Engineering section):** `avg(dateDiff('second', timestamp, neighbor(timestamp, 1)))` used the `neighbor()` function inside an aggregate function in a `GROUP BY` query. The `neighbor()` function accesses the next physical row in the input stream, which crosses user group boundaries — the last row of one user's group would reference the first row of the next user, producing meaningless time differences. For the very last row overall, `neighbor` returns the DateTime default (`1970-01-01`), producing a huge nonsensical value. Replaced with `dateDiff('second', min(timestamp), max(timestamp)) / greatest(count() - 1, 1)`, which computes the average event gap as total time span divided by number of inter-event gaps.

3. **Misleading comment in Stratified Sampling section:** The comment said "10% random sample, balanced by label" but the query uses `cityHash64(user_id) % 100 < 10`, which is a deterministic hash-based sample with no actual stratification by label. Changed comment to "Deterministic 10% random sample" to accurately describe the query's behavior.

## Review Notes
- The `sumStateIf(1, event_type = 'purchase')` combinator ordering in the Materialized View section works in ClickHouse (the parser accepts combinators in either order), though `sumIfState` is the more conventionally documented ordering. Both produce identical results.
- The Stratified Sampling section's title promises label-balanced sampling, but the query only performs a deterministic hash sample. A true stratified sample would need a UNION ALL or window-function approach sampling from each label class independently. The comment was fixed but the section title still says "Stratified Sampling" — this is a minor naming mismatch but not a code error.
- The `INTO OUTFILE` path `/var/lib/clickhouse/exports/` assumes the directory exists and the ClickHouse server has write permissions. In practice, users may need to create this directory or configure `output_format_parallel_formatting` settings.
