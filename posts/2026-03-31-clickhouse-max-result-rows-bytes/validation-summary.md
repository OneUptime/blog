# Validation Summary: How to Set max_result_rows and max_result_bytes in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (query complexity settings)
- SQL (ClickHouse SQL dialect)
- ClickHouse server configuration (users.xml profiles)

## Sources Consulted
- ClickHouse official docs: Query Complexity settings — https://clickhouse.com/docs/en/operations/settings/query-complexity#max-result-rows
- ClickHouse official docs: Query Complexity settings — https://clickhouse.com/docs/en/operations/settings/query-complexity#max-result-bytes
- ClickHouse official docs: system.query_log table — https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse official docs: Settings Profiles — https://clickhouse.com/docs/en/operations/settings/settings-profiles
- ClickHouse source code: ErrorCodes.cpp (error code 396 = TOO_MANY_ROWS_OR_BYTES)

## Issues Found
No technical issues found.

## Review Notes
- The `max_result_rows` and `max_result_bytes` descriptions accurately match the official docs ("limits the number of rows in the result" and "limits the result size in bytes (uncompressed)").
- The `result_overflow_mode` values (`throw` as default, `break`) are correct.
- Error code 396 (TOO_MANY_ROWS_OR_BYTES) is confirmed in the ClickHouse source.
- The `users.xml` profile configuration format matches the official docs example (which shows the exact same settings under a profile).
- All `system.query_log` column names used (`event_date`, `query_start_time`, `user`, `query_duration_ms`) are confirmed valid.
- The LIMIT interaction description is accurate: `max_result_rows` checks the final result row count, which is naturally bounded by LIMIT. The setting only triggers when the post-LIMIT result exceeds the threshold.
- The default values of `max_result_rows` and `max_result_bytes` are both 0 (unlimited) per the docs. The blog does not explicitly state this but does not contradict it either — the post focuses on setting non-zero values.
