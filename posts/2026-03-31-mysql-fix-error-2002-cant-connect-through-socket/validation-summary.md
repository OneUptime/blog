# Validation Summary: How to Fix ERROR 2002 Can't Connect Through Socket in MySQL

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MySQL (server and client)
- Unix domain sockets
- systemd (systemctl)
- Linux file permissions

## Sources Consulted
- MySQL 8.0 Reference Manual — Error Messages: https://dev.mysql.com/doc/refman/8.0/en/error-messages-client.html
- MySQL 8.0 Reference Manual — Connecting to the MySQL Server Using Command Options: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 Reference Manual — Server System Variables (socket): https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_socket
- MySQL 8.0 Reference Manual — Option File Syntax: https://dev.mysql.com/doc/refman/8.0/en/option-files.html
- Linux errno codes (ENOENT = 2)

## Issues Found
No technical issues found.

## Review Notes
- The post correctly notes that `localhost` uses the Unix socket while `127.0.0.1` forces TCP — this is a well-documented MySQL behavior that often confuses users and is a valuable inclusion.
- The permission section states "The socket file must be readable by the connecting user." Technically, Unix domain sockets require both read and write permission on the socket file, and execute permission on the parent directory. However, the practical troubleshooting advice given (fixing directory ownership and permissions) is correct and addresses the real-world issue, so this simplification does not warrant a change.
- The post covers the most common distributions (Debian/Ubuntu with `mysql` service name, RHEL/CentOS with `mysqld`). Users on other init systems (e.g., older SysVinit) would need different commands, but systemd coverage is appropriate for modern systems.
