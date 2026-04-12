# Validation Summary: How to Troubleshoot MySQL Connection Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (5.7+ / 8.0+)
- ProxySQL
- Linux system administration (systemctl, iptables)
- SSL/TLS for MySQL connections

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables (wait_timeout, interactive_timeout, max_connections, max_allowed_packet) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual: Server Status Variables (Threads_connected, Ssl_cipher) — https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual: Too Many Connections — https://dev.mysql.com/doc/refman/8.0/en/too-many-connections.html
- MySQL 8.0 Reference Manual: KILL Statement — https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: How to Reset the Root Password — https://dev.mysql.com/doc/refman/8.0/en/resetting-permissions.html
- MySQL 8.0 Reference Manual: ALTER USER Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: information_schema.PROCESSLIST — https://dev.mysql.com/doc/refman/8.0/en/information-schema-processlist-table.html
- ProxySQL Documentation: stats_mysql_connection_pool — https://proxysql.com/documentation/stats-statistics/

## Issues Found
1. **Incorrect description of `wait_timeout` behavior in Error 2006 section**: The post stated that `wait_timeout` can expire "during a long query." This is incorrect — `wait_timeout` only applies to idle (non-active) connections waiting between queries. It does not affect connections that are actively executing a query. Changed "wait_timeout expiring during a long query" to "wait_timeout expiring during idle periods between queries."

## Review Notes
- The `FLUSH PRIVILEGES` after `GRANT` in the "Create User with Correct Host" section is technically unnecessary (MySQL automatically reloads grant tables after GRANT/CREATE USER statements), but it is harmless and is an extremely common practice, so it was left as-is.
- The `mysqld --skip-grant-tables` password reset procedure is correct. In MySQL 8.0.3+, `--skip-grant-tables` automatically disables remote connections (`skip_networking`), but for MySQL 5.7 users should also add `--skip-networking` for security. This is a security best practice rather than a correctness issue.
- The config file path `/etc/mysql/my.cnf` is Debian/Ubuntu-specific; on RHEL/CentOS systems it is typically `/etc/my.cnf`. The post doesn't claim to be distro-specific, so this is acceptable.
- All SQL syntax, error codes, system variable names, and status variable names are correct per MySQL 8.0 documentation.
- The `--ssl-mode=REQUIRED` flag is correct for MySQL 5.7.11+ client.
- ProxySQL admin port 6032 and `stats_mysql_connection_pool` table name are correct.
