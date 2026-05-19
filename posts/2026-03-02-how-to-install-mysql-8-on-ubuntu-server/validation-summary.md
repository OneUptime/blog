# Validation Summary: How to Install MySQL 8 on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- MySQL 8.0
- Ubuntu Server (22.04+)
- APT package manager / dpkg
- systemd (mysql service management)
- UFW (firewall)
- InnoDB storage engine
- MySQL authentication plugins (caching_sha2_password, auth_socket, mysql_native_password)
- Binary logging / replication

## Sources Consulted
- MySQL 8.0 Reference Manual — Installing MySQL on Linux Using the MySQL APT Repository: https://dev.mysql.com/doc/mysql-apt-repo-quick-guide/en/
- MySQL 8.0 Reference Manual — Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/pluggable-authentication.html
- MySQL 8.0 Reference Manual — Caching SHA-2 Pluggable Authentication: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 Reference Manual — Server System Variables (binlog_expire_logs_seconds, expire_logs_days): https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html#sysvar_binlog_expire_logs_seconds
- MySQL 8.0 Reference Manual — mysql_secure_installation: https://dev.mysql.com/doc/refman/8.0/en/mysql-secure-installation.html
- MySQL 8.0 Reference Manual — innodb_buffer_pool_size / innodb_buffer_pool_instances: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual — SQL mode: https://dev.mysql.com/doc/refman/8.0/en/sql-mode.html
- Ubuntu package repository (mysql-server on 22.04/24.04): https://packages.ubuntu.com/

## Issues Found
1. **Deprecated `expire_logs_days` option in MySQL config example.** The post's `mysqld.cnf` example included `expire_logs_days = 7`. This system variable has been deprecated since MySQL 8.0.1 in favor of `binlog_expire_logs_seconds` and emits a deprecation warning at startup. Replaced with `binlog_expire_logs_seconds = 604800` (7 days expressed in seconds), with a brief comment noting it replaces the deprecated option. This is the value Oracle recommends going forward; the deprecated option is slated for removal in a future release.

## Review Notes
- The `mysql-apt-config_0.8.30-1_all.deb` URL is a real, published version of the MySQL APT config package; readers are correctly directed to https://dev.mysql.com/downloads/repo/apt/ for the latest version.
- `FLUSH PRIVILEGES;` after `CREATE USER` / `ALTER USER` / `GRANT` is not strictly required in modern MySQL (account-management statements take effect immediately), but it is harmless and is still commonly shown in introductory guides. Left as-is.
- The note about `caching_sha2_password` vs `mysql_native_password` is correct for MySQL 8.0. Be aware that `mysql_native_password` is disabled by default starting in MySQL 8.4 and was removed in MySQL 9.0 — this advice will need a caveat once the post is targeted at newer MySQL releases.
- `auth_socket` (MySQL) vs `unix_socket` (MariaDB) naming distinction is correct.
- `ss -tlnp | grep mysql` may require `sudo` to see the PID/process name column; without sudo it will still match the listening socket but the program column shows as `-`. Not an error in the guide.
- `SHOW ENGINE INNODB STATUS\G` works as expected when passed via `mysql -e` — the `\G` terminator is honored by the client.
- `bind-address = 127.0.0.1` is the correct Ubuntu default for MySQL 8 on 22.04+.
- Buffer-pool guidance (70-80% RAM dedicated, 25-30% shared; one instance under 8 GB) matches official tuning recommendations.
