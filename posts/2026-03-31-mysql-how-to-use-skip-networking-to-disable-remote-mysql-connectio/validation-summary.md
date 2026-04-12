# Validation Summary: How to Use skip-networking to Disable Remote MySQL Connections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (server configuration, skip-networking option)
- Linux systemd (service management)
- Unix domain sockets
- Windows named pipes
- Python (mysql-connector-python)
- PHP (PDO MySQL driver)

## Sources Consulted
- MySQL 8.0 Reference Manual: Server System Variables — skip_networking (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_skip_networking)
- MySQL 8.0 Reference Manual: Server Command Options — skip-networking (https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_skip-networking)
- MySQL 8.0 Reference Manual: Connecting to the MySQL Server Using Command Options (https://dev.mysql.com/doc/refman/8.0/en/connecting.html)
- MySQL 8.0 Reference Manual: Named Pipes on Windows (https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_named-pipe)
- mysql-connector-python documentation: connect() parameters (https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html)
- PHP PDO MySQL DSN documentation (https://www.php.net/manual/en/ref.pdo-mysql.connection.php)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly explains the difference between `--host=localhost` (uses Unix socket) and `--host=127.0.0.1` (uses TCP), which is a common source of confusion.
- The comparison table between `skip-networking` and `bind-address = 127.0.0.1` is accurate and helpful for readers choosing between the two options.
- The Windows `enable-named-pipe` option is a legacy synonym for `named-pipe`; both are valid, though `named-pipe` is the canonical form in MySQL 8.0+ documentation. Not a correctness issue.
- The service name `mysql` in `systemctl restart mysql` is specific to Debian/Ubuntu. On RHEL/CentOS the service is typically named `mysqld`. This is a minor platform note, not an error.
