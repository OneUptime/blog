# Validation Summary: How to Use Settings Profiles for Resource Control in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL-based access control, settings profiles, resource management)

## Sources Consulted
- [CREATE SETTINGS PROFILE | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/create/settings-profile) — verified INHERIT syntax, READONLY constraint syntax, full CREATE SETTINGS PROFILE grammar
- [system.settings_profile_elements | ClickHouse Docs](https://clickhouse.com/docs/operations/system-tables/settings_profile_elements) — verified column names (`setting_name`, `writability`, `profile_name`)
- [ALTER USER | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/alter/user) — verified ALTER USER syntax for assigning profiles (`ADD PROFILES`)
- [ALTER ROLE | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/alter/role) — verified ALTER ROLE syntax for assigning profiles (`ADD PROFILES`)
- [CREATE USER | ClickHouse Docs](https://clickhouse.com/docs/sql-reference/statements/create/user) — verified SETTINGS PROFILE syntax in CREATE USER context

## Issues Found

1. **Incorrect profile inheritance syntax (line 109):** The post used `INHERITS base_profile` as a standalone clause. ClickHouse uses `INHERIT` (singular, not plural) and it must appear inside the `SETTINGS` clause. Fixed to: `SETTINGS INHERIT 'base_profile', max_memory_usage = 30000000000;`

2. **Wrong column names in system table query (lines 95-96):** The post queried `name` and `readonly` from `system.settings_profile_elements`. The actual column names are `setting_name` and `writability` (an Enum8 with values WRITABLE, CONST, CHANGEABLE_IN_READONLY). Fixed to: `SELECT setting_name, value, writability`.

3. **Incorrect ALTER USER syntax for profile assignment (lines 68-70):** The post used `ALTER USER alice SETTINGS PROFILE 'analyst_profile'`. The ALTER USER statement requires the `ADD PROFILES` clause to assign profiles. Fixed to: `ALTER USER alice ADD PROFILES 'analyst_profile'`.

4. **Incorrect ALTER ROLE syntax for profile assignment (lines 80-81):** Same issue as above. `ALTER ROLE analysts SETTINGS PROFILE 'analyst_profile'` should use `ADD PROFILES`. Fixed to: `ALTER ROLE analysts ADD PROFILES 'analyst_profile'`.

## Review Notes
- The `workload = 'batch'` setting in the ETL profile example is valid syntax, but requires a workload named `batch` to be defined via `CREATE WORKLOAD` first. The post does not mention this prerequisite, which could confuse readers. However, this is a minor omission rather than a technical error.
- All resource-control settings listed in the table (`max_execution_time`, `max_memory_usage`, `max_threads`, `max_result_rows`, `max_rows_to_read`, `max_bytes_to_read`, `priority`) are valid ClickHouse settings.
- The description of `priority` ("lower = higher priority") is correct — ClickHouse uses lower numerical values for higher scheduling priority.
- The `READONLY` constraint syntax (`max_execution_time = 10 READONLY`) within CREATE SETTINGS PROFILE is correct per the official grammar.
