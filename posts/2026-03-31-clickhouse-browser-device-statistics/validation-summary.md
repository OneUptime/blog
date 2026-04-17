# Validation Summary: How to Track Browser and Device Statistics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, LowCardinality, DateTime64, window functions)
- SQL analytics (uniq, countIf, toStartOfWeek, toYYYYMMDD)
- Web/user-agent analytics (browser, OS, device type, screen resolution)

## Sources Consulted
- ClickHouse data types: https://clickhouse.com/docs/en/sql-reference/data-types
- LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- Aggregate functions (uniq, count, avg, countIf): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference
- Window functions in ClickHouse: https://clickhouse.com/docs/en/sql-reference/window-functions
- Date/time functions (today, toStartOfWeek, toYYYYMMDD): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- String functions (concat, toString): https://clickhouse.com/docs/en/sql-reference/functions/string-functions

## Issues Found
- **Device Type Breakdown query — incorrect aggregation for `sessions`**: The query labeled `count() AS sessions`, but `count()` over the `pageviews` table returns the number of pageview rows, not distinct sessions. Replaced with `uniq(session_id) AS sessions`, which correctly counts distinct sessions using the `session_id` column already defined in the schema.

## Review Notes
- Window-function syntax `sum(uniq(visitor_id)) OVER ()` is valid in ClickHouse (supported since 21.x) and produces the grand total of the per-group `uniq(visitor_id)` values — correct for share-percentage calculations.
- `PARTITION BY toYYYYMMDD(ts)` creates one partition per day. This is valid, but for very large pageview tables it can produce many partitions over time; monthly partitioning (`toYYYYMM`) is a common alternative. Not a correctness issue.
- `uniq` is an approximate distinct-count (HyperLogLog-based). For exact counts use `uniqExact`, though `uniq` is the standard choice for analytics at scale.
- The `avg(screen_width)` in the Device Type Breakdown mixes in rows where `screen_width = 0` (missing) if present; adding a filter like the one used in the Screen Resolution query would tighten the result, but this is a quality-of-result note, not a technical error.
