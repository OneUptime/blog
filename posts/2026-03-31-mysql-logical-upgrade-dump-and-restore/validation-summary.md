# Validation Summary: How to Perform a Logical MySQL Upgrade Using Dump and Restore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.6 through 8.4)
- mysqldump
- MySQL Shell (mysqlsh) dumpInstance / loadDump utilities
- mysqlcheck
- Ubuntu/Debian package management (apt-get)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — Server System Variables (sql_mode): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_sql_mode
- MySQL 8.0 Reference Manual — SQL Mode defaults: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- MySQL 8.0 Reference Manual — Reserved Words: https://dev.mysql.com/doc/refman/8.0/en/keywords.html
- MySQL Shell 8.0 Reference — util.dumpInstance: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-dump-instance-schema.html
- MySQL Shell 8.0 Reference — util.loadDump: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-shell-utilities-load-dump.html
- MySQL 8.0 Reference Manual — foreign_key_checks variable: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_foreign_key_checks

## Issues Found
- **Missing `NO_ZERO_IN_DATE` in Step 7 sql_mode restoration**: The `SET GLOBAL sql_mode` statement was missing `NO_ZERO_IN_DATE`, which is part of the default MySQL 8.0+ sql_mode. The default is `ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION`. Without `NO_ZERO_IN_DATE`, the server would silently accept values like `2026-00-15` (valid year/day but zero month), which defeats the purpose of restoring strict settings. Fixed by adding `NO_ZERO_IN_DATE` to the sql_mode string.

## Review Notes
- The `--triggers` flag on the mysqldump command is redundant since triggers are included by default (since MySQL 5.1.21), but specifying it explicitly is harmless and improves clarity.
- The `--consistent=true` option on the mysqlsh dumpInstance command is also redundant (defaults to true), but again is fine for documentation purposes.
- The exact apt package name `mysql-server-8.4` depends on which APT repository is configured; the official MySQL APT repository uses `mysql-server` with version selection via `dpkg-reconfigure`. The concept is correct but readers may need to adjust the package name for their repository setup.
- The `sed -i` command for fixing zero dates only handles datetime zero values (`'0000-00-00 00:00:00'`), not date-only zero values (`'0000-00-00'`). This is acceptable as a quick fix example but readers should be aware they may need additional patterns.
