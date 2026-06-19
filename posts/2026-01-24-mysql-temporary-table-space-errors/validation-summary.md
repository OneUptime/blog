# Validation Summary: How to Fix 'Temporary Table' Space Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MySQL
- MySQL TempTable and MEMORY internal temporary table engines
- MySQL Performance Schema
- Linux disk usage and tmpfs commands
- MySQL server configuration files

## Sources Consulted
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL: https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.4 Reference Manual: Internal Temporary Table Use in MySQL: https://dev.mysql.com/doc/refman/8.4/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual: Server System Variables (`tmp_table_size`, `max_heap_table_size`, `tmpdir`, `temptable_max_ram`, `temptable_max_mmap`, `temptable_use_mmap`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.4 Reference Manual: What Is New in MySQL 8.4 since MySQL 8.0: https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html
- MySQL 8.0 Reference Manual: Temporary Tablespaces: https://dev.mysql.com/doc/refman/8.0/en/innodb-temporary-tablespace.html
- Oracle MySQL 8.4 Reference Manual: Where MySQL Stores Temporary Files: https://docs.oracle.com/cd/E17952_01/mysql-8.4-en/temporary-files.html
- GNU coreutils `df` and `du` local help output.
- util-linux `mount` local help output.

## Issues Found
- The post described `tmp_table_size` and `max_heap_table_size` as always working as a pair. This is accurate for internal temporary tables using the `MEMORY` engine, but MySQL 8.0.28 and later also applies `tmp_table_size` to TempTable while `max_heap_table_size` does not apply to TempTable. Updated the wording to make the engine-specific behavior clear.
- The flowchart implied that `tmp_table_size` alone is always the conversion threshold. Updated it to say "in-memory limit" so it covers TempTable global limits and the MEMORY engine's smaller-of-two-limits behavior.
- The post said BLOB and TEXT columns always force disk-based temporary tables. That is outdated for MySQL 8.0.13 and later when the TempTable engine is used, because TempTable supports binary large object types. Updated the section to describe the older/MEMORY behavior and retained the advice to avoid carrying large columns through sorts.
- The MySQL 8.0 TempTable config recommended `temptable_use_mmap = ON`. This variable is deprecated as of MySQL 8.0.26 and its default changed in MySQL 8.4. Removed the deprecated option from the recommended config snippet.
- The quick reference listed fixed defaults for `temptable_max_ram` and `temptable_max_mmap`. MySQL 8.4 changed these defaults, so the table now distinguishes MySQL 8.0 from MySQL 8.4.
- The disk-ratio SQL examples could divide by zero if no temporary tables had been created. Added `NULLIF(..., 0)` guards.
- The temporary directory section could imply that `tmpdir` covers all on-disk internal temporary tables in modern MySQL. Added a note that MySQL 8.0.16 and later uses InnoDB session temporary tablespaces in the data directory by default.

## Review Notes
The examples are broadly correct as diagnostic and remediation patterns, but exact memory recommendations should still be sized per workload and concurrency. The `Created_tmp_disk_tables` metric has a documented limitation: it does not count on-disk temporary tables created in memory-mapped files, so Performance Schema TempTable memory instruments may be needed for deeper MySQL 8.x monitoring.
