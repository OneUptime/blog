# Validation Summary: How to Use ClickHouse for Search Analytics

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree, AggregatingMergeTree engines)
- ClickHouse SQL (DDL and analytical queries)
- ClickHouse codecs (LZ4, ZSTD, Delta, DoubleDelta)
- ClickHouse materialized views with SimpleAggregateFunction
- Search analytics patterns (CTR, zero-result rate, latency percentiles, trending queries)

## Sources Consulted
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on codecs: https://clickhouse.com/docs/en/sql-reference/statements/create/table#column_compression_codec
- ClickHouse documentation on MergeTree engine: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation on AggregatingMergeTree: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/aggregatingmergetree
- ClickHouse documentation on SimpleAggregateFunction: https://clickhouse.com/docs/en/sql-reference/data-types/simpleaggregatefunction
- ClickHouse documentation on aggregate function combinators (-If): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse documentation on uniqExact: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniqexact
- ClickHouse documentation on quantile: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/quantile
- ClickHouse documentation on materialized views: https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view

## Issues Found
1. **CTR query used `count()` instead of `uniqExact()` causing incorrect results due to JOIN fan-out.** The Click-Through Rate per Query section used `count()` as the search denominator and `countIf(c.click_id != ...)` as the click numerator. Because the LEFT JOIN between `search_queries` and `search_clicks` fans out rows (one search with N clicks produces N rows), `count()` over-counted searches and `countIf(...)` over-counted clicked searches. Fixed by changing to `uniqExact(q.query_id)` for the denominator and `uniqExactIf(q.query_id, c.click_id != ...)` for the numerator, which correctly counts distinct search queries and distinct queries that received at least one click.

## Review Notes
- The "Search Conversion Rate by Country" section title is slightly misleading — the query computes zero-result rate by country, not conversion rate (which typically measures click-through or purchase after search). The query itself is technically correct, but the heading could be more precise (e.g., "Zero-Result Rate by Country").
- The materialized view `query_stats_mv` hardcodes `0 AS clicks` because it only captures search events. A separate materialized view from `search_clicks` would be needed to populate the `clicks` column. This is noted in the architecture but not explicitly called out in the text.
- The `DoubleDelta` codec on `DateTime64(3)` is valid since DateTime64 is 8 bytes, which is a supported size for DoubleDelta.
- The `Delta(4)` codec on `UInt32` columns is correct (4-byte values).
- All ClickHouse function names (`uniqExact`, `countIf`, `quantile`, `toStartOfHour`, `toDate`, `toYYYYMM`, `nullIf`, `round`) are verified correct.
- The use of column alias references within the same SELECT clause (e.g., `zero_results / total_searches`) is valid ClickHouse syntax, though non-standard SQL.
