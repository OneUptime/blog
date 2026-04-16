# Validation Summary: How to Use GRANT and REVOKE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse SQL-driven access control
- GRANT and REVOKE statements
- Role-based access control (CREATE ROLE)
- Column-level privileges (SELECT, INSERT)
- ClickHouse system tables (`system.grants`, `system.role_grants`)
- ClickHouse user management (CREATE USER, sha256_password authentication)

## Sources Consulted
- ClickHouse GRANT documentation: https://clickhouse.com/docs/en/sql-reference/statements/grant
- ClickHouse CREATE USER documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/user
- ClickHouse system.grants and system.role_grants table reference

## Issues Found
No technical issues found.

Verified:
- GRANT syntax `GRANT privilege [(column_list)] ON {db.table | db.* | *.*} TO {user | role}` matches official docs.
- All privilege types listed (SELECT, INSERT, ALTER, CREATE, DROP, TRUNCATE, OPTIMIZE, SHOW, SYSTEM, dictGet, ALL) are valid ClickHouse privileges with correct scopes.
- Column-level privileges work for both SELECT and INSERT (confirmed in docs).
- `WITH GRANT OPTION` clause syntax is correct.
- REVOKE syntax matches official docs.
- `system.grants` and `system.role_grants` tables exist with the queried `user_name` column.
- `CREATE USER ... IDENTIFIED WITH sha256_password BY '...'` syntax is correct.
- `DEFAULT ROLE` clause in CREATE USER is supported.
- `access_management = 1` setting in `users.xml` is the correct prerequisite.

## Review Notes
- The "ALL" privilege is noted in ClickHouse docs as unsupported in ClickHouse Cloud. The post doesn't claim Cloud compatibility, so this isn't a problem, but readers using ClickHouse Cloud should be aware.
- The example using `CREATE USER ... DEFAULT ROLE bi_reader; GRANT bi_reader TO grafana_user;` specifies DEFAULT ROLE before the role is granted to the user. ClickHouse permits this ordering — the DEFAULT ROLE setting takes effect once the GRANT runs — but some readers may find it cleaner to GRANT first then set the default via ALTER USER. Functionally correct as written.
