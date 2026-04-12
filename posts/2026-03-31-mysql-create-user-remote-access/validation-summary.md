# Validation Summary: How to Create a User for Remote Access in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- MySQL command-line client
- UFW (Ubuntu firewall)
- firewalld (RHEL/CentOS firewall)
- systemd (service management)
- ss (socket statistics)

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE USER Statement — https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL 8.0 Reference Manual: GRANT Statement — https://dev.mysql.com/doc/refman/8.0/en/grant.html
- MySQL 8.0 Reference Manual: Server System Variables (bind-address) — https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html#sysvar_bind_address
- MySQL 8.0 Reference Manual: Specifying Account Names — https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL 8.0 Reference Manual: Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/pluggable-authentication.html
- UFW manual page — https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- firewalld Rich Language documentation — https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- RFC 5737 (IPv4 Address Blocks Reserved for Documentation) — https://datatracker.ietf.org/doc/html/rfc5737

## Issues Found
No technical issues found.

## Review Notes
- The post correctly omits `FLUSH PRIVILEGES` after `CREATE USER` and `GRANT` statements, which is appropriate for MySQL 8.0+ (these statements automatically reload the grant tables).
- The `mysql_native_password` plugin is deprecated in MySQL 8.4. The post's framing of it as "for older client compatibility" is accurate but readers targeting MySQL 8.4+ should be aware of this deprecation.
- Example IP addresses use the RFC 5737 documentation range (203.0.113.x), which is good practice for tutorials.
- The config file path `/etc/mysql/mysql.conf.d/mysqld.cnf` is specific to Ubuntu/Debian; RHEL/CentOS users would edit `/etc/my.cnf` or `/etc/my.cnf.d/mysql-server.cnf`. This is not an error but a platform-specific detail readers on other distributions should be aware of.
