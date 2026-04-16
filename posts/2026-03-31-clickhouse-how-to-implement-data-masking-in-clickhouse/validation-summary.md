# Validation Summary: How to Implement Data Masking in ClickHouse

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (SQL, row policies, roles/grants)
- ClickHouse `system.grants` and `system.query_log` system tables
- ClickHouse server configuration (`query_masking_rules` in `config.xml`)

## Sources Consulted
- ClickHouse SQL reference — `CREATE ROW POLICY`: https://clickhouse.com/docs/en/sql-reference/statements/create/row-policy
- ClickHouse SQL reference — other/user functions (`currentUser`): https://clickhouse.com/docs/en/sql-reference/functions/other-functions
- ClickHouse SQL reference — string functions (`repeat`, `substring`, `length`): https://clickhouse.com/docs/en/sql-reference/functions/string-functions
- ClickHouse SQL reference — array/splitting functions (`splitByChar`, `replicate`): https://clickhouse.com/docs/sql-reference/functions/splitting-merging-functions
- ClickHouse system tables — `query_log`: https://clickhouse.com/docs/en/operations/system-tables/query_log
- ClickHouse system tables — `grants`: https://clickhouse.com/docs/en/operations/system-tables/grants
- ClickHouse server settings — `query_masking_rules`: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings
- ClickHouse GRANT / REVOKE statement docs: https://clickhouse.com/docs/en/sql-reference/statements/grant

## Issues Found

1. **Method 3 — non-existent `currentUserID()` function.** The original row-policy example used `USING customer_id = currentUserID()`. ClickHouse has no `currentUserID()` function; the correct function is `currentUser()`, which returns a `String` (the user name), not a numeric ID. The comparison with the UInt64 `customer_id` column was also type-incompatible. Changed the example to `USING name = currentUser()` and added a clarifying comment that the `name` column is expected to match the ClickHouse user name.

2. **Method 4 — fabricated `maskFields()` function and "ClickHouse Enterprise" column masking feature.** ClickHouse has no `maskFields()` function and no native per-column masking feature, and there is no distinct self-hosted "ClickHouse Enterprise" edition that provides one (ClickHouse editions are the open-source engine and ClickHouse Cloud). Replaced the section with accurate documentation of the real `query_masking_rules` configuration feature — regex-based masking applied to the query/server logs and process list, with a note that it only sanitizes logs and does not mask query results.

3. **Masking Functions section — incorrect use of `replicate`.** The post used `replicate('*', N)` to build a string of asterisks, but `replicate(x, arr)` in ClickHouse returns an array of the same length as `arr` filled with `x`, not a repeated string. Replaced both occurrences with `repeat('*', N)`, which is the correct string-repetition function.

## Review Notes
- `substring(s, -4)` with a negative offset is valid in ClickHouse and counts from the end of the string, so the phone/SSN masking examples work as written.
- `splitByChar('@', email)[2]` relies on ClickHouse's 1-indexed arrays and correctly returns the domain portion.
- Negative lengths in `repeat('*', length(phone) - 4)` will be produced if `phone` is shorter than 4 characters; for real-world data, callers may want to guard against this (e.g., `greatest(length(phone) - 4, 0)`). Left as-is since the post's context assumes well-formed phone values.
- `system.grants` correctly has the columns used (`user_name`, `database`, `table`, `column`, `access_type`).
- `system.query_log` correctly has the columns used (`event_time`, `user`, `client_hostname`, `query_kind`, `query`, `type`, `event_date`); `type = 'QueryFinish'` is a valid enum value.
- `REVOKE SELECT(col, col, ...) ON db.table FROM role` is the correct ClickHouse syntax for column-level privilege removal.
- `CREATE ROW POLICY ... FOR SELECT USING ... TO ...` is valid; `FOR SELECT` is optional but permitted (currently the only supported action).
