# Validation Summary: MySQL Backup and Restore Cheat Sheet

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- MySQL (mysqldump, mysqlpump, mysqlbinlog, mysql client)
- MySQL Shell (mysqlsh) dump and load utilities
- Bash scripting (cron automation)
- gzip compression

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqldump — https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: mysqlpump — https://dev.mysql.com/doc/refman/8.0/en/mysqlpump.html
- MySQL 8.4 Reference Manual: mysqldump --source-data — https://dev.mysql.com/doc/refman/8.4/en/mysqldump.html
- MySQL 8.0 Reference Manual: mysql client --force option — https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL Shell 8.0 Reference: dump and load utilities — https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html
- MySQL 8.0 Reference Manual: mysqlbinlog — https://dev.mysql.com/doc/refman/8.0/en/mysqlbinlog.html

## Issues Found

1. **"Dry run" comment on `mysql --force` was incorrect and dangerous.** The `--force` flag does not perform a dry run — it executes all SQL statements and simply continues past errors instead of aborting. The original comment `# Check dump file is parseable (dry run)` was misleading and could cause a reader to accidentally restore a backup thinking they were only validating it. Changed to `# Restore with error tolerance (continues past errors, not a dry run)`.

2. **`--master-data` replaced with `--source-data`.** The `--master-data` option was deprecated in MySQL 8.0.26 and removed in MySQL 8.4.0 as part of MySQL's inclusive terminology changes. Replaced with `--source-data=2` and updated the comment from "CHANGE MASTER TO" to "CHANGE REPLICATION SOURCE TO" to reflect the current syntax.

3. **mysqlpump version range corrected.** The section header said "MySQL 5.7+" implying availability in all versions from 5.7 onward. However, mysqlpump was deprecated in MySQL 8.0.34 and removed in MySQL 8.4.0. Changed to "MySQL 5.7 – 8.0" to accurately reflect the version range where this tool is available.

4. **`--compress-output=ZLIB` casing corrected.** The MySQL documentation uses lowercase `zlib` for the compression algorithm value. Changed `ZLIB` to `zlib` to match the documented form.

## Review Notes
- The "Verify Backup Integrity" section could benefit from a true validation approach (e.g., restoring to a test database or using `mysql --skip-database` parsing), since the current `--force` approach still executes the SQL. However, there is no built-in dry-run mode in the mysql client, so the corrected comment is accurate for what the command actually does.
- The MySQL Shell section title says "Enterprise-Grade" but the dump/load utilities are available in the community edition of MySQL Shell, not just the enterprise edition. This is a minor framing issue, not a technical error.
- The `mysqlpump` section commands are correct for MySQL 5.7 – 8.0.x, but readers on MySQL 8.4+ should use MySQL Shell dump utilities or mysqldump as alternatives.
