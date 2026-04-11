# Validation Summary: MySQL vs SQLite: When to Use Which

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MySQL (InnoDB engine)
- SQLite
- Python sqlite3 module
- MySQL CLI client
- SQLite CLI (sqlite3)
- JSON functions in both databases

## Sources Consulted
- SQLite official documentation — storage classes and data types: https://www.sqlite.org/datatype3.html
- SQLite official documentation — limits (max database size): https://www.sqlite.org/limits.html
- SQLite official documentation — JSON functions: https://www.sqlite.org/json1.html
- SQLite release history (3.9.0 JSON1 extension, 3.38.0 built-in JSON): https://www.sqlite.org/changes.html
- MySQL 8.0 reference — InnoDB locking: https://dev.mysql.com/doc/refman/8.0/en/innodb-locking.html
- MySQL 8.0 reference — JSON path syntax and ->> operator: https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 reference — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 reference — InnoDB table limits (64 TB): https://dev.mysql.com/doc/refman/8.0/en/innodb-limits.html
- Python sqlite3 module documentation: https://docs.python.org/3/library/sqlite3.html

## Issues Found
- **SQLite JSON functions version claim**: The comment in the SQL code example stated "available from 3.38+" which is misleading. SQLite JSON functions (`json_extract`, etc.) were available as a loadable extension since SQLite 3.9.0 (2015-10-14). They became built-in (no extension loading required) in SQLite 3.38.0 (2022-02-22). Changed comment to "extension since 3.9, built-in from 3.38+" to accurately reflect the history.

## Review Notes
- The MySQL JSON example uses `->>'$.active' = 'true'` (string comparison) while the SQLite example uses `json_extract(data, '$.active') = 1` (integer comparison). Both are individually correct — MySQL's `->>` always returns a string, while SQLite's `json_extract` returns integer 1 for JSON boolean `true`. The examples implicitly assume different JSON value types but each is correct for its respective database.
- `SHOW REPLICA STATUS` is the modern syntax introduced in MySQL 8.0.22, replacing the deprecated `SHOW SLAVE STATUS`. The post does not specify a MySQL version, but this is the correct current syntax.
- The ~281 TB SQLite max size is correctly calculated: (2^32 - 2) pages × 65,536 bytes/page ≈ 281 TB theoretical maximum.
