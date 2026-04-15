# Validation Summary: How to Use system.error_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (system tables, SQL queries, server configuration)
- system.error_log table
- system.query_log table (referenced for correlation)

## Sources Consulted
- ClickHouse GitHub source code: `src/Common/ErrorCodes.cpp` (error code definitions)
- ClickHouse GitHub source code: `src/Interpreters/ErrorLog.cpp` and `ErrorLog.h` (table schema and column definitions)
- ClickHouse official documentation: `docs/en/operations/system-tables/error_log.md` (table description and column reference)
- ClickHouse server configuration documentation: `clickhouse.com/docs/en/operations/server-configuration-parameters/settings` (error_log config block)

## Issues Found
1. **Incorrect error code for LIMIT_EXCEEDED**: The post listed code 396 as `LIMIT_EXCEEDED`, but code 396 is actually `TOO_MANY_ROWS_OR_BYTES`. The real `LIMIT_EXCEEDED` error code is 290. Fixed the table to show code 290 for `LIMIT_EXCEEDED`.

## Review Notes
- The "Key Columns" table omits 5 columns that exist in the actual table: `hostname` (LowCardinality(String)), `last_error_time` (DateTime), `last_error_message` (String), `last_error_query_id` (String), and `last_error_trace` (Array(UInt64)). The section is titled "Key Columns" so this is an editorial choice, not an error, but `last_error_message` and `last_error_query_id` are quite useful for debugging and could be worth adding in a future update.
- The `error` column type is technically `LowCardinality(String)`, not plain `String` as listed. This is functionally equivalent but worth noting for precision.
- In the "Correlating with Query Failures" query, `toStartOfSecond()` is redundant since both `error_log.event_time` and `query_log.event_time` are already `DateTime` with second precision. The query works correctly but the function call is a no-op.
- The error_log/query_log JOIN is illustrative but could produce many-to-many results in practice, as multiple queries can fail within the same second with matching error strings. A note about this caveat could help readers avoid misleading results.
- All other SQL syntax (toStartOfHour, sumIf, left(), today(), etc.) is valid ClickHouse SQL.
- Configuration block is correct with accurate default values for flush_interval_milliseconds (7500) and collect_interval_milliseconds (1000).
