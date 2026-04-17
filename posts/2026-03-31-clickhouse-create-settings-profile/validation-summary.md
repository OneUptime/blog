# Validation Summary: How to Create a Settings Profile in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- SQL (ClickHouse DDL)
- ClickHouse access control (settings profiles, users, roles)
- ClickHouse system tables (`system.settings_profiles`, `system.settings_profile_elements`)

## Sources Consulted
- ClickHouse CREATE SETTINGS PROFILE: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse CREATE USER: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse system.settings_profile_elements: https://clickhouse.com/docs/operations/system-tables/settings_profile_elements
- ClickHouse Query Cache: https://clickhouse.com/docs/operations/query-cache

## Issues Found

1. **Incorrect INHERIT clause placement in syntax block.** The post presented `INHERIT profile_name` as a separate clause between `SETTINGS` and `TO`. Per ClickHouse docs, `INHERIT` is an option *within* the `SETTINGS` clause (alternative to a variable definition) and requires the profile name in single quotes. Fixed the top-level syntax block accordingly.

2. **Incorrect INHERIT usage in the "Inheriting Profiles" examples.** The `restricted_profile` and `power_profile` examples used `INHERIT base_profile` as a standalone clause before `SETTINGS`. Rewrote them to place `INHERIT 'base_profile'` as the first element inside the `SETTINGS` clause (comma-separated with the rest of the settings), matching the official grammar.

3. **Unquoted profile names in CREATE USER / ALTER USER.** The post wrote `CREATE USER alice SETTINGS PROFILE analyst_profile` and `ALTER USER alice SETTINGS PROFILE power_profile`. Per the CREATE USER / ALTER USER docs, the profile name in the `SETTINGS PROFILE` form must be enclosed in single quotes. Added quotes around both profile names.

4. **Wrong column name in `system.settings_profile_elements` query.** The example queried a `readonly` column and a `name` column. The actual columns are `setting_name` (not `name`) and `writability` (an Enum, not `readonly`). Updated the `SELECT` to use `setting_name` and `writability`.

## Review Notes

- The constraint-keywords table (MIN, MAX, READONLY, CONST, WRITABLE, CHANGEABLE_IN_READONLY) is accurate.
- `TO ALL EXCEPT admin_role`, `readonly = 0 CONST`, `use_query_cache`, `max_insert_block_size`, `max_threads`, `max_memory_usage`, and `max_execution_time` are all valid ClickHouse settings / clauses.
- `SHOW SETTINGS PROFILES`, `SHOW CREATE SETTINGS PROFILE`, `ALTER SETTINGS PROFILE`, and `DROP SETTINGS PROFILE` are all correct.
- The simplified `TO` clause description in the syntax block omits users (only shows roles / ALL / ALL EXCEPT), but the actual grammar allows users as well. Not strictly wrong — kept as-is to avoid scope creep beyond error correction.
- The post does not mention `ON CLUSTER` or `IN access_storage_type`, which are optional clauses — acceptable omission for a practical tutorial.
