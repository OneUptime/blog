# Validation Summary: How to Restore a Single Table from a MySQL Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (mysqldump, mysql client, InnoDB tablespace import)
- Percona XtraBackup
- Bash (sed, grep)
- Python 3

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: ALTER TABLE ... IMPORT TABLESPACE — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- Percona XtraBackup Documentation: Exporting Individual Tables — https://docs.percona.com/percona-xtrabackup/8.0/export-import-tables.html
- mysqldump output format (verified structure: Table structure comment, DROP TABLE, CREATE TABLE, LOCK TABLES, INSERT INTO, UNLOCK TABLES)

## Issues Found

1. **Duplicate INSERT statements in sed+grep extraction**: The `sed` range `/^DROP TABLE IF EXISTS \`orders\`/,/^UNLOCK TABLES/p` captured everything from DROP TABLE through UNLOCK TABLES, which already includes the INSERT statements. The subsequent `grep` for INSERT statements would then append them a second time, producing a corrupt restore file. Fixed by changing the sed range to stop at `/^LOCK TABLES/` so it captures only the DDL and LOCK TABLES line, leaving the INSERT statements to be added solely by the `grep` pass.

2. **Inaccurate description of extraction method**: The text said "two separate `grep` passes" but the first pass actually uses `sed`. Changed to "`sed` and `grep` separately".

3. **Unused Python import**: The Python script included `import sys` which was never used. Removed the unused import.

## Review Notes
- The physical backup section (XtraBackup) does not mention setting file ownership (`chown mysql:mysql`) after copying `.ibd` and `.cfg` files, which is typically required before `IMPORT TABLESPACE` succeeds. This is a common omission in tutorials but worth noting for production use.
- The first `sed` extraction approach (using "Table structure for table" comments as delimiters) will include trailing dump footer content if the target table is the last table in the dump. This is a known limitation of the approach and is acceptable for a tutorial.
- The Python script's `table_name not in line` check could produce false negatives if another table name contains the target name as a substring (e.g., searching for "orders" would also match "orders_archive"). This is a minor edge case for a tutorial script.
