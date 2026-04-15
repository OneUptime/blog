# Validation Summary: How to Track CDN Performance Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree, SummingMergeTree engines)
- SQL (DDL and analytical queries)
- CDN access log analytics (cache hit rate, TTFB, bandwidth, error rate)
- Materialized views for pre-aggregation

## Sources Consulted
- ClickHouse documentation: Data Types (DateTime, LowCardinality, FixedString, UInt16/32/64, IPv4) — https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation: MergeTree engine family — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: SummingMergeTree — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/summingmergetree
- ClickHouse documentation: Materialized Views — https://clickhouse.com/docs/en/sql-reference/statements/create/view#materialized-view
- ClickHouse documentation: Aggregate functions (countIf, quantile, count) — https://clickhouse.com/docs/en/sql-reference/aggregate-functions
- ClickHouse documentation: Date/time functions (toYYYYMMDD, toYYYYMM, toStartOfMinute, toStartOfHour, now) — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation: formatReadableSize — https://clickhouse.com/docs/en/sql-reference/functions/other-functions#formatreadablesize
- ClickHouse documentation: INTERVAL syntax — https://clickhouse.com/docs/en/sql-reference/operators#interval

## Issues Found
No technical issues found.

## Review Notes
- The `SummingMergeTree` materialized view is correctly defined. Readers should be aware that queries against it should still use `GROUP BY` with `sum()` on value columns, since background merges are asynchronous and un-merged duplicate rows may exist at query time. The post does not show queries against the materialized view, so this is not an error.
- The `countIf(...) * 100.0 / count()` expressions are safe in practice (the WHERE clauses ensure rows exist), though ClickHouse returns `inf`/`nan` on division by zero rather than erroring.
- The `quantile()` function used for TTFB percentiles is approximate (reservoir sampling). For CDN analytics at scale this is appropriate and the post does not claim exact results.
- The `sum(ttfb_ms) AS ttfb_sum` in the materialized view correctly enables computing average TTFB from pre-aggregated data via `ttfb_sum / requests`. Percentile computation still requires raw data, which the post correctly handles by querying `cdn_access_logs` directly for percentiles.
