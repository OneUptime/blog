# Validation Summary: How to Migrate from MySQL to MariaDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MySQL (5.7/8.0)
- MariaDB (10.x)
- mysqldump / mydumper / myloader
- Node.js mysql2 driver
- systemd service management
- information_schema queries

## Sources Consulted
- MariaDB JSON Data Type documentation: https://mariadb.com/kb/en/json-data-type/
- MariaDB Dynamic Columns documentation: https://mariadb.com/kb/en/dynamic-columns/
- MariaDB Compatibility & Differences page: https://mariadb.com/kb/en/compatibility-differences/
- MySQL 8.0 JSON data type documentation: https://dev.mysql.com/doc/refman/8.0/en/json.html
- MySQL caching_sha2_password documentation: https://dev.mysql.com/doc/refman/8.0/en/caching-sha2-pluggable-authentication.html
- mysqldump official documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- mydumper/myloader documentation: https://github.com/mydumper/mydumper
- MariaDB installation guides: https://mariadb.com/kb/en/getting-installing-and-upgrading-mariadb/

## Issues Found
- **Incorrect description of MariaDB's JSON type**: The post stated that MySQL's `JSON` column type "differs slightly from MariaDB's dynamic columns." This is inaccurate — MariaDB's `JSON` type is an alias for `LONGTEXT` (with a `JSON_VALID` check constraint), not related to dynamic columns (which are a separate, older MariaDB feature). Fixed to accurately describe that MySQL uses a native binary JSON format while MariaDB's `JSON` is a `LONGTEXT` alias, noting the impact on storage efficiency and some JSON function behavior.

## Review Notes
- The `TABLE_ROWS` column in `information_schema.TABLES` is an estimate for InnoDB tables, not an exact count. For precise row count validation, `SELECT COUNT(*) FROM table_name` on each table would be more reliable. The post's approach is common practice but users should be aware of this caveat.
- The MariaDB version mapping ("MariaDB 10.x maps roughly to MySQL 5.7/8.0") is a reasonable generalization. MariaDB 11.x is now the current major version series, so readers targeting the latest MariaDB should be aware of updated version numbering.
- All SQL syntax, CLI commands, and flags verified as correct.
- The Node.js `mysql2` driver example is correct and idiomatic.
- The `mariadb-secure-installation` command name is correct (MariaDB renamed it from `mysql_secure_installation`).
