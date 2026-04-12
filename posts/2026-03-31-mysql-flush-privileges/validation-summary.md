# Validation Summary: How to Use FLUSH PRIVILEGES in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL grant tables and privilege system
- MySQL replication (binary log behavior)

## Sources Consulted
- MySQL 8.0 Reference Manual — FLUSH Statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html#flush-privileges
- MySQL 8.0 Reference Manual — When Privilege Changes Take Effect: https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html
- MySQL 8.0 Reference Manual — Grant Tables: https://dev.mysql.com/doc/refman/8.0/en/grant-tables.html

## Issues Found
1. **Incorrect claim about FLUSH PRIVILEGES replication behavior.** The "FLUSH PRIVILEGES on a Replica" section stated that `FLUSH PRIVILEGES` is written to the binary log and replicates by default, and that `FLUSH LOCAL PRIVILEGES` / `FLUSH NO_WRITE_TO_BINLOG PRIVILEGES` are needed to prevent replication. This is incorrect — `FLUSH PRIVILEGES` is **not** written to the binary log and therefore never replicates. The `LOCAL` and `NO_WRITE_TO_BINLOG` modifiers are syntactically accepted but redundant for this statement. The section was rewritten to clarify that `FLUSH PRIVILEGES` must be run separately on each replica if needed.

## Review Notes
- The post mentions grant tables "like `mysql.user`, `mysql.db`, and `mysql.tables_priv`" — the word "like" correctly frames these as examples. The full set of grant tables in MySQL 8.0 also includes `mysql.columns_priv`, `mysql.procs_priv`, `mysql.proxies_priv`, `mysql.global_grants`, `mysql.default_roles`, `mysql.role_edges`, and `mysql.password_history`. This is not an error but worth noting for completeness.
- The post correctly emphasizes that `FLUSH PRIVILEGES` is only needed after direct manipulation of grant tables (e.g., via `INSERT`/`UPDATE`/`DELETE`), not after using account-management statements like `GRANT`, `REVOKE`, `CREATE USER`, or `DROP USER`.
