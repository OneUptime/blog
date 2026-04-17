# Validation Summary: How to Use force_index_by_date in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse query settings (`force_index_by_date`, `force_primary_key`)
- ClickHouse user profile XML configuration
- Materialized views
- `system.query_log` and ProfileEvents
- `EXPLAIN` statement

## Sources Consulted
- ClickHouse official documentation: Settings reference (https://clickhouse.com/docs/operations/settings/settings)
- ClickHouse official documentation: EXPLAIN statement (https://clickhouse.com/docs/sql-reference/statements/explain)
- ClickHouse MergeTree engine docs (https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree)
- ClickHouse GitHub issue #1867 (force_index_by_date error message reference)
- ClickHouse GitHub issue #5059 (force_index_by_date behavior with complex partition expressions)

## Issues Found
1. **`EXPLAIN PLAN` does not show partition pruning details by default.**
   - The original post showed `EXPLAIN PLAN SELECT ...` and told readers to "Look for `Selected X out of Y parts` in the EXPLAIN output". Plain `EXPLAIN PLAN` only shows the query plan tree; part/granule selection is only visible when the `indexes = 1` option is used.
   - Fix: Changed `EXPLAIN PLAN` to `EXPLAIN indexes = 1`, and updated the expected output description to match the actual ClickHouse format (`Parts: X/Y` and `Granules: A/B`).

## Review Notes
- The paraphrased error message ("Error: Index `event_date` is not used and setting 'force_index_by_date' is set.") is a readable approximation of ClickHouse's actual message, which is typically "MinMax index by columns (date) is not used and setting 'force_index_by_date' is set." The paraphrase is close enough in spirit to not mislead readers and was left as-is.
- Known ClickHouse caveats not mentioned in the post (future improvements, not corrections): `force_index_by_date` historically has issues with Views (GitHub issue #1867), with complex `PARTITION BY` expressions like `toDate(toDateTime(dt/1000))` (issue #5059), and can block mutations when enabled at the session level. Readers hitting these edge cases should be aware.
- The root XML tag `<clickhouse>` is the modern convention; older deployments may still use `<yandex>`. Both are accepted by ClickHouse server for backward compatibility.
- `ProfileEvents['SelectedParts']` and `ProfileEvents['SelectedRanges']` are valid keys in `system.query_log`.
- The `ORDER BY (event_date, user_id, event_time)` primary sort key combined with `PARTITION BY toYYYYMM(event_date)` is a sound design and matches ClickHouse best practices for time-series tables.
