# Validation Summary: How to Fix 'Server Has Gone Away' Errors in MySQL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- MySQL Server
- MySQL configuration files
- SQL status and variable inspection
- SQLAlchemy
- mysql2 for Node.js
- PHP PDO
- Linux service management
- mysqladmin

## Sources Consulted
- MySQL Reference Manual: MySQL server has gone away: https://dev.mysql.com/doc/refman/9.7/en/gone-away.html
- MySQL Reference Manual: Server system variables: https://dev.mysql.com/doc/refman/8.4/en/server-system-variables.html
- MySQL Reference Manual: SHOW STATUS statement and server status variables: https://dev.mysql.com/doc/en/show-status.html
- MySQL Reference Manual: mysqladmin: https://dev.mysql.com/doc/refman/9.5/en/mysqladmin.html
- MySQL Reference Manual: KILL statement: https://dev.mysql.com/doc/refman/9.7/en/kill.html
- SQLAlchemy documentation: Connection pooling and pool pre-ping: https://docs.sqlalchemy.org/en/21/core/pooling.html
- SQLAlchemy documentation: Engine configuration and pool recycling: https://docs.sqlalchemy.org/en/21/core/engines.html
- mysql2 documentation: Pool options and query execution: https://sidorares.github.io/node-mysql2/docs
- PHP manual: Class properties and dynamic property deprecation: https://www.php.net/manual/en/language.oop5.properties.php
- PHP manual: PDO constructor and options: https://www.php.net/manual/en/pdo.construct.php
- PHP manual: PDO errorInfo structure: https://www.php.net/manual/en/pdo.errorinfo.php
- PHP manual: MySQL PDO driver constants: https://www.php.net/manual/en/ref.pdo-mysql.php

## Issues Found
- The diagnostic SQL used `SHOW STATUS` for `Uptime`, `Aborted_connects`, and `Aborted_clients`. I changed these to `SHOW GLOBAL STATUS` because these are server-wide status checks and the MySQL documentation distinguishes global and session status.
- The PHP PDO sample assigned `$dsn`, `$user`, and `$pass` without declaring class properties. I added property declarations because dynamic properties are deprecated as of PHP 8.2.
- The PHP PDO sample retried any `HY000` error, which is too broad because `HY000` is a general SQLSTATE. I changed it to inspect the driver error code for MySQL 2006 and 2013, while keeping the existing message check for "gone away".
- The post said the `max_allowed_packet` default is often 4MB or 16MB. I updated this to note that the current MySQL server default is 64MB and that some client programs use lower defaults.
- The `max_allowed_packet` example increased the setting to 64MB, which is no longer an increase for current MySQL server defaults. I changed the example to 128MB.
- The long-running query section implied query execution time alone causes `net_read_timeout` or `net_write_timeout` failures. I clarified that these timeouts apply to data being read from or written to the connection.

## Review Notes
The examples are generally accurate for a troubleshooting guide. Retry examples should still be applied carefully for non-idempotent statements because blindly retrying writes can duplicate side effects if the client loses the connection after the server committed the work.
