# Validation Summary: How to Set the Root Password After Installing MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7, 8.0)
- mysql_secure_installation
- mysqladmin
- mysqld_safe
- systemctl

## Sources Consulted
- MySQL 8.0 Reference Manual — ALTER USER: https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual — Privilege System Grant Tables: https://dev.mysql.com/doc/refman/8.0/en/privilege-changes.html
- MySQL 8.0 Reference Manual — mysqladmin: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html
- MySQL 8.0 Reference Manual — Resetting the Root Password: https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html
- MySQL 8.0 Reference Manual — Password Validation Component: https://dev.mysql.com/doc/refman/8.0/en/validate-password.html
- MySQL 8.0 Reference Manual — mysql_secure_installation: https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html

## Issues Found

1. **Unnecessary FLUSH PRIVILEGES after ALTER USER (Method 3)**: The post included `FLUSH PRIVILEGES` after `ALTER USER` and stated it was needed to make the change take effect immediately. This is incorrect — account management statements like `ALTER USER`, `GRANT`, `REVOKE`, and `SET PASSWORD` automatically reload the grant tables into memory. `FLUSH PRIVILEGES` is only required when directly modifying the `mysql.user` table with DML statements (INSERT, UPDATE, DELETE). Removed `FLUSH PRIVILEGES` and corrected the explanation.

2. **Unnecessary second FLUSH PRIVILEGES in Recovery Mode**: The recovery mode section had two `FLUSH PRIVILEGES` statements — one before and one after `ALTER USER`. The first one is correct and necessary (it re-enables the privilege system after starting with `--skip-grant-tables`). The second one after `ALTER USER` is unnecessary for the same reason as issue #1. Removed the redundant second `FLUSH PRIVILEGES`.

## Review Notes
- The `mysqladmin password` subcommand used in Method 2 is deprecated since MySQL 5.7.6 and has been removed in MySQL 8.4. The commands shown still work in MySQL 5.7 and 8.0, but readers using MySQL 8.4+ should use `ALTER USER` instead.
- The `validate_password.policy` and `validate_password.length` variable names (with dots) are correct for MySQL 8.0.4+ where the validate_password component replaced the older validate_password plugin. Users on older versions would use underscores (`validate_password_policy`).
- The error log paths (`/var/log/mysql/error.log` and `/var/log/mysqld.log`) are the common defaults for Debian/Ubuntu and RHEL/CentOS respectively. Other distributions or custom installations may use different paths.
