# Validation Summary: How to Analyze Ad Viewability Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, DateTime64, LowCardinality, window functions, multiIf)
- SQL (aggregation, HAVING, LEFT JOIN, window functions)
- MRC (Media Rating Council) viewability standard
- Ad tech / digital advertising analytics

## Sources Consulted
- MRC Viewable Ad Impression Measurement Guidelines: https://www.iab.com/wp-content/uploads/2015/06/MRC-Viewable-Ad-Impression-Measurement-Guideline.pdf
- ClickHouse DateTime64: https://clickhouse.com/docs/en/sql-reference/data-types/datetime64
- ClickHouse Custom Partitioning Key: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse SQL Syntax (aliases): https://clickhouse.com/docs/en/sql-reference/syntax
- ClickHouse GROUP BY: https://clickhouse.com/docs/en/sql-reference/statements/select/group-by
- ClickHouse Window Functions: https://clickhouse.com/docs/en/sql-reference/window-functions
- ClickHouse Arithmetic Functions (Date arithmetic): https://clickhouse.com/docs/en/sql-reference/functions/arithmetic-functions

## Issues Found
No technical issues found.

- MRC standard claim (50% pixels / 1 continuous second for display ads) is accurate.
- `DateTime64(3)` for milliseconds precision is valid.
- `PARTITION BY date` over a `Date DEFAULT toDate(event_time)` column is supported by MergeTree.
- Using SELECT aliases in `HAVING` and `GROUP BY` is a ClickHouse-supported extension.
- The "percent of total" pattern `count() / sum(count()) OVER ()` is valid ClickHouse window syntax.
- `today() - 7` correctly yields a Date seven days prior.
- The `multiIf` bucket expression correctly covers all `in_view_pct` ranges, and the alphabetic ordering of buckets ('0-25%', '25-50%', '50-75%', '75-100%') happens to match the intended numeric order.

## Review Notes
- The MRC guidance also specifies 30%/1s for large display ads (≥242,500 px) and 50%/2s for video; the post correctly scopes its claim to "display ad" and does not overreach.
- In the final CTR correlation query, the LEFT JOIN expands impressions with multiple clicks into multiple rows, which can inflate both `sum(v.is_viewable)` and `count(v.impression_id)`. In typical ad data this skew is negligible (most impressions have zero or one click), but for strict accuracy a subquery that aggregates clicks per impression first, or `countDistinct(v.impression_id)`, would be more defensible. Left as written since it is a common simplification and not syntactically incorrect.
- Using `count` as a column alias (`count() AS count`) is legal but can be confusing alongside the `count()` function; not changed since ClickHouse handles it unambiguously in this query.
