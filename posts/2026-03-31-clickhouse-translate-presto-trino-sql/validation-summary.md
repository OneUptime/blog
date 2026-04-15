# Validation Summary: How to Translate Presto/Trino SQL to ClickHouse SQL

## Status
validated

## Post Type
Reference / Migration Guide

## Technologies Covered
- ClickHouse (columnar OLAP database)
- Presto (federated SQL query engine)
- Trino (fork of Presto, federated SQL query engine)
- SQL (data types, date/time functions, array functions, string functions, aggregation)

## Sources Consulted
- ClickHouse official documentation — date/time functions: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse official documentation — array functions: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse official documentation — string search functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse official documentation — string functions (extract): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse official documentation — aggregate functions (uniq): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse official documentation — arrayJoin: https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse official documentation — data types: https://clickhouse.com/docs/en/sql-reference/data-types
- Trino official documentation — functions and operators: https://trino.io/docs/current/functions.html
- Presto official documentation — functions: https://prestodb.io/docs/current/functions.html

## Issues Found
No technical issues found.

All function mappings were verified:
- `toStartOfMonth` correctly replaces `date_trunc('month', ...)`
- `addDays(date, N)` argument order is correct (date first, count second)
- `dateDiff('second', start, end)` signature is correct (unit, start, end)
- `arrayStringConcat(array, separator)` exists and works as described
- `has(array, element)` correctly replaces Presto's `contains`
- `arrayJoin(array)` correctly replaces `CROSS JOIN UNNEST`
- `position(haystack, needle)` argument order is correct
- `extract(haystack, pattern)` returns the first capturing group as described
- `uniq(column)` is the correct approximate count-distinct equivalent
- Data type mappings (Int32, Int64, Float64, String, UInt8, DateTime64, etc.) are all accurate

## Review Notes
- ClickHouse also has a `Bool` type (alias for `UInt8`) available in newer versions. The `BOOLEAN -> UInt8` mapping in the post is still correct since `Bool` resolves to `UInt8` internally.
- For `approx_distinct -> uniq`, it is worth noting that ClickHouse's `uniq` uses an adaptive sampling algorithm, while Presto's `approx_distinct` uses HyperLogLog. Both are approximate but may produce slightly different results for the same data. The mapping is functionally correct.
- ClickHouse also supports `regexpExtract(haystack, pattern, index)` in newer versions, which is a closer syntactic match to Presto's `regexp_extract`. The post's use of `extract` is correct and works fine.
