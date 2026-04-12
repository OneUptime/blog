# Validation Summary: How to Restrict Network Access to MySQL with bind-address

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (5.7, 8.0+)
- MySQL X Protocol (mysqlx_bind_address)
- Linux system administration (systemctl, ss, netstat)
- Linux firewall tools (ufw, iptables)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — bind-address (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address)
- MySQL 8.0 Reference Manual: Server System Variables — mysqlx_bind_address (https://dev.mysql.com/doc/refman/8.0/en/x-plugin-options-system-variables.html#sysvar_mysqlx_bind_address)
- MySQL 8.0.13 Release Notes for multiple bind-address support (https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html)

## Issues Found
1. **Default bind-address was incorrectly stated as `0.0.0.0`**: The post claimed MySQL defaults to `0.0.0.0`, but the actual compiled-in default is `*`, which accepts connections on all IPv4 and IPv6 interfaces. `0.0.0.0` would only cover IPv4. Fixed the introductory text and the example `SHOW VARIABLES` output to show `*` instead of `0.0.0.0`.

2. **`*` wildcard incorrectly marked as MySQL 8.0.13+**: The table listed `*` as available from MySQL 8.0.13+, but `*` has been the default bind-address value for much longer (predating 8.0). What was introduced in 8.0.13 is the comma-separated multiple address support, which is correctly documented in its own section. Fixed the table to label `*` as "(default)" instead of "(MySQL 8.0.13+)".

## Review Notes
- Some Linux distributions (e.g., Ubuntu/Debian) ship MySQL with `bind-address = 127.0.0.1` in their default config files for security, which differs from MySQL's compiled-in default of `*`. The post could mention this distinction in the future, but the current text is correct after the fix.
- All SQL commands, shell commands (ss, netstat, ufw, iptables), configuration syntax, and troubleshooting steps are accurate.
- The comma-separated multiple address feature is correctly attributed to MySQL 8.0.13+.
