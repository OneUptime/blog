# Validation Summary: How to Model Append-Only Event Streams in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree engine, partitioning, TTL, async inserts)
- ClickHouse SQL (DDL, aggregation functions: argMax, countIf, groupUniqArray, dateDiff)
- ClickHouse data types (DateTime64, LowCardinality, Map, UInt64, String)
- ClickHouse HTTP interface (bulk insert via curl)

## Sources Consulted
- ClickHouse MergeTree engine documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- ClickHouse TTL lifecycle management: https://clickhouse.com/blog/using-ttl-to-manage-data-lifecycles-in-clickhouse
- ClickHouse async inserts documentation: https://clickhouse.com/docs/optimize/asynchronous-inserts
- ClickHouse date-time functions reference: https://clickhouse.com/docs/sql-reference/functions/date-time-functions
- ClickHouse argMax documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/argmax
- ClickHouse groupUniqArray documentation: https://clickhouse.com/docs/sql-reference/aggregate-functions/reference/groupuniqarray
- ClickHouse Map type documentation: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse LowCardinality documentation: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse custom partitioning key documentation: https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
No technical issues found.

## Review Notes
- The `TTL toDateTime(timestamp) + INTERVAL 1 YEAR` expression explicitly converts DateTime64 to DateTime. This conversion is safe and defensive but not strictly necessary on modern ClickHouse versions, which support TTL directly on DateTime64 columns. The current form is correct.
- The `WHERE timestamp >= today() - 7` comparison between a DateTime64 column and a Date value has had historical bugs in older ClickHouse versions (pre-24.x) due to implicit type conversion issues (see ClickHouse issues #40707, #13804, #50353). On modern ClickHouse (24.x+), this works correctly. For maximum portability to older versions, `now64(3) - INTERVAL 7 DAY` or `toDateTime64(today() - 7, 3)` would be safer alternatives, but the current form is correct for current releases.
- All async_insert settings (`async_insert`, `async_insert_max_data_size`, `async_insert_busy_timeout_ms`) use correct names and reasonable values.
- All aggregate functions (`argMax`, `countIf`, `groupUniqArray`, `dateDiff`) are used with correct syntax and compatible types.
- The curl HTTP interface bulk insert pattern is correct and follows ClickHouse best practices.
