# Validation Summary: How to Use system.errors Table in ClickHouse

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- ClickHouse (system tables: `system.errors`, `system.query_log`)
- SQL

## Sources Consulted
- ClickHouse official documentation for system.errors: https://clickhouse.com/docs/en/operations/system-tables/errors
- ClickHouse official documentation for system.query_log: https://clickhouse.com/docs/en/operations/system-tables/query_log

## Issues Found

1. **Incorrect column name `last_error_stacktrace`**: The blog referenced a column called `last_error_stacktrace` in both the column description list and the "Getting the Stack Trace" SQL query. This column does not exist. The actual column is `last_error_trace` with type `Array(UInt64)`, which stores raw memory addresses rather than a human-readable stack trace string. Fixed the column description to use `last_error_trace` and updated the SQL query to use `arrayStringConcat(arrayMap(x -> demangle(addressToSymbol(x)), last_error_trace), '\n')` to convert the raw addresses into a readable stack trace.

## Review Notes
- The blog omits two columns available in `system.errors`: `last_error_format_string` (String) and `query_id` (String). These are not essential for the post's purpose but could be mentioned for completeness in a future update.
- The claim that there is no SQL command to reset error counters without restarting appears accurate based on available documentation, though it is not explicitly confirmed in the official docs.
- All `system.query_log` column references and enum type values (`ExceptionBeforeStart`, `ExceptionWhileProcessing`) are correct.
- The `remote` column is correctly used as `WHERE remote = 1` (it is `UInt8` type).
