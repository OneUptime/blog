# Validation Summary: How to Configure MySQL Internal Temporary Table Settings

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL 8.0
- TempTable storage engine
- MEMORY storage engine
- InnoDB (for on-disk temporary tables)
- MySQL Performance Schema

## Sources Consulted
- MySQL 8.0 Reference Manual — Internal Temporary Table Use in MySQL: https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual — MEMORY Storage Engine: https://dev.mysql.com/doc/refman/8.0/en/memory-storage-engine.html
- MySQL 8.0 Reference Manual — FOREIGN KEY Constraints: https://dev.mysql.com/doc/refman/8.0/en/create-table-foreign-keys.html
- MySQL 8.0.16 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html
- MySQL 8.0.26 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html

## Issues Found
1. **MEMORY engine BLOB claim (line 31)**: The first bullet under MEMORY engine said "Fixed size rows (wastes space for VARCHAR, BLOB)". The MEMORY engine cannot store BLOB columns at all — it forces disk conversion. Removed "BLOB" from that bullet since the next bullet already correctly states BLOB/TEXT is unsupported.

2. **False foreign key claim (line 87)**: The post stated "InnoDB disk temporary tables support transactions and foreign keys, unlike MyISAM." MySQL documentation explicitly states foreign keys cannot be defined on temporary tables regardless of engine. Replaced with accurate statement about InnoDB's row-level locking and crash recovery advantages, and added clarification that foreign keys are not supported on any temporary tables.

3. **`internal_tmp_disk_storage_engine` removed (lines 78-85)**: This system variable was removed in MySQL 8.0.16. From that version onward, InnoDB is always used for on-disk internal temporary tables. The post presented it as a current option without qualification. Added comments noting the removal in 8.0.16 and updated the persistent config section accordingly.

4. **`temptable_use_mmap` deprecated (line 66)**: This variable was deprecated in MySQL 8.0.26. The replacement approach is to set `temptable_max_mmap = 0` to disable memory-mapped files. Added deprecation comments in both the SQL example and the persistent configuration section.

## Review Notes
- The Performance Schema query using `memory/temptable/physical_ram` is correct and verified against MySQL documentation.
- Default values for `temptable_max_ram` (1 GiB) and `temptable_max_mmap` (1 GiB) are correct for MySQL 8.0.
- The `internal_tmp_mem_storage_engine` variable and its TempTable/MEMORY options are correctly documented.
- In MySQL 9.0+, `temptable_max_mmap` defaults to 0 (disabled) and in MySQL 9.6+, `temptable_max_ram` defaults to 3% of total server memory. These newer version changes are out of scope for this MySQL 8.0-focused post but worth noting for future updates.
