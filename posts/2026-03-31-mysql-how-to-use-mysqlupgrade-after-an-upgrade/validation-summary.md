# Validation Summary: How to Use mysql_upgrade After an Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.6, 5.7, 8.0)
- mysql_upgrade command-line utility
- mysqlcheck
- Docker (MySQL containers)

## Sources Consulted
- MySQL 5.7 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/5.7/en/mysql-upgrade.html
- MySQL 8.0 Reference Manual: mysql_upgrade — https://dev.mysql.com/doc/refman/8.0/en/mysql-upgrade.html
- MySQL 8.0 Reference Manual: Server Options (--upgrade) — https://dev.mysql.com/doc/refman/8.0/en/server-options.html
- MySQL Server Blog: MySQL 8.0.16 - mysql_upgrade is going away — https://dev.mysql.com/blog-archive/mysql-8-0-16-mysql_upgrade-is-going-away/

## Issues Found

1. **Fabricated `--check-only` flag (was line 67)**: The post claimed `mysql_upgrade -u root -p --check-only` could be used to check if an upgrade is needed without making changes. The `--check-only` option does not exist for `mysql_upgrade` in any MySQL version. The actual behavior is that running `mysql_upgrade` normally (without `--force`) automatically exits without changes if the data directory version already matches the server version. Fixed by removing the non-existent flag and describing the real behavior.

2. **`--upgrade=FORCE` used with MySQL 5.7 Docker image (was line 130)**: The post showed `docker run -e MYSQL_ROOT_PASSWORD=secret mysql:5.7 mysqld --upgrade=FORCE`. The `--upgrade` server option was introduced in MySQL 8.0.16 and does not exist in MySQL 5.7. Running this command against a 5.7 image would fail with an unknown option error. Fixed by changing the image tag to `mysql:8.0` and adding context that this option is for MySQL 8.0.16+.

## Review Notes
- The `mysql_upgrade` utility is deprecated as of MySQL 8.0.16 and removed in MySQL 8.4. The post correctly notes this but readers working with MySQL 8.4+ should be aware that the utility no longer ships with the server at all.
- The post correctly covers the most common use cases and flags (`--force`, `--upgrade-system-tables`) that are well-documented in official MySQL docs.
- The `information_schema.TABLES` query in the "Post-Upgrade Verification" section is a reasonable heuristic but not an officially documented approach for verifying upgrade status.
