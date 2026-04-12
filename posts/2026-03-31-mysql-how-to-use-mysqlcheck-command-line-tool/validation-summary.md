# Validation Summary: How to Use mysqlcheck Command-Line Tool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- mysqlcheck command-line utility
- MyISAM and InnoDB storage engines
- Cron scheduling
- Bash scripting

## Sources Consulted
- MySQL 8.0 Reference Manual: mysqlcheck — A Table Maintenance Program (https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html)
- MySQL 8.0 Reference Manual: CHECK TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/check-table.html)
- MySQL 8.0 Reference Manual: REPAIR TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/repair-table.html)
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html)
- MySQL 8.0 Reference Manual: ANALYZE TABLE Statement (https://dev.mysql.com/doc/refman/8.0/en/analyze-table.html)
- Bash Reference Manual: Redirections (https://www.gnu.org/software/bash/manual/html_node/Redirections.html)

## Issues Found

1. **Verbose Mode sample output did not match the command**: The command used `--analyze` but the sample output showed `"Table does not support optimize, doing recreate + analyze instead"`, which is output produced by `--optimize` on InnoDB tables, not by `--analyze`. Changed the command from `--analyze` to `--optimize` and updated the output to accurately reflect what `mysqlcheck --optimize -v` produces for InnoDB tables.

2. **Shell redirect order was incorrect in the maintenance script**: The script had `2>&1 >> "$LOG"`, which redirects stderr to the current stdout (terminal) first, then redirects stdout to the log file — meaning stderr is lost (goes to terminal/nowhere in cron). Fixed to `>> "$LOG" 2>&1` so stdout is redirected to the file first, then stderr is duplicated to the same destination, capturing both streams in the log.

## Review Notes
- The post correctly notes that REPAIR TABLE only works with MyISAM/ARCHIVE tables. It also works with CSV tables, but the omission is minor and doesn't constitute an error.
- The `--check-upgrade` option and `CHECK TABLE ... FOR UPGRADE` are still valid in MySQL 8.0, though MySQL 8.0.16+ performs automatic upgrades at server startup, making this less commonly needed.
- The defaults file example includes a plaintext password, which is acknowledged implicitly by the section's purpose (avoiding passwords on the command line). Users should ensure the file has restrictive permissions (e.g., `chmod 600`).
