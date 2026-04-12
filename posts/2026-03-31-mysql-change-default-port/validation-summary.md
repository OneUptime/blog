# Validation Summary: How to Change the MySQL Default Port from 3306

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- MySQL Server (configuration, administration)
- Linux systemd (service management)
- UFW (Ubuntu/Debian firewall)
- firewalld (RHEL-based firewall)
- SELinux (security context management)
- PHP PDO (MySQL connection)
- Python mysql-connector (MySQL connection)
- Node.js mysql2 (MySQL connection)
- Java JDBC (MySQL connection)

## Sources Consulted
- MySQL 8.0 Reference Manual — Server System Variables (`port`): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_port
- MySQL 8.0 Reference Manual — Connecting to the MySQL Server Using Command Options: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 Reference Manual — Option Files: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- UFW man page and Ubuntu documentation
- firewalld documentation: https://firewalld.org/documentation/
- SELinux `semanage-port` man page
- PHP PDO_MYSQL DSN documentation: https://www.php.net/manual/en/ref.pdo-mysql.connection.php
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- MySQL Connector/J JDBC URL documentation: https://dev.mysql.com/doc/connector-j/en/

## Issues Found
No technical issues found.

## Review Notes
- The `SHOW VARIABLES LIKE 'datadir'` command in Step 1 shows the MySQL data directory, not the configuration file location. While not incorrect, it is tangential to the stated goal of finding the configuration file. The subsequent `mysql --help | grep -A1 "Default options"` command is the one that actually reveals config file paths.
- In Step 4, `mysql -u root -p --port=3307` without `--host=127.0.0.1` may connect via Unix socket on Linux (where the `--port` flag is effectively ignored). The verification still works correctly because `SHOW VARIABLES LIKE 'port'` reports the server's configured port regardless of connection method. The later Step 6 correctly uses `--host=127.0.0.1` to force a TCP connection.
- The `ss` output showing backlog 151 is consistent with MySQL 8.0+ defaults. If targeting MySQL 5.7 or earlier, this value would differ, but the post does not claim a specific version.
- The SELinux expected output listing ports 1186, 3306, 3307, 33060, 33062 is consistent with MySQL 8.0+ SELinux policy (33060 for X Protocol, 33062 for admin connections).
