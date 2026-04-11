# Validation Summary: How to Troubleshoot MySQL Startup Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL Server (8.0+)
- InnoDB storage engine
- systemd service management
- Linux system utilities (ss, lsof, journalctl, df)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server Option and Variable Reference (https://dev.mysql.com/doc/refman/8.0/en/server-option-variable-reference.html)
- MySQL 8.0 Reference Manual: mysqld --validate-config (https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_validate-config)
- MySQL 8.0 Reference Manual: Forcing InnoDB Recovery (https://dev.mysql.com/doc/refman/8.0/en/forcing-innodb-recovery.html)
- MySQL 8.0 Reference Manual: my_print_defaults (https://dev.mysql.com/doc/refman/8.0/en/my-print-defaults.html)
- Linux errno reference for error 28 (ENOSPC) and error 98 (EADDRINUSE)

## Issues Found
No technical issues found.

## Review Notes
- `mysqld --validate-config` was introduced in MySQL 8.0.16. The post does not mention a minimum version, but this is a minor omission since MySQL 8.0 is the current GA release series.
- `my_print_defaults mysqld` is presented as an alternative to `--validate-config` with the phrase "Or check with:", but it serves a different purpose: it displays which options MySQL reads from config files rather than validating whether those options are recognized by the server. This framing is slightly imprecise but not technically incorrect, and the tool is genuinely useful for diagnosing configuration issues.
- The `killall mysqld` command between `systemctl stop` and `systemctl start` is a reasonable last resort when a graceful stop does not fully terminate the process, though users should be aware it could cause data loss if InnoDB has uncommitted transactions.
