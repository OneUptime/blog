# Validation Summary: How to Perform a MySQL Upgrade Readiness Check

## Status
validated

## Post Type
Guide

## Technologies Covered
- MySQL 5.7 and 8.0
- mysqlcheck CLI utility
- MySQL Shell (mysqlsh) Upgrade Checker utility
- MySQL information_schema
- SQL modes and authentication plugins

## Sources Consulted
- MySQL 8.0 Reference Manual: Server SQL Modes (https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html)
- MySQL 8.0 Reference Manual: Reserved Words (https://dev.mysql.com/doc/refman/8.0/en/keywords.html)
- MySQL 8.0 Reference Manual: mysqlcheck (https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html)
- MySQL Shell Reference: Upgrade Checker Utility (https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-upgrade.html)
- MySQL 8.0 Reference Manual: Upgrading MySQL (https://dev.mysql.com/doc/refman/8.0/en/upgrading.html)
- MySQL 8.0 Reference Manual: Caching SHA-2 Pluggable Authentication (https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html)

## Issues Found
1. **Fabricated SQL mode `DB_TRUNCATE_TABLE`** (line 89): The post listed `DB_TRUNCATE_TABLE` as a SQL mode removed in MySQL 8.0. This SQL mode does not exist in any version of MySQL. Replaced it with `NO_FIELD_OPTIONS`, which is an actual SQL mode that was removed in MySQL 8.0.

## Review Notes
- The list of reserved words in the "Checking for Reserved Word Conflicts" section includes `SYSTEM`, which is technically a non-reserved keyword in MySQL 8.0, not a reserved word. However, it is still a new keyword that could cause issues in certain contexts, so including it in the check query is a reasonable precaution.
- The post focuses on the 5.7 to 8.0 upgrade path. With MySQL 8.4 and 9.0 now available, a future update could address newer upgrade paths.
- The `mysqlcheck --check-upgrade` flag was deprecated in MySQL 8.0.16 and the check is now done automatically during upgrade. This is worth noting for readers running newer 8.0 versions, though it remains valid for the 5.7-to-8.0 context the post targets.
- All SQL queries are syntactically correct and would execute properly against MySQL's information_schema.
