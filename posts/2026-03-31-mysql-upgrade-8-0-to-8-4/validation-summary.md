# Validation Summary: How to Upgrade from MySQL 8.0 to MySQL 8.4

## Status
validated

## Post Type
Tutorial / Upgrade Guide

## Technologies Covered
- MySQL 8.0 and 8.4 LTS
- mysqldump
- MySQL Shell (`mysqlsh`) and `util.checkForServerUpgrade()`
- mysqlcheck
- caching_sha2_password / mysql_native_password authentication plugins
- APT and YUM package managers for Ubuntu and RHEL

## Sources Consulted
- MySQL 8.4 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.4/en/
- MySQL 8.4 Reference Manual - Upgrading MySQL: https://dev.mysql.com/doc/refman/8.4/en/upgrading.html
- MySQL 8.4 Reference Manual - mysql_upgrade removal: https://dev.mysql.com/doc/refman/8.4/en/mysql-upgrade.html
- MySQL 8.4 Reference Manual - mysql_native_password plugin: https://dev.mysql.com/doc/refman/8.4/en/native-pluggable-authentication.html
- MySQL Shell Reference - checkForServerUpgrade(): https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-shell-utilities-upgrade.html

## Issues Found

1. **`mysql_upgrade` command recommended but removed in MySQL 8.4** (line 98): The post recommended running `mysql_upgrade -u root -p` as a post-upgrade step. However, `mysql_upgrade` was deprecated in MySQL 8.0.16 and completely removed in MySQL 8.4. The server now handles all upgrade tasks automatically on first startup. Replaced the code block with a note explaining this.

2. **RHEL section included `grep 'temporary password'`** (line 79): The RHEL upgrade instructions included `sudo grep 'temporary password' /var/log/mysqld.log`, which is only relevant for fresh MySQL installations where a temporary root password is generated. During an upgrade, the existing root password is preserved and no temporary password is created. Removed the misleading line.

## Review Notes
- The `mysqlsh` CLI integration command uses camelCase (`checkForServerUpgrade`) which is accepted by MySQL Shell, though the documentation also shows the kebab-case form (`check-for-server-upgrade`). Both work, so no change was made.
- The Ubuntu package name `mysql-server-8.4` assumes Oracle's MySQL APT repository is configured. The exact package name may vary depending on the repository setup. This is acceptable for a guide but readers should verify against their configured repository.
- The `expire_logs_days` variable mentioned in the "Checking Removed Variables" section was indeed removed in MySQL 8.4 (deprecated since 8.0 in favor of `binlog_expire_logs_seconds`), so the example is accurate.
