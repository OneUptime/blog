# Validation Summary: How to Fix ERROR 1045 Access Denied for User in MySQL

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (8.0+)
- MySQL authentication plugins (caching_sha2_password, mysql_native_password)
- mysqld_safe
- systemctl / systemd

## Sources Consulted
- MySQL 8.0 Reference Manual: Access Denied Errors (https://dev.mysql.com/doc/refman/8.0/en/problems-connecting.html)
- MySQL 8.0 Reference Manual: How to Reset the Root Password (https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html)
- MySQL 8.0 Reference Manual: ALTER USER Statement (https://dev.mysql.com/doc/refman/8.0/en/alter-user.html)
- MySQL 8.0 Reference Manual: Authentication Plugins (https://dev.mysql.com/doc/refman/8.0/en/authentication-plugins.html)
- MySQL 8.0 Reference Manual: FLUSH PRIVILEGES (https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html)

## Issues Found
- **Missing mysqld_safe shutdown step in root password recovery (Step 5):** The original instructions started `mysqld_safe --skip-grant-tables` in the background, reset the password, then ran `sudo systemctl start mysql` without first stopping the `mysqld_safe` instance. This would fail because the MySQL data directory and socket file are still locked by the running `mysqld_safe` process. Added `sudo mysqladmin shutdown` before the `systemctl start mysql` command to properly stop the recovery instance first.

## Review Notes
- `FLUSH PRIVILEGES` is used after `CREATE USER`, `GRANT`, and `ALTER USER` statements throughout the post. These DDL statements automatically update the in-memory grant tables, so `FLUSH PRIVILEGES` is only strictly necessary after direct manipulation of the `mysql.user` table (e.g., INSERT/UPDATE). However, including it is not harmful and is a common defensive practice in tutorials — not a technical error.
- `mysql_native_password` is deprecated in MySQL 8.4 and removed in MySQL 9.0. The post targets MySQL 8.0 so this is currently correct, but may need updating in the future.
- `mysqld_safe` is deprecated in MySQL 8.0 in favor of systemd-based management, but it is still available and commonly referenced in official documentation for password recovery scenarios.
