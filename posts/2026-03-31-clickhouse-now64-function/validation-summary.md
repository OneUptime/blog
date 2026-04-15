# Validation Summary: How to Use now64() for Sub-Second Precision in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine)
- DateTime64 data type and sub-second precision
- `now64()` function
- `dateDiff()` with millisecond unit
- `toUnixTimestamp64Milli()` for numeric timestamp conversion
- `toIntervalMillisecond()` for interval arithmetic
- `quantile()` aggregate functions for percentile calculations

## Sources Consulted
- ClickHouse official documentation for `now64()` function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#now64)
- ClickHouse official documentation for DateTime64 data type (https://clickhouse.com/docs/en/sql-reference/data-types/datetime64)
- ClickHouse official documentation for `dateDiff()` function (https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#datediff)
- ClickHouse official documentation for `toUnixTimestamp64Milli()` (https://clickhouse.com/docs/en/sql-reference/functions/type-conversion-functions#tounixtimestamp64milli)
- ClickHouse official documentation for Interval data type and `toIntervalMillisecond()` (https://clickhouse.com/docs/en/sql-reference/data-types/special-data-types/interval)
- ClickHouse source code: `src/Functions/now64.cpp`, `src/Functions/nowSubsecond.cpp`, `src/DataTypes/DataTypeDateTime64.h`

## Issues Found
1. **Incorrect claim about OS clock resolution (line 32):** The post stated "Most modern Linux systems provide microsecond resolution." This is inaccurate. Modern Linux distributions with `CONFIG_HIGH_RES_TIMERS` (standard in virtually all modern kernels) provide nanosecond-level clock resolution via `CLOCK_REALTIME`. ClickHouse's `now64()` implementation uses `clock_gettime(CLOCK_REALTIME)` which returns nanoseconds directly. Fixed to: "Most modern Linux distributions with high-resolution timer support provide nanosecond-level clock resolution."

## Review Notes
- The "now64 in INSERT Statements for Event Streams" section has a slightly nuanced framing. The paragraph implies `now64()` helps distinguish events within a batch, but the code comment correctly notes all rows in a batch get the same timestamp (since `now64()` is a constant expression). The real benefit is distinguishing between different batches or queries that occur within the same second. The code comment is accurate and provides the necessary clarification.
- `toDateTime()` applied to DateTime64 works in practice and is documented in ClickHouse guides, though the function reference page does not explicitly list DateTime64 as an accepted input type. This is not an error but a minor documentation gap in ClickHouse itself.
- All SQL syntax, function names, data types, and engine declarations are correct and current.
- The precision range of 0-9 for `now64()` and the default of 3 (milliseconds) are confirmed by both documentation and source code.
