# Validation Summary: How to Monitor MySQL with INFORMATION_SCHEMA

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MySQL 8.0
- INFORMATION_SCHEMA virtual database
- InnoDB storage engine internals
- performance_schema (used in lock waits query)

## Sources Consulted
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA Tables — https://dev.mysql.com/doc/refman/8.0/en/information-schema.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA COLUMNS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA STATISTICS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA TABLE_CONSTRAINTS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-table-constraints-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA USER_ATTRIBUTES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-user-attributes-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA SCHEMA_PRIVILEGES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-schema-privileges-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TRX Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-trx-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: performance_schema data_lock_waits Table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-data-lock-waits-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PROCESSLIST Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA ROUTINES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-routines-table.html

## Issues Found
No technical issues found.

## Review Notes
- The "List All Users and Their Hosts" query joins `information_schema.USER_ATTRIBUTES` with `mysql.user` via RIGHT JOIN but selects no columns unique to USER_ATTRIBUTES (`ATTRIBUTE` is the only non-key column). The columns `account_locked`, `password_expired`, and `plugin` all come from `mysql.user`. The query is functionally correct but the join with USER_ATTRIBUTES is unnecessary — `SELECT user, host, account_locked, password_expired, plugin FROM mysql.user` would produce identical results. A future improvement could include the `ATTRIBUTE` JSON column from USER_ATTRIBUTES to justify the join.
- The "Find Duplicate Indexes" query uses `s1.index_name != s2.index_name`, which produces mirrored duplicate rows (both A,B and B,A). Using `s1.index_name < s2.index_name` would eliminate duplicates. This is a cosmetic issue — the query correctly identifies duplicate indexes.
- `information_schema.USER_ATTRIBUTES` requires MySQL 8.0.21+. The post does not specify version requirements.
- The lock waits query uses `performance_schema.data_lock_waits`, which is MySQL 8.0+ only. In MySQL 5.7, the equivalent was `information_schema.INNODB_LOCK_WAITS` (removed in 8.0).
- `information_schema.PROCESSLIST` is deprecated as of MySQL 8.0.22 in favor of `performance_schema.processlist`. It still works but may be removed in a future release.
- The `table_rows` estimate caveat is correctly noted in Best Practices — this is an important point for InnoDB tables where the value is an approximation.
