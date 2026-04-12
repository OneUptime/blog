# Validation Summary: How to Import Large Data Files into MySQL Efficiently

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (InnoDB, MyISAM)
- LOAD DATA INFILE / LOAD DATA LOCAL INFILE
- mydumper / myloader
- MySQL Performance Schema
- Bash (file splitting with `split`, `head`, `tail`)

## Sources Consulted
- MySQL 8.0 Reference Manual: LOAD DATA INFILE — https://dev.mysql.com/doc/refman/8.0/en/load-data.html
- MySQL 8.0 Reference Manual: ALTER TABLE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html (DISABLE KEYS / ENABLE KEYS behavior for MyISAM vs InnoDB)
- MySQL 8.0 Reference Manual: information_schema.processlist — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- MySQL 8.0 Reference Manual: Performance Schema stage event tables — https://dev.mysql.com/doc/refman/8.0/en/performance-schema-stage-tables.html
- MySQL 8.0 Reference Manual: InnoDB server variables — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- mydumper documentation — https://github.com/mydumper/mydumper

## Issues Found

### 1. `DISABLE KEYS` / `ENABLE KEYS` presented as working for InnoDB
**What was wrong:** The section "Disable Indexes During Import" stated "For InnoDB tables" and then showed `ALTER TABLE transactions DISABLE KEYS;` as the first approach. `DISABLE KEYS` / `ENABLE KEYS` only affects MyISAM non-unique indexes and is silently ignored for InnoDB tables.
**What was changed:** Rewrote the section to clarify that `DISABLE KEYS` / `ENABLE KEYS` only works for MyISAM, and that for InnoDB the correct approach is to explicitly drop and recreate secondary indexes. Removed the `DISABLE KEYS` / `ENABLE KEYS` statements from the code example, keeping only the InnoDB-appropriate `DROP INDEX` / `ADD INDEX` approach.
**Why:** Using `DISABLE KEYS` on an InnoDB table would give a false sense of optimization while having no actual effect on import performance.

### 2. Incorrect `information_schema.processlist` columns for MySQL
**What was wrong:** The monitoring query selected `stage`, `STATE`, `progress`, and `time` from `information_schema.processlist`. In MySQL, this table does not have `stage` or `progress` columns. Those columns exist in MariaDB's `information_schema.processlist` but not in MySQL's.
**What was changed:** Replaced the query with the correct MySQL approach using `performance_schema.events_stages_current`, which provides `EVENT_NAME`, `WORK_COMPLETED`, and `WORK_ESTIMATED` columns. Added the required `UPDATE` statements to enable stage event instruments in Performance Schema.
**Why:** The original query would fail with an "Unknown column" error on any MySQL server.

### 3. `LOAD DATA INFILE` path mismatch in chunk import script
**What was wrong:** The chunk files are created locally by the `split` command, but the import loop used `LOAD DATA INFILE '/tmp/$f'` which reads from the MySQL server's filesystem. The files would not exist at `/tmp/` on the server, and `LOAD DATA INFILE` cannot read client-side files.
**What was changed:** Changed to `LOAD DATA LOCAL INFILE '$f'` (which reads from the client machine) and added the `--local-infile=1` flag to the `mysql` client command to enable local file loading.
**Why:** Without this fix, the import would fail with a "file not found" error because the server would look for the chunks on its own filesystem.

## Review Notes
- `innodb_log_file_size` is deprecated in MySQL 8.0.30+ in favor of `innodb_redo_log_capacity`. The post doesn't specify a MySQL version and the setting still works, but readers using MySQL 8.0.30+ should be aware of the newer parameter.
- `LOAD DATA LOCAL INFILE` requires the server to also have `local_infile=ON` (global variable). This is disabled by default in MySQL 8.0+ for security reasons. A note about this could help readers avoid a common stumbling block.
- The `LOAD DATA INFILE` example in the first section (non-chunked) correctly uses server-side paths, which is fine when the file is on the server. The inconsistency was only in the chunked import section where files are clearly client-side.
