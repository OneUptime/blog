# Validation Summary: How to Compare Two MySQL Database Schemas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (mysqldump, information_schema)
- MySQL Utilities (mysqldiff)
- MySQL Workbench (Schema Diff Tool)
- Skeema (schema management CLI)
- Standard Unix diff

## Sources Consulted
- MySQL official documentation for `mysqldump` command-line syntax (https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html)
- MySQL Utilities `mysqldiff` documentation (https://dev.mysql.com/doc/mysql-utilities/1.6/en/mysqldiff.html)
- Percona Toolkit documentation for `pt-table-checksum` (https://docs.percona.com/percona-toolkit/pt-table-checksum.html)
- MySQL 8.0 Reference Manual for `EXCEPT` clause (https://dev.mysql.com/doc/refman/8.0/en/set-operations.html)
- MySQL `information_schema.TABLES`, `information_schema.COLUMNS`, and `information_schema.STATISTICS` reference
- Skeema documentation (https://www.skeema.io/docs/)

## Issues Found

1. **mysqldump missing `-h` flag for host**: The original commands `mysqldump --no-data -u root -p production myapp` treated `production` as a database name and `myapp` as a table name. The `-h` flag is required to specify a remote host. Fixed to `mysqldump --no-data -u root -p -h production myapp`.

2. **mysqldiff incorrectly attributed to Percona Toolkit**: The section title referenced "Percona pt-table-checksum / mysqldiff" and the comment said "Percona Toolkit's mysqldiff". `mysqldiff` is from MySQL Utilities (Oracle), not Percona Toolkit. `pt-table-checksum` is a Percona tool for data consistency checking between replicas, not schema comparison. Fixed the title to "MySQL Utilities mysqldiff" and corrected the comment.

3. **Invalid mysqldiff positional argument format**: `host1:myapp:host2:myapp` is not a valid format. Since servers are specified via `--server1` and `--server2`, the positional argument should be `myapp:myapp` (source_db:target_db). Fixed accordingly.

4. **Missing MySQL version note for EXCEPT clause**: The `EXCEPT` set operator was added in MySQL 8.0.31. Users on earlier versions would get a syntax error. Added a note indicating the version requirement.

5. **Summary referenced pt-table-checksum**: The summary incorrectly suggested `pt-table-checksum` for CI/CD schema comparison workflows. Replaced with `mysqldiff`.

## Review Notes
- MySQL Utilities (which provides `mysqldiff`) is deprecated and was last released as part of MySQL Utilities 1.6. Users on MySQL 8.0+ may want to consider `mysqlsh` (MySQL Shell) utilities or third-party tools like skeema as modern alternatives.
- The MySQL Workbench menu path "Database > Schema Diff Tool" may vary slightly depending on the Workbench version. Some versions label it "Schema Comparison" or access it through a different submenu.
- The skeema installation commands are Debian/Ubuntu-specific (`apt-get`). Users on other distributions or macOS would need different installation steps.
