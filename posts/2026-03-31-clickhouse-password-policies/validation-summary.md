# Validation Summary: How to Configure ClickHouse Password Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (SQL DDL, system tables, authentication methods)
- SHA-256, bcrypt, double SHA-1 password hashing
- ClickHouse users.xml configuration
- Bash utilities (sha256sum, sha1sum, xxd, awk)

## Sources Consulted
- ClickHouse documentation: CREATE USER statement — https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse documentation: ALTER USER statement — https://clickhouse.com/docs/en/sql-reference/statements/alter/user
- ClickHouse documentation: system.users table — https://clickhouse.com/docs/en/operations/system-tables/users
- ClickHouse documentation: Server settings (password complexity) — https://clickhouse.com/docs/en/operations/settings/settings-users
- ClickHouse documentation: Access control and account management — https://clickhouse.com/docs/en/operations/access-rights
- Local verification of SHA-256 and double SHA-1 hash generation commands

## Issues Found

1. **Incorrect SHA-256 hash value (line 37)**: The truncated hash `5e884898da28047151d0e56f8dc62927...` was the SHA-256 of the string "password", not "StrongPass!2026" as the comment stated. Replaced with the correct prefix `8348a239219f54fcb388bb212709db0b...` which matches `echo -n 'StrongPass!2026' | sha256sum`.

2. **Misleading section title (line 30)**: The section titled "Configuring Password Complexity in users.xml" did not actually show password complexity rules (e.g., minimum length, character class requirements). It showed how to store a hashed password in users.xml. Renamed to "Storing Hashed Passwords in users.xml" to accurately reflect the content.

3. **Incomplete double SHA-1 command (line 115)**: The double SHA-1 generation command was missing a final `| awk '{print $1}'` to strip the trailing `  -` from the sha1sum output. The SHA-256 command above it correctly included this awk step, but the double SHA-1 command did not. Added the missing pipe for consistent, clean output.

## Review Notes
- The post's title mentions "Password Policies" but does not cover ClickHouse's actual password complexity policy settings (the `<password_complexity>` configuration in config.xml, available since ClickHouse 22.x). This is not an error — the post focuses on password storage, expiration, and auditing — but a future update could add a section on complexity rules configured via `<password_complexity>` regex patterns in the server config.
- The queries against `system.users` referencing `valid_until` and `host_ip` columns are valid in recent ClickHouse versions (23.x+). Users on older versions may not have these columns available.
- The `host_ip` column in `system.users` is of type `Array(String)`, so the audit query at the end will return array values. This works but the output format may surprise users expecting a simple string.
