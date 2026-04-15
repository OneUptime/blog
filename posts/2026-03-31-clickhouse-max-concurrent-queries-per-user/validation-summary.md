# Validation Summary: How to Configure Max Concurrent Queries Per User in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration, SQL-driven access control)
- ClickHouse settings profiles and roles
- Python `clickhouse_connect` client library

## Sources Consulted
- ClickHouse source code `src/Common/ErrorCodes.cpp` — confirmed `TOO_MANY_SIMULTANEOUS_QUERIES` is error code 202 (not 201)
- ClickHouse source code `src/Interpreters/ProcessList.cpp` — confirmed `max_concurrent_queries_for_user` is a user-level `SettingsUInt64` setting enforced in the process list
- ClickHouse source code `src/Core/ServerSettings.cpp` — confirmed `max_concurrent_queries` is a server-level setting (default 0)
- ClickHouse docs: Settings Users (https://clickhouse.com/docs/en/operations/settings/settings-users) — confirmed valid sub-elements under user definitions in users.xml
- ClickHouse docs: Settings Profiles (https://clickhouse.com/docs/en/operations/settings/settings-profiles) — confirmed settings belong in profiles, not directly in user elements
- ClickHouse docs: CREATE SETTINGS PROFILE (https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile) — verified SQL syntax
- ClickHouse docs: ALTER USER (https://clickhouse.com/docs/en/sql-reference/statements/alter/user) — confirmed ALTER USER uses `ADD PROFILES 'name'` syntax
- ClickHouse docs: ALTER ROLE (https://clickhouse.com/docs/en/sql-reference/statements/alter/role) — confirmed ALTER ROLE requires `ADD|MODIFY SETTINGS`
- ClickHouse docs: CREATE ROLE (https://clickhouse.com/docs/en/sql-reference/statements/create/role) — confirmed CREATE ROLE supports inline `SETTINGS` clause
- ClickHouse docs: system.processes (https://clickhouse.com/docs/en/operations/system-tables/processes) — confirmed `user` and `elapsed` columns exist

## Issues Found

1. **Error code was wrong (201 → 202)**: The blog stated the error code for exceeding concurrent query limits is 201. The actual error code `TOO_MANY_SIMULTANEOUS_QUERIES` is **202** per `src/Common/ErrorCodes.cpp`. Fixed to `Code: 202`.

2. **XML configuration structure was incorrect**: The blog placed `max_concurrent_queries_for_user` directly under `<users><alice>` elements. According to ClickHouse docs, user elements in `users.xml` support only authentication, networks, profile references, quotas, and grants — not individual settings. Settings must go in the `<profiles>` section. Fixed the XML to define profiles with the setting, then reference those profiles from user definitions.

3. **ALTER USER syntax was wrong**: The blog used `ALTER USER alice SETTINGS PROFILE analyst_profile;`. ClickHouse's ALTER USER requires `ADD PROFILES 'profile_name'` (with quotes and `ADD` keyword). Fixed to `ALTER USER alice ADD PROFILES 'analyst_profile';`.

4. **ALTER ROLE syntax was wrong**: The blog used `ALTER ROLE heavy_analyst SETTINGS max_concurrent_queries_for_user = 10;`. ALTER ROLE requires `ADD|MODIFY SETTINGS`, not bare `SETTINGS`. Fixed by consolidating into `CREATE ROLE ... SETTINGS ...` which supports inline settings natively, avoiding the ALTER entirely.

5. **Global setting lacked config file context**: The `max_concurrent_queries` setting was shown without specifying it belongs in `config.xml` (server configuration), which could be confused with the `users.xml` context from the previous section. Added a comment clarifying it goes in `config.xml`.

## Review Notes
- The "ClickHouse 22.4+" version claim for SQL-based ALTER USER SETTINGS could not be precisely verified. SQL-driven access control has been available since earlier versions, but the specific constraint syntax may have been refined around that release.
- The Python retry example is functional but uses `clickhouse_connect` without showing client initialization. This is acceptable for a focused snippet.
- The `system.processes` query is correct — both `user` and `elapsed` columns are confirmed in the table schema.
