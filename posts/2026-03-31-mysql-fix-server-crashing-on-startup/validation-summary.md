# Validation Summary: How to Fix MySQL Server Crashing on Startup

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL Server (5.7 / 8.0)
- InnoDB storage engine
- systemd (systemctl, journalctl)
- AppArmor
- SELinux
- mysqld_safe
- mysql_upgrade

## Sources Consulted
- MySQL 8.0 Reference Manual — Server Error Log: https://dev.mysql.com/doc/refman/8.0/en/error-log.html
- MySQL 8.0 Reference Manual — InnoDB Recovery: https://dev.mysql.com/doc/refman/8.0/en/innodb-recovery.html
- MySQL 8.0 Reference Manual — Server Option and Variable Reference: https://dev.mysql.com/doc/refman/8.0/en/server-option-variable-reference.html
- MySQL 8.0 Reference Manual — mysqld --validate-config: https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_validate-config
- MySQL 8.0 Reference Manual — mysql_upgrade: https://dev.mysql.com/doc/refman/8.0/en/mysql-upgrade.html
- MySQL 8.0 Reference Manual — Option File Syntax: https://dev.mysql.com/doc/refman/8.0/en/option-files.html

## Issues Found
1. **Unnecessary `mysql -u root` in Corrupted System Tables section**: The original code block ran `mysql -u root` (which opens an interactive client session) between `mysqld_safe --skip-grant-tables &` and `mysql_upgrade -u root`. This would block execution since the interactive mysql client waits for user input. `mysql_upgrade` connects to the running server on its own and does not require a prior client connection. Removed the `mysql -u root` line.

## Review Notes
- **InnoDB redo log file location changed in MySQL 8.0.30+**: The advice to move `ib_logfile0`/`ib_logfile1` from `/var/lib/mysql/` is correct for MySQL 5.7 and 8.0 prior to 8.0.30. In MySQL 8.0.30+, redo log files were relocated to the `#innodb_redo/` subdirectory. The post does not specify a MySQL version, so this is not an error but a version-specific caveat.
- **`mysqld --validate-config` requires MySQL 8.0.16+**: This option was introduced in MySQL 8.0.16. The post also provides the `--help --verbose` fallback which works in older versions.
- **`mysql_upgrade` deprecated in MySQL 8.0.16+, removed in 8.4**: Starting with MySQL 8.0.16, the server performs upgrade steps automatically at startup, making `mysql_upgrade` unnecessary. It was fully removed in MySQL 8.4. The advice remains valid for MySQL 5.7 and earlier 8.0.x releases.
- **`mysqld_safe` removed in MySQL 8.4**: The `mysqld_safe` wrapper script was removed in MySQL 8.4 in favor of systemd-managed startup.
- **Service name varies by distribution**: The post uses `mysql` for systemctl/journalctl commands (correct for Debian/Ubuntu). On RHEL/CentOS, the service name is typically `mysqld`. The post already distinguishes distros for log file paths but not for service names.
