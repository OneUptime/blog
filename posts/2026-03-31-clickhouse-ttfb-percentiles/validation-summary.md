# Validation Summary: How to Calculate Time to First Byte (TTFB) Percentiles in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (MergeTree engine, aggregate functions, TTL)
- SQL (quantile/quantiles functions, countIf combinator, date arithmetic)
- Web Vitals / TTFB performance metrics

## Sources Consulted
- ClickHouse quantile function docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantile
- ClickHouse quantiles function docs: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/quantiles
- ClickHouse aggregate function combinators (countIf): https://clickhouse.com/docs/sql-reference/aggregate-functions/combinators
- ClickHouse MergeTree engine docs: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse TTL docs: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse date/time functions (toStartOfMinute): https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse HAVING clause docs: https://clickhouse.com/docs/sql-reference/statements/select/having
- ClickHouse Array data type docs: https://clickhouse.com/docs/sql-reference/data-types/array
- Google Web Vitals TTFB thresholds: https://web.dev/articles/ttfb

## Issues Found
- **"Core Web Vitals" mislabel (line 94):** The post said "Core Web Vitals TTFB thresholds" but TTFB is not one of the three Core Web Vitals (LCP, INP, CLS). It is a supplementary Web Vitals metric. The threshold values (Good <= 800ms, Needs Improvement 800-1800ms, Poor > 1800ms) were correct. Changed "Core Web Vitals" to "Web Vitals".

## Review Notes
- All ClickHouse SQL syntax is correct: `quantile(level)(column)` parametric syntax, `quantiles` for multiple percentiles, `countIf` combinator, `toStartOfMinute`, TTL expressions, and MergeTree ORDER BY.
- ClickHouse uses 1-based array indexing, so `pctiles[5]` correctly references the 5th element (p99) from the quantiles array.
- Column alias usage in HAVING (`HAVING requests >= 100`) is explicitly supported by ClickHouse.
- `today() - 1` and `today() - 7` are valid integer subtraction on Date types (subtracts days). While `INTERVAL` syntax is generally preferred for DateTime arithmetic, plain integer subtraction on Date types is safe and widely used.
