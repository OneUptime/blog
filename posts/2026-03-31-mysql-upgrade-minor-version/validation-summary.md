# Validation Summary: How to Upgrade MySQL from One Minor Version to Another

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MySQL 8.0 (minor version upgrades within 8.0.x)
- mysqldump (logical backup)
- Percona XtraBackup (physical backup)
- mysqlcheck (table compatibility checking)
- systemd (service management)
- Package managers: apt, yum/dnf, Homebrew

## Sources Consulted
- MySQL 8.0 Reference Manual — Upgrading MySQL: https://dev.mysql.com/doc/refman/8.0/en/upgrading.html
- MySQL 8.0 Reference Manual — mysqldump: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — mysqlcheck: https://dev.mysql.com/doc/refman/8.0/en/mysqlcheck.html
- MySQL 8.0 Reference Manual — SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual — Server Status Variables (Threads_connected): https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- Percona XtraBackup Documentation: https://docs.percona.com/percona-xtrabackup/8.0/

## Issues Found
No technical issues found.

## Review Notes
- The automatic in-place upgrade feature was introduced in MySQL 8.0.16. The post targets MySQL 8.0 generally, which is appropriate since 8.0.16+ has been the norm for years. Users on very early 8.0 releases (before 8.0.16) would need to run `mysql_upgrade` manually, but this is an unlikely edge case at this point.
- `SHOW REPLICA STATUS` (used in the post) replaced the deprecated `SHOW SLAVE STATUS` starting in MySQL 8.0.22. This is the correct modern syntax for an 8.0-targeted post.
- The error log path `/var/log/mysql/error.log` is the Debian/Ubuntu default. On RHEL-based systems it is typically `/var/log/mysqld.log`. The post could note this difference, but it is not an error since the preceding commands already cover multiple platforms.
- The xtrabackup example passes the password on the command line (`--password=secret`), which triggers a security warning from MySQL. This is a common tutorial pattern and acceptable for illustrative purposes.
