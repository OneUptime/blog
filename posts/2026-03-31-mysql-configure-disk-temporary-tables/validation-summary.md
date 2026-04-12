# Validation Summary: How to Configure MySQL Disk Temporary Tables

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- TempTable storage engine
- MEMORY storage engine
- MySQL performance_schema

## Sources Consulted
- MySQL 8.0 Reference Manual: Internal Temporary Table Use in MySQL (https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html)
- MySQL 8.0 Reference Manual: Server System Variables — tmp_table_size, max_heap_table_size, temptable_max_ram, temptable_use_mmap, temptable_max_mmap, internal_tmp_mem_storage_engine (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html)
- MySQL 8.0 Reference Manual: Server Status Variables — Created_tmp_tables, Created_tmp_disk_tables, Created_tmp_files (https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html)

## Issues Found

1. **`Created_tmp_files` description was inaccurate**: The post described it as "Temporary files created by sort operations." The MySQL documentation defines it as all temporary files created by mysqld, not limited to sort operations. Fixed to "Temporary files created by mysqld."

2. **"LOWER of these two values" rule was not qualified by engine**: The post stated that the effective in-memory temp table limit is the lower of `tmp_table_size` and `max_heap_table_size` without noting this only applies to the MEMORY engine. With the TempTable engine (MySQL 8.0 default), `max_heap_table_size` does not apply — `temptable_max_ram` governs the memory pool instead. Added clarification that this rule applies to the MEMORY engine and pointed readers to the TempTable section.

3. **Missing `temptable_max_mmap` in persistent config section**: The post set `temptable_max_mmap` to 4GB in the dynamic configuration section but omitted it from the "Making Settings Persistent" my.cnf block. Added `temptable_max_mmap = 4294967296` to the persistent config for consistency.

## Review Notes
- `temptable_use_mmap` was deprecated in MySQL 8.0.26. The post targets MySQL 8.0 generally and the variable still functions, but readers on newer MySQL versions should be aware of this deprecation.
- In MySQL 8.4, the default for `temptable_max_ram` changed from 1 GiB to 3% of total memory (clamped between 1-4 GiB). The post's stated default of 1GB is correct for MySQL 8.0.
- The performance_schema ratio query could return NULL if `Created_tmp_tables` is 0, but this is an unlikely edge case in practice.
