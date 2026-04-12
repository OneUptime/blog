# Validation Summary: How to Use mysql Command-Line Client

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL command-line client (`mysql`)
- `mysql_config_editor` for credential storage
- MySQL SSL/TLS connections

## Sources Consulted
- MySQL 8.0 Reference Manual: mysql Client Commands (https://dev.mysql.com/doc/refman/8.0/en/mysql-commands.html)
- MySQL 8.0 Reference Manual: mysql Command Options (https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html)
- MySQL 8.0 Reference Manual: mysql_config_editor (https://dev.mysql.com/doc/refman/8.0/en/mysql-config-editor.html)
- MySQL 8.0 Reference Manual: Using Encrypted Connections (https://dev.mysql.com/doc/refman/8.0/en/using-encrypted-connections.html)

## Issues Found

1. **Incorrect shortcut for `rehash` command**: The post listed `\r` as the shortcut for `rehash`. The correct shortcut is `\#`. In the MySQL client, `\r` maps to the `connect` command (reconnect to server), not `rehash`. Fixed `\r or rehash` to `\# or rehash`.

2. **Mixed bash and SQL in SSL code block**: The "Connecting Over SSL" section had a single bash-tagged code block that included both a shell command and a SQL statement (`SHOW SESSION STATUS LIKE 'Ssl_cipher';`) with a SQL-style comment (`--`). Split into separate bash and sql code blocks with a bridging sentence for clarity.

## Review Notes
- The `--ssl-ca`, `--ssl-cert`, and `--ssl-key` options are valid but MySQL 8.0 also supports the `--ssl-mode` option for controlling the level of SSL enforcement. This could be a useful addition in a future update.
- The note about `-pMyPassword123` (no space) being insecure is good practice guidance — the password will be visible in process listings and shell history.
- All other commands, flags, SQL statements, and client shortcuts were verified as correct.
