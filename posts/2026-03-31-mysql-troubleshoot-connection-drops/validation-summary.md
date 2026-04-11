# Validation Summary: How to Troubleshoot MySQL Connection Drops

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (server configuration, status variables, system variables)
- Linux sysctl (TCP keepalive configuration)
- ProxySQL (connection pooling)
- Node.js mysql2 npm package (application-side connection handling)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL 8.0 Reference Manual — Server Status Variables: https://dev.mysql.com/doc/refman/8.0/en/server-status-variables.html
- MySQL 8.0 Reference Manual — Connection Interfaces: https://dev.mysql.com/doc/refman/8.0/en/connection-interfaces.html
- MariaDB Server System Variables (tcp_keepalive_time): https://mariadb.com/kb/en/server-system-variables/#tcp_keepalive_time
- Linux kernel documentation — TCP keepalive: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- ProxySQL documentation — Configuration File: https://proxysql.com/documentation/configuration-file/
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2

## Issues Found
1. **Invalid `tcp_keepalive_time` in `[mysqld]` config**: The post included a `[mysqld]` configuration snippet setting `tcp_keepalive_time = 120`. This is NOT a valid MySQL (Oracle) server variable. It exists in MariaDB (10.3.3+) but not in MySQL. Including an unknown variable in `mysqld.cnf` can prevent MySQL from starting or be silently ignored, giving false confidence. **Fix**: Removed the `[mysqld]` config block and clarified that TCP keepalive for MySQL is configured at the OS level via `sysctl`. Added a note about making settings persistent via `/etc/sysctl.conf`.

2. **Misleading comment in JavaScript code**: The comment said "Ping the connection before using it" but the actual options (`enableKeepAlive`, `keepAliveInitialDelay`) enable TCP-level keepalive on the socket, not application-level MySQL ping validation. These are fundamentally different mechanisms. **Fix**: Changed the comment to "Enable TCP keepalive to detect dead connections" which accurately describes what the options do.

## Review Notes
- The ProxySQL configuration snippet uses commas between key-value pairs. ProxySQL uses libconfig format where semicolons are the standard statement terminators, but the snippet is labeled as a "configuration snippet" and conveys the concept correctly.
- The Node.js code examples mix conventions from both the `mysql` (mysqljs) and `mysql2` packages — `enableKeepAlive` is a `mysql2` feature while the `pool.on('connection')` error handling pattern is more typical of the original `mysql` package. Both packages are commonly imported as `mysql`, so this is not incorrect but could confuse readers targeting a specific package.
- The description of `max_allowed_packet` says "Large query results or binary blobs can exceed max_allowed_packet." More precisely, `max_allowed_packet` limits the size of a single communication packet, not the total result set. This is a minor imprecision that doesn't affect the troubleshooting guidance.
- `log_error_verbosity = 3` is correct for MySQL 5.7 and 8.0. In MySQL 8.0.3+, the error log component system was introduced, and `log_error_verbosity` still works but the component-based approach (`log_error_services`) is the preferred method. This is worth noting for readers on newer MySQL versions.
