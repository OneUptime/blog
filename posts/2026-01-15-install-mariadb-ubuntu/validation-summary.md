# Validation Summary: How to Install and Configure MariaDB on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MariaDB (server and client)
- Ubuntu (20.04, 22.04, 24.04)
- MySQL compatibility tooling (mysqldump, mysqlcheck, mysqldumpslow)
- InnoDB storage engine configuration
- MariaDB replication (master/slave)
- UFW firewall
- systemd service management

## Sources Consulted
- MariaDB Knowledge Base — Installing MariaDB Packages with APT: https://mariadb.com/kb/en/installing-mariadb-deb-files/
- MariaDB Knowledge Base — mariadb_repo_setup script: https://mariadb.com/kb/en/mariadb-package-repository-setup-and-usage/
- MariaDB Knowledge Base — mariadb-secure-installation: https://mariadb.com/kb/en/mysql_secure_installation/
- MariaDB Knowledge Base — Performance Schema Overview / system variables: https://mariadb.com/kb/en/performance-schema-overview/ and https://mariadb.com/kb/en/performance-schema-system-variables/
- MariaDB Knowledge Base — Server System Variables (query_cache_type, max_connections, innodb_*): https://mariadb.com/kb/en/server-system-variables/
- MariaDB Knowledge Base — Setting up Replication / CHANGE MASTER TO: https://mariadb.com/kb/en/setting-up-replication/
- MariaDB Knowledge Base — User account management (CREATE USER, GRANT): https://mariadb.com/kb/en/create-user/
- MariaDB Knowledge Base — Configuration file locations on Debian/Ubuntu (/etc/mysql/mariadb.conf.d/50-server.cnf)

## Issues Found
1. **Performance Schema enabled at runtime (incorrect).** The post used `SET GLOBAL performance_schema = ON;` to "enable performance schema." In both MariaDB and MySQL, `performance_schema` is a **read-only** system variable that can only be set at server startup; running `SET GLOBAL` against it fails with "Variable 'performance_schema' is a read only variable." Replaced the command with a note instructing the reader to enable it in the config file (`[mysqld] performance_schema = ON`) and restart MariaDB.

## Review Notes
- Installation commands (`apt install mariadb-server mariadb-client`), service checks, and `mariadb-secure-installation` are all correct and current for the Ubuntu releases listed.
- The `mariadb_repo_setup` one-liner and `--mariadb-server-version=11.2` flag are valid; readers may wish to use a current GA/LTS series (e.g., 11.4 LTS) since 11.2 is a past short-term release, but the syntax itself is accurate.
- MariaDB retains the classic replication syntax (`CHANGE MASTER TO`, `START SLAVE`, `SHOW SLAVE STATUS`, `SHOW MASTER STATUS`); unlike MySQL 8.0.22+, it has not deprecated these in favor of `REPLICA` terminology, so the examples are correct for MariaDB.
- The root-password reset flow is valid: `FLUSH PRIVILEGES;` must run before `ALTER USER` when started with `--skip-grant-tables`, which the post does correctly.
- `mysqldump`, `mysqlcheck`, and `mysqldumpslow` remain available on MariaDB (symlinked to the `mariadb-*` equivalents in recent versions), so the backup/repair examples work as written.
- Disabling the query cache (`query_cache_type = 0`) is reasonable performance guidance; the cache still exists in MariaDB but is off/discouraged for write-heavy workloads.
