# Validation Summary: How to Use InnoDB Temporary Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL 5.7 and 8.0+
- InnoDB storage engine
- InnoDB temporary tablespace (ibtmp1)
- Session temporary tablespaces (MySQL 8.0+)
- TempTable and MEMORY internal temporary table engines

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Temporary Tablespaces — https://dev.mysql.com/doc/refman/8.0/en/innodb-temporary-tablespace.html
- MySQL 8.0 Reference Manual: Internal Temporary Table Use — https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html
- MySQL 8.0 Reference Manual: innodb_temp_data_file_path — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_temp_data_file_path
- MySQL 8.0 Reference Manual: information_schema.INNODB_TABLESPACES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html
- MySQL 8.0 Reference Manual: information_schema.FILES — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- MySQL 8.0 Reference Manual: TempTable Storage Engine — https://dev.mysql.com/doc/refman/8.0/en/internal-temporary-tables.html#internal-temporary-tables-engines
- MySQL 8.0 Reference Manual: Server Status Variables (Created_tmp_disk_tables) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html

## Issues Found

1. **Misleading statement about ibtmp1 growth behavior**: The intro stated ibtmp1 "never grows between restarts," which reads as if the file doesn't grow during server operation. In reality, it can and does grow as queries create on-disk temp tables — it is simply removed and recreated at its initial size on restart. Fixed the wording to clarify this.

2. **Incorrect claim that BLOB/TEXT always use on-disk temporary tables**: This was true for the MEMORY engine (and MySQL 5.7), but MySQL 8.0+ defaults to the TempTable engine for internal temporary tables, which supports BLOB and TEXT columns in memory. Added clarification distinguishing MEMORY vs TempTable engine behavior.

3. **Missing context for tmp_table_size / max_heap_table_size tuning**: These settings only apply to the MEMORY engine. MySQL 8.0+ defaults to TempTable engine, where `temptable_max_ram` (default 1GB) controls the in-memory limit instead. Added a note explaining this distinction.

4. **Incorrect SQL query using information_schema.FILES with non-existent FILE_SIZE column**: The `information_schema.FILES` table does not have a `FILE_SIZE` column. Changed the query to use `information_schema.INNODB_TABLESPACES`, which has `FILE_SIZE` and is the correct table for this purpose in MySQL 8.0+.

## Review Notes
- The post covers both MySQL 5.7 and 8.0 features but could benefit from more explicit version callouts throughout. The current fixes add version context where critical.
- The `INNODB_SESSION_TEMP_TABLESPACES` example output is reasonable but simplified — actual output includes the full temp file path in the PATH column.
- The `innodb_temp_data_file_path` configuration syntax is correct and well-explained.
