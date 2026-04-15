# Validation Summary: How to Translate Spark SQL to ClickHouse SQL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache Spark SQL
- ClickHouse SQL
- SQL query translation / migration patterns

## Sources Consulted
- ClickHouse documentation on data types: https://clickhouse.com/docs/en/sql-reference/data-types
- ClickHouse documentation on date/time functions (toStartOfMonth, toStartOfYear, etc.): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse documentation on dateDiff: https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff
- ClickHouse documentation on array functions (arrayJoin): https://clickhouse.com/docs/en/sql-reference/functions/array-join
- ClickHouse documentation on aggregate functions (groupArray, groupUniqArray): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/grouparray
- ClickHouse documentation on format function: https://clickhouse.com/docs/en/sql-reference/functions/string-functions#format
- ClickHouse documentation on ifNull: https://clickhouse.com/docs/en/sql-reference/functions/functions-for-nulls#ifnull
- Apache Spark SQL function reference (datediff, date_trunc, explode, collect_list, collect_set, nvl, format_string): https://spark.apache.org/docs/latest/api/sql/

## Issues Found
No technical issues found.

## Review Notes
- The `BOOLEAN -> UInt8` mapping is correct but ClickHouse also supports a `Bool` type (alias for `UInt8`) since version 21.12, which could be mentioned as an alternative in a future update.
- ClickHouse also supports a `date_trunc` function directly (since version 21.8), which accepts the same granularity strings as Spark. This could simplify migrations where a 1:1 mapping is preferred, though the `toStartOf*` functions are more idiomatic ClickHouse.
- The post covers the most common translation patterns well. Additional areas that could be covered in a follow-up include window functions, lateral views, and JSON handling differences.
