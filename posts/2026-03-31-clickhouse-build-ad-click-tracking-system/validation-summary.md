# Validation Summary: How to Build an Ad Click Tracking System with ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, ReplacingMergeTree table engines)
- SQL (DDL and analytical queries)
- ClickHouse functions: `toYYYYMM`, `toStartOfHour`, `toStartOfTenMinutes`, `lagInFrame`, `dateDiff`, `row_number`, `uniq`, `nullIf`, `today`, `now`
- ClickHouse data types: `String`, `LowCardinality(String)`, `Decimal`, `DateTime64`, `UInt8`

## Sources Consulted
- ClickHouse SQL reference: https://clickhouse.com/docs/en/sql-reference
- ClickHouse MergeTree engines: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse ReplacingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse window functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions

## Issues Found
- **Cost Per Conversion query** referenced a non-existent alias `c.campaign_id`. The query declared aliases `i` (ad_impressions), `cl` (ad_clicks), and `co` (ad_conversions), so `c.*` would fail with an "unknown identifier" error. Fixed both the `SELECT` list and the `GROUP BY` clause to use `i.campaign_id`.

## Review Notes
- The `ReplacingMergeTree` example uses `toStartOfTenMinutes(clicked_at)` in the `ORDER BY`. This is valid and produces a 10-minute deduplication window, but readers should note that ReplacingMergeTree merging is eventual — duplicates remain visible until a background merge, so queries typically need `FINAL` or `SELECT ... GROUP BY` to deduplicate at read time.
- The deduplication CTE relies on `lagInFrame` returning NULL for the first row per partition. The `if(dateDiff('second', NULL, clicked_at) < 600, 1, 0)` will evaluate to 0 (the NULL comparison yields NULL, and the `if` returns the else branch), which is the intended behavior.
- The last-touch attribution query ranks clicks per user over the entire 30-day window rather than per-conversion. This is a simplification — a strict per-conversion last-touch model would join conversions to the most recent click *before* each conversion. The SQL is syntactically valid and reasonable for illustration.
- `today() - N` relies on implicit Date arithmetic (subtracting an integer yields a Date N days earlier), which is supported by ClickHouse.
