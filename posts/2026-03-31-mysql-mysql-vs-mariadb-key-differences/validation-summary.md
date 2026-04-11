# Validation Summary: MySQL vs MariaDB: Key Differences and When to Use Each

## Status
validated

## Post Type
Comparison / Reference Guide

## Technologies Covered
- MySQL 8.0
- MariaDB (10.2+)
- InnoDB storage engine
- Aria storage engine
- MariaDB ColumnStore
- MySQL/MariaDB GTID replication
- Galera Cluster

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON data type — https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: CHANGE MASTER TO (deprecated) — https://dev.mysql.com/doc/refman/8.0/en/change-master-to.html
- MariaDB Documentation: Common Table Expressions — https://mariadb.com/kb/en/common-table-expressions/
- MariaDB Documentation: Window Functions — https://mariadb.com/kb/en/window-functions/
- MariaDB Documentation: JSON Data Type — https://mariadb.com/kb/en/json-data-type/
- MariaDB Documentation: Block-Based Join Algorithms — https://mariadb.com/kb/en/block-based-join-algorithms/
- MariaDB Documentation: Aria Storage Engine — https://mariadb.com/kb/en/aria-storage-engine/
- MariaDB Documentation: ColumnStore — https://mariadb.com/kb/en/mariadb-columnstore/

## Issues Found

1. **Window functions and CTEs incorrectly listed as MySQL 8.0-specific (line 23)**: The post claimed that "window functions with full syntax, CTEs" are MySQL 8.0-specific features requiring changes when switching to MariaDB. This is incorrect — MariaDB 10.2 (released 2017, before MySQL 8.0) added both window functions and CTEs. Replaced with actual MySQL 8.0-specific features: `caching_sha2_password` authentication plugin, the transactional data dictionary, and invisible indexes.

2. **Incorrect MariaDB hash join version (line 91)**: The post claimed hash join support was "added in MariaDB 10.7+" and described it as "not as mature." MariaDB has had Block Nested Loop Hash (BNLH) join since version 5.3 (2012), which predates MySQL 8.0's hash join by several years. Updated the comment to reflect the correct version and implementation name.

3. **Deprecated MySQL replication syntax (lines 66-69)**: The post used `CHANGE MASTER TO` with `MASTER_HOST` and `MASTER_AUTO_POSITION` parameters for MySQL 8.0. This syntax was deprecated in MySQL 8.0.23 (January 2021) in favor of `CHANGE REPLICATION SOURCE TO` with `SOURCE_`-prefixed parameters. Updated to use the current recommended syntax.

## Review Notes
- MariaDB ColumnStore is a separately installed plugin, not bundled with the default MariaDB server installation. The post's phrasing "MariaDB includes storage engines not available in MySQL" could be read as implying it ships by default. This is not strictly wrong but could be clarified in a future revision.
- MariaDB's `CHANGE MASTER TO` syntax remains current and is not deprecated in MariaDB, so that section correctly uses MariaDB's own syntax.
- The licensing section is accurate for the MariaDB Community Server but does not mention that some MariaDB ecosystem tools (e.g., MaxScale) use the Business Source License (BSL), which is not purely open-source. This is a minor omission since the post focuses on the database server itself.
- The SQL syntax in code examples (spacing around `=` in replication commands) is valid — MySQL's parser accepts both `KEY = value` and `KEY=value` forms.
