# Validation Summary: How to Use the InnoDB System Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7 and 8.0+)
- InnoDB storage engine
- InnoDB system tablespace (`ibdata1`)
- `innodb_data_file_path` configuration
- `information_schema.FILES` system table
- mysqldump backup/restore

## Sources Consulted
- MySQL 8.0 Reference Manual: The System Tablespace — https://dev.mysql.com/doc/refman/8.0/en/innodb-system-tablespace.html
- MySQL 8.0 Reference Manual: Doublewrite Buffer — https://dev.mysql.com/doc/refman/8.0/en/innodb-doublewrite-buffer.html
- MySQL 8.0 Reference Manual: Redo Log — https://dev.mysql.com/doc/refman/8.0/en/innodb-redo-log.html
- MySQL 8.0 Reference Manual: InnoDB Tablespace Metadata from INFORMATION_SCHEMA.FILES — https://dev.mysql.com/doc/refman/8.0/en/innodb-information-schema-files-table.html
- MySQL 8.0 Reference Manual: InnoDB Startup Configuration — https://dev.mysql.com/doc/refman/8.0/en/innodb-init-startup-configuration.html
- MySQL 8.0 Reference Manual: InnoDB Data-at-Rest Encryption — https://dev.mysql.com/doc/refman/8.0/en/innodb-data-encryption.html
- MySQL 8.0 Reference Manual: Transactional Storage of Dictionary Data — https://dev.mysql.com/doc/refman/8.0/en/data-dictionary-transactional-storage.html

## Issues Found

1. **Data dictionary location outdated for MySQL 8.0**: The post stated the system tablespace stores "The InnoDB data dictionary (table metadata)" without version qualification. In MySQL 8.0, the data dictionary was moved to the `mysql.ibd` tablespace. Fixed by adding a version note: stored in system tablespace in MySQL 5.7 and earlier, moved to `mysql.ibd` in 8.0.

2. **Doublewrite buffer location outdated for MySQL 8.0.20+**: The post listed "The doublewrite buffer" as a system tablespace component without qualification. In MySQL 8.0.20+, the doublewrite buffer was moved to separate `.dblwr` files. Fixed by adding a version note.

3. **Undo log bullet could be more precise**: Updated the undo log bullet to note that separate undo tablespaces are required in MySQL 8.0 (minimum `innodb_undo_tablespaces` value is 2).

4. **Shrink procedure: redo log file path outdated for MySQL 8.0.30+**: The procedure only removed `ib_logfile*`, which is the redo log location for MySQL versions before 8.0.30. In MySQL 8.0.30+, redo logs moved to the `#innodb_redo/` subdirectory. Fixed by adding both paths with version comments.

## Review Notes
- The SQL queries using `information_schema.FILES` with `TABLESPACE_NAME = 'innodb_system'` are correct.
- The `innodb_data_file_path` syntax and examples are accurate.
- The comparison table correctly states that the InnoDB system tablespace does not support encryption — official docs confirm encryption is not supported for the InnoDB system tablespace (`ibdata1`).
- The `ALTER TABLE ... ENGINE=InnoDB` approach for moving tables out of the system tablespace is correct.
- The shrink procedure's dump-and-restore approach is the correct method since the system tablespace cannot be shrunk in place.
- For the mysqldump command, `--routines` and `--events` flags are included by default as of MySQL 8.0.30, so the simplified command is acceptable.
