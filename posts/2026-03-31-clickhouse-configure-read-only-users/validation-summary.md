# Validation Summary: How to Configure Read-Only Users in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL-driven RBAC, settings profiles, users.xml)
- ClickHouse system tables (`system.query_log`, `system.grants`)
- SHA-256 password authentication

## Sources Consulted
- ClickHouse — Permissions for Queries (readonly setting): https://clickhouse.com/docs/operations/settings/permissions-for-queries
- ClickHouse — CREATE USER: https://clickhouse.com/docs/sql-reference/statements/create/user
- ClickHouse — ALTER USER: https://clickhouse.com/docs/sql-reference/statements/alter/user
- ClickHouse — CREATE SETTINGS PROFILE: https://clickhouse.com/docs/sql-reference/statements/create/settings-profile
- ClickHouse — GRANT: https://clickhouse.com/docs/sql-reference/statements/grant
- ClickHouse — system.query_log: https://clickhouse.com/docs/operations/system-tables/query_log
- ClickHouse — system.grants: https://clickhouse.com/docs/operations/system-tables/grants

## Issues Found
1. **Incorrect description of `readonly = 2`.** The original bullet read: "`readonly = 2` - SELECT allowed plus changing their own `readonly` setting". Per the ClickHouse docs, `readonly = 2` allows SELECT queries plus general settings changes, but the `readonly` setting itself cannot be modified to escape this mode. Rewrote the bullet to accurately reflect this.
2. **Non-documented ALTER USER profile-assignment syntax.** The post used `ALTER USER readonly_user SETTINGS PROFILE readonly_profile;`. The documented ALTER USER grammar uses `ADD PROFILES 'profile_name'`. Updated to `ALTER USER readonly_user ADD PROFILES 'readonly_profile';`.

## Review Notes
- `CREATE USER ... IDENTIFIED WITH sha256_password BY '...'`, `DEFAULT DATABASE`, and `HOST IP '...'` syntax verified against official CREATE USER docs.
- Column-level `GRANT SELECT(col1, col2) ON db.table TO user` verified against GRANT docs.
- `system.query_log` columns (`user`, `query_kind`, `query`, `read_rows`, `read_bytes`, `type`, `event_time`) and `system.grants` columns (`user_name`, `access_type`, `database`, `table`) all exist as used.
- The `users.xml` snippet uses `<password_sha256_hex>`, profile reference, `<networks><ip>`, and `<quota>` — all valid element names. The embedded `<readonly>1</readonly>` inside a profile is valid. Note: in a real `users.xml`, `<users>` and `<profiles>` live under a top-level `<clickhouse>` (formerly `<yandex>`) element; the snippet elides that wrapper for brevity, which is fine for illustrative purposes.
- "Not enough privileges" is the correct ClickHouse error text for missing grants.
