# Validation Summary: How to Implement UTM Parameter Tracking in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree, Materialized Views)
- SQL (DDL and analytical queries)
- UTM parameter tracking / marketing attribution concepts

## Sources Consulted
- ClickHouse UUID functions documentation: https://clickhouse.com/docs/sql-reference/functions/uuid-functions
- ClickHouse LowCardinality data type documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse custom partitioning key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key
- ClickHouse aggregate function combinators (-If): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse argMin documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmin
- ClickHouse SummingMergeTree documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse Decimal data type documentation: https://clickhouse.com/docs/sql-reference/data-types/decimal
- ClickHouse Nullable functions (nullIf): https://clickhouse.com/docs/sql-reference/functions/functions-for-nulls
- ClickHouse operators documentation (INTERVAL): https://clickhouse.com/docs/sql-reference/operators

## Issues Found
No technical issues found.

## Review Notes
- `countDistinct(user_id)` (line 64) is technically valid — ClickHouse recognizes it as an alias for `COUNT(DISTINCT ...)`. However, idiomatic ClickHouse would use `uniq(user_id)` (approximate, fast) or `uniqExact(user_id)` (exact). This is a style preference, not a correctness issue.
- The materialized view using `SummingMergeTree` is correct, but consumers querying `utm_campaign_daily` should still wrap numeric columns in `sum()` and use `GROUP BY`, because background merges may not have collapsed all matching rows yet. The post does not show a query against this view, so this is just advisory.
- All ClickHouse functions (`generateUUIDv4`, `toYYYYMM`, `countIf`, `argMin`, `nullIf`, `toDate`, `round`, `count`, `sum`) are verified correct and non-deprecated.
- `LowCardinality(String)` is well-suited for `utm_source` and `utm_medium` columns, as these typically have fewer than 10,000 distinct values.
