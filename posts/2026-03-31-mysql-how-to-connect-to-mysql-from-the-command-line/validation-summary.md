# Validation Summary: How to Connect to MySQL from the Command Line

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL command-line client (`mysql`)
- `mysql_config_editor`
- MySQL SSL/TLS connections
- `~/.my.cnf` configuration file

## Sources Consulted
- MySQL 8.0 Reference Manual: mysql Client — https://dev.mysql.com/doc/refman/8.0/en/mysql.html
- MySQL 8.0 Reference Manual: Connecting to the MySQL Server Using Command Options — https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 Reference Manual: mysql_config_editor — https://dev.mysql.com/doc/refman/8.0/en/mysql-config-editor.html
- MySQL 5.6 Reference Manual: mysql_config_editor (introduced in 5.6.6) — https://dev.mysql.com/doc/refman/5.6/en/mysql-config-editor.html
- MySQL 8.0 Reference Manual: Using Encrypted Connections — https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html

## Issues Found

1. **Incorrect default for `-h` flag**: The post stated the default is `127.0.0.1` or socket. The actual default host is `localhost`, which on Unix/macOS uses the Unix socket file by default — this is meaningfully different from `127.0.0.1`, which forces a TCP/IP connection. Changed to: "default: `localhost`, which uses a Unix socket on Linux/macOS".

2. **Incorrect version for `mysql_config_editor`**: The post claimed `mysql_config_editor` requires "MySQL 8.0+". In fact, `mysql_config_editor` was introduced in MySQL 5.6.6 (released in 2013). Changed to "MySQL 5.6.6+".

## Review Notes
- The post correctly advises against including the password inline with `-p` (i.e., `-ppassword`), which is a good security practice.
- The SSL section uses `--ssl-ca`, `--ssl-cert`, and `--ssl-key` flags, which remain valid in MySQL 8.0+. In MySQL 8.0.4+, the `--ssl-mode` option was also introduced for finer control, but the flags shown are correct and functional.
- The troubleshooting section covers the most common connection errors accurately with correct error codes and SQLSTATE values.
