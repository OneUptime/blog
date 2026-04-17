# Validation Summary: How to Build Campaign Performance Dashboards with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SummingMergeTree engine, SQL functions: `sum`, `sumIf`, `round`, `today`, `toYYYYMM`)
- SQL (aggregation, JOINs, conditional aggregation)

## Sources Consulted
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse aggregate functions (`sumIf`, `sum`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse `round` function: https://clickhouse.com/docs/en/sql-reference/functions/rounding-functions
- ClickHouse JOIN syntax: https://clickhouse.com/docs/en/sql-reference/statements/select/join

## Issues Found
- **Daily Trend query read from SummingMergeTree without aggregation.** The query selected `impressions`, `clicks`, and `spend` directly with no `sum()` or `GROUP BY`. Because SummingMergeTree only merges rows in the background, a direct read can return unmerged duplicate rows and therefore incorrect per-day values. Fixed by wrapping the numeric columns in `sum()` and adding `GROUP BY date`, matching the pattern used by the other dashboard queries in the post.

## Review Notes
- The `campaign_daily_stats` table stores non-summable String/ID columns (`campaign_name`, `advertiser_id`) outside the sorting key. For SummingMergeTree this means arbitrary values are retained on merge when two rows share the same `(date, campaign_id)`. In practice this is fine if ingestion guarantees a stable mapping, but readers should be aware that these fields should not vary per key.
- The CTR/CVR/CPA calculations do not guard against division by zero — `impressions = 0` or `clicks = 0` would produce `inf`/`nan`. This is acceptable for example queries but production dashboards typically wrap these in `if(denominator = 0, 0, ...)` or use `divide` with a sentinel.
- The Budget Utilization query joins against a `campaign_budgets` table that is not defined in the post; this is clearly presented as a dimension table and does not need to be defined inline.
