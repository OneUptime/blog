# Validation Summary: How to Set Up Replication for Specific Databases in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- MySQL Replication (binary log filtering, replica-side filtering)
- MySQL configuration (`my.cnf`)
- `CHANGE REPLICATION FILTER` SQL command
- `performance_schema.replication_applier_filters`

## Sources Consulted
- MySQL 8.0 Reference Manual: The Binary Log — https://dev.mysql.com/doc/refman/8.0/en/binary-log.html
- MySQL 8.0 Reference Manual: `--binlog-do-db` option — https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#option_mysqld_binlog-do-db
- MySQL 8.0 Reference Manual: Replica Server Options — `replicate-do-db`, `replicate-wild-do-table` — https://dev.mysql.com/doc/refman/8.0/en/replication-options-replica.html
- MySQL 8.0 Reference Manual: `CHANGE REPLICATION FILTER` — https://dev.mysql.com/doc/refman/8.0/en/change-replication-filter.html
- MySQL 8.0 Reference Manual: `CHANGE REPLICATION SOURCE TO` — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: `replication_applier_filters` table — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-filters-table.html

## Issues Found

### 1. `binlog-do-db` caveat incorrectly presented as universal
**What was wrong:** The post stated that `binlog-do-db` always filters based on the current default database (`USE db_name`), without mentioning that this behavior is specific to statement-based logging. With row-based logging (the default in MySQL 8.0), `binlog-do-db` checks the database of the table being modified, so the example cross-database UPDATE would actually be logged correctly under default settings.
**What was changed:** Added clarification that the `USE db_name` caveat applies to statement-based logging, and that row-based logging (MySQL 8.0 default) checks the actual table's database. Replaced the incorrect advice to "always use fully-qualified table names" (which does not help under statement-based logging) with advice to verify the server's `binlog_format`.

### 2. `replicate-do-db` caveat incorrectly presented as universal
**What was wrong:** The post stated "The same USE db_name caveat applies to replicate-do-db" without noting the format dependency.
**What was changed:** Clarified that the caveat applies to statement-based logging, and that row-based logging (MySQL 8.0 default) checks the actual database of the modified table.

### 3. Incorrect advice about fully-qualified table names
**What was wrong:** The post advised "Always use fully-qualified table names when source-side filtering is active." Under statement-based logging, `binlog-do-db` checks the **current default database** (set by `USE`), not the database in the fully-qualified table name. Using fully-qualified names does not fix the filtering issue.
**What was changed:** Removed this incorrect advice and replaced it with guidance to verify the binary logging format.

### 4. Missing `CREATE TABLE` in verification example
**What was wrong:** The verification section ran `INSERT INTO should_not_replicate.test VALUES (1)` without first creating the `test` table, which would cause a "Table doesn't exist" error.
**What was changed:** Added `CREATE TABLE should_not_replicate.test (id INT);` before the INSERT statement.

## Review Notes
- The `CHANGE REPLICATION FILTER` syntax and `CHANGE REPLICATION SOURCE TO` syntax use the modern MySQL 8.0.23+ keywords (`REPLICA`/`SOURCE` instead of the older `SLAVE`/`MASTER`). This is correct and current.
- The `performance_schema.replication_applier_filters` table was introduced in MySQL 8.0.2 — this is correct.
- The overall recommendation to prefer `replicate-wild-do-table` over `replicate-do-db` is sound advice and well-supported by the official documentation.
