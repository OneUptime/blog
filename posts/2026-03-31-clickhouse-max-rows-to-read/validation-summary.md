# Validation Summary: How to Set max_rows_to_read for Query Limits in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (query settings, query complexity limits, user profiles, distributed queries)
- SQL (ClickHouse SQL dialect)
- XML configuration (ClickHouse users.xml profiles)

## Sources Consulted
- ClickHouse Query Complexity documentation: https://clickhouse.com/docs/en/operations/settings/query-complexity
- ClickHouse Settings Profiles documentation: https://clickhouse.com/docs/en/operations/settings/settings-profiles
- ClickHouse ALTER SETTINGS PROFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/settings-profile
- ClickHouse CREATE SETTINGS PROFILE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse system.query_log documentation: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse Settings reference: https://clickhouse.com/docs/en/operations/settings/settings
- ClickHouse source code (ErrorCodes.cpp) for error code verification

## Issues Found

1. **Incorrect SQL command: `ALTER PROFILE` should be `ALTER SETTINGS PROFILE`**
   - **What was wrong:** The post used `ALTER PROFILE analyst SETTINGS ...` and `ALTER PROFILE dashboard SETTINGS ...`.
   - **What was changed:** Corrected to `ALTER SETTINGS PROFILE analyst SETTINGS ...` and `ALTER SETTINGS PROFILE dashboard SETTINGS ...`.
   - **Why:** The official ClickHouse SQL syntax for modifying settings profiles is `ALTER SETTINGS PROFILE`, not `ALTER PROFILE`. Using the incorrect command would result in a syntax error.

2. **Non-existent setting: `read_overflow_mode` corrected to `read_overflow_mode_leaf`**
   - **What was wrong:** The post presented `read_overflow_mode` as a ClickHouse setting that controls overflow behavior for `max_rows_to_read`. This setting does not appear in the ClickHouse query complexity documentation, which exhaustively lists all overflow mode settings.
   - **What was changed:** Corrected the section to reference `read_overflow_mode_leaf`, which is the documented setting that controls overflow behavior for `max_rows_to_read_leaf` (the per-shard limit for distributed queries). Added a note that the non-leaf `max_rows_to_read` always throws an exception when exceeded.
   - **Why:** The query complexity docs list all overflow mode settings: `group_by_overflow_mode`, `sort_overflow_mode`, `result_overflow_mode`, `timeout_overflow_mode`, `timeout_overflow_mode_leaf`, `set_overflow_mode`, `distinct_overflow_mode`, `transfer_overflow_mode`, `join_overflow_mode`, and `read_overflow_mode_leaf`. A non-leaf `read_overflow_mode` is not among them. Only the leaf variant exists.

## Review Notes
- The error code 158 (`TOO_MANY_ROWS`) was verified against ClickHouse source code and is correct.
- All `system.query_log` columns used in the monitoring query (`query_id`, `user`, `read_rows`, `read_bytes`, `query_duration_ms`, `query`, `type`, `event_time`) were confirmed to exist with correct types.
- The XML profile configuration format is correct per the settings profiles documentation.
- The `SET` and `SETTINGS` clause syntax is correct standard ClickHouse SQL.
- The flowchart showing the check between primary key filter and WHERE clause filter is a reasonable simplification. The ClickHouse docs note that "ClickHouse generally checks the restrictions only after data parts have been fully processed" which means the limit can be exceeded by up to one data part's worth of rows, but this detail is acceptable to omit in a high-level overview.
- The "Typical Limit Guidelines" table headers are slightly misaligned (the "Profile" column contains max_rows_to_read values, not profile names), but this is an editorial formatting issue rather than a technical error.
