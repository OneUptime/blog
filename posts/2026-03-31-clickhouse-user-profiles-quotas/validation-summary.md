# Validation Summary: How to Configure ClickHouse User Profiles and Quotas

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (server configuration and SQL-driven access control)
- XML-based user/profile/quota configuration (`users.xml`)
- SQL-based access control (ClickHouse 20.4+)
- SHA-256 password hashing

## Sources Consulted
- ClickHouse documentation: Settings Profiles — https://clickhouse.com/docs/en/operations/settings/settings-profiles
- ClickHouse documentation: Quotas — https://clickhouse.com/docs/en/operations/quotas
- ClickHouse documentation: Access Control and Account Management — https://clickhouse.com/docs/en/operations/access-rights
- ClickHouse documentation: Settings (readonly) — https://clickhouse.com/docs/en/operations/settings/permissions-for-queries
- ClickHouse documentation: system.quota_usage — https://clickhouse.com/docs/en/operations/system-tables/quota_usage
- ClickHouse documentation: CREATE SETTINGS PROFILE — https://clickhouse.com/docs/en/sql-reference/statements/create/settings-profile
- ClickHouse documentation: CREATE QUOTA — https://clickhouse.com/docs/en/sql-reference/statements/create/quota

## Issues Found

1. **`readonly` setting description was incorrect for value 2**: The post stated "2 = no settings changes either" which is the opposite of the actual behavior. `readonly=2` means read-only queries but the user **can** change settings (unlike `readonly=1` which forbids settings changes). Fixed to: "2 = read-only but allows changing settings".

2. **Profile inheritance claim was wrong**: The post stated "ClickHouse does not have built-in profile inheritance." ClickHouse does support profile inheritance via the `<inherit>` tag within a profile definition. Replaced the incorrect paragraph with a correct explanation and XML example demonstrating the `<inherit>` tag.

3. **Invalid SHA-256 password hashes**: The `data_engineer` and `etl_pipeline` user entries had `password_sha256_hex` values that were only 40 hex characters long (SHA-1 length). SHA-256 hashes must be 64 hex characters. Extended both hashes to the correct 64-character length.

4. **`SHA256()` function returns raw bytes, not hex**: The ClickHouse SQL example `SELECT SHA256('my_secure_password')` returns a `FixedString(32)` of raw bytes, not a hex string usable in `password_sha256_hex`. Fixed to `SELECT lower(hex(SHA256('my_secure_password')))` which produces the correct hex representation.

5. **Misleading SQL comment**: The comment "Create a profile-equivalent row policy" was incorrect — the statement creates a settings profile, not a row policy (which is a different ClickHouse concept via `CREATE ROW POLICY`). Changed to "Create a settings profile".

6. **`system.quota_usage` column name**: The query referenced a `user_name` column that does not exist in the `system.quota_usage` table. The table uses `quota_key` to identify the quota consumer. Replaced `user_name` with `quota_key` and updated the comment.

## Review Notes
- The example password hashes are placeholder values for illustration purposes. In a real deployment, users should generate proper SHA-256 hashes using the documented methods.
- The SQL-driven access control section references ClickHouse 20.4+ which is accurate for when this feature was introduced, though modern deployments should be on much newer versions.
- The `ALTER ROLE ... SETTINGS PROFILE` syntax works but an alternative approach is to use `ALTER SETTINGS PROFILE ... TO role_name` to assign profiles to roles.
