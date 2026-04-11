# Validation Summary: How to Use mysqlcheck for Table Maintenance in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (mysqlcheck command-line utility)
- MyISAM and InnoDB storage engines
- Cron (for scheduling maintenance)

## Sources Consulted
- MySQL 8.4 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.4/en/mysqlcheck.html
- MySQL 8.4 Reference Manual — CHECK TABLE: https://dev.mysql.com/doc/refman/8.4/en/check-table.html
- MySQL 8.4 Reference Manual — ANALYZE TABLE: https://dev.mysql.com/doc/refman/8.4/en/analyze-table.html
- MySQL 8.4 Reference Manual — OPTIMIZE TABLE: https://dev.mysql.com/doc/refman/8.4/en/optimize-table.html
- MySQL 8.4 Reference Manual — REPAIR TABLE: https://dev.mysql.com/doc/refman/8.4/en/repair-table.html
- MySQL 8.0 Release Notes (8.0.16) — deprecation of --check-upgrade: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html
- MySQL 8.4 Changes — removal of --check-upgrade: https://dev.mysql.com/doc/refman/8.4/en/mysql-nutshell.html

## Issues Found
1. **`--check-upgrade` option deprecated/removed**: The post recommended `mysqlcheck --check-upgrade --all-databases` without noting that this option was deprecated in MySQL 8.0.16 (April 2019) and removed entirely in MySQL 8.4 (April 2024). For a 2026 blog post, this is misleading since current MySQL versions no longer support it. Fixed the "Checking Tables After an Upgrade" section to clarify that `--check-upgrade` only applies to older MySQL versions and that the server now handles upgrade checks automatically. Also updated the Summary section to include the same caveat.

## Review Notes
- All other commands (`--analyze`, `--optimize`, `--repair`, `--auto-repair`, `--extended`, `--all-databases`) are correct and current.
- The claim that OPTIMIZE TABLE on InnoDB performs `ALTER TABLE ... FORCE` is accurate per MySQL docs.
- The claim that REPAIR TABLE does not work for InnoDB is accurate — mysqlcheck will return a note that the storage engine doesn't support repair.
- The cron example correctly uses `-p"$MYSQL_PASSWORD"` (no space between -p and the password), which is the proper syntax for non-interactive password passing.
- The corrupted table output example uses a MyISAM-style file path (`'./mydb/orders'`), which is valid but only applies to MyISAM tables. InnoDB corruption messages differ. This is not an error but could be clarified in a future update.
