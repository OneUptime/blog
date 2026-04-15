# Validation Summary: How to Use users.xml for User Management in ClickHouse

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (database server)
- ClickHouse users.xml configuration
- ClickHouse settings profiles and quotas
- SHA256 password hashing
- ClickHouse system tables (system.users, system.user_directories)

## Sources Consulted
- ClickHouse official documentation: Users and roles settings (https://clickhouse.com/docs/operations/settings/settings-users)
- ClickHouse official documentation: system.users table (https://clickhouse.com/docs/operations/system-tables/users)
- ClickHouse official documentation: system.user_directories table (https://clickhouse.com/docs/operations/system-tables/user_directories)
- ClickHouse official documentation: Named collections (https://clickhouse.com/docs/operations/named-collections)
- ClickHouse official documentation: Query cache (https://clickhouse.com/docs/operations/query-cache)
- ClickHouse official documentation: Access control and account management (https://clickhouse.com/docs/operations/access-rights)
- Local verification of SHA256 hash output via sha256sum command

## Issues Found

### 1. Incorrect SHA256 hash (lines 47, 53)
**What was wrong:** The SHA256 hash shown for "MySecretPassword" was `7c4a8d09ca3762af61e59520943dc26494f8941b` (40 hex characters). This is a SHA1-length hash, not SHA256 which produces 64 hex characters.
**What was changed:** Replaced with the correct SHA256 hash `c152246c91ef62f553d2109b68698b19f7dd83328374abc489920bf2e2e23510`, verified by running `echo -n 'MySecretPassword' | sha256sum`.
**Why:** Readers following the tutorial would get a mismatch between the command output and the value shown in the XML, causing confusion and potentially authentication failures.

### 2. Wrong XML element for database restriction (lines 95-98)
**What was wrong:** The post used `<databases>` to restrict which databases a user can access. In ClickHouse, `<databases>` is actually the element for row-level security filters (filtering rows within tables), not for restricting database access.
**What was changed:** Replaced `<databases>` with `<allow_databases>`, which is the correct element for restricting which databases a user can access.
**Why:** Using `<databases>` would not restrict database access as intended and could cause unexpected behavior or configuration errors.

### 3. Incorrect system.user_directories query (line 198)
**What was wrong:** The query `SELECT name, profile_name, quota_name FROM system.user_directories` references columns (`profile_name`, `quota_name`) that do not exist in the `system.user_directories` table. The actual columns are `name`, `type`, `params`, and `precedence`.
**What was changed:** Replaced with `SELECT name, type, params, precedence FROM system.user_directories` which uses the correct column names.
**Why:** The original query would fail with a column-not-found error.

## Review Notes
- The `<named_collection_control>` setting and `<query_cache_ttl>` profile setting were verified as valid and correctly used.
- The `SYSTEM RELOAD CONFIG` command and `kill -HUP` approach for reloading configuration are both correct.
- The `<readonly>1</readonly>` profile setting is correctly documented.
- The post correctly warns against plaintext passwords in production.
- The overall structure and advice (use SHA256 hashes, restrict networks, use profiles and quotas) is sound and follows ClickHouse best practices.
