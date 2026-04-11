# Validation Summary: What Is the InnoDB General Tablespace in MySQL

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (5.7.6+, 8.0+)
- InnoDB Storage Engine
- InnoDB General Tablespaces
- information_schema system tables

## Sources Consulted
- MySQL 5.7.6 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/5.7/en/news-5-7-6.html
- MySQL 8.0 General Tablespaces documentation — https://dev.mysql.com/doc/refman/8.0/en/general-tablespaces.html
- MySQL 5.7 General Tablespaces documentation — https://dev.mysql.com/doc/refman/5.7/en/general-tablespaces.html
- INFORMATION_SCHEMA FILES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-files-table.html
- INFORMATION_SCHEMA TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- INFORMATION_SCHEMA INNODB_TABLES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tables-table.html
- INFORMATION_SCHEMA INNODB_TABLESPACES Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-innodb-tablespaces-table.html

## Issues Found
1. **Unreliable query for finding tables in a tablespace**: The original query used `information_schema.TABLES.CREATE_OPTIONS LIKE '%TABLESPACE=ts_archive%'` to find tables in a specific tablespace. The `CREATE_OPTIONS` column does not reliably store the `TABLESPACE=name` value in a consistent format across MySQL versions. Replaced with a join between `information_schema.INNODB_TABLES` and `information_schema.INNODB_TABLESPACES` on the `SPACE` column, which is the documented and reliable approach for MySQL 8.0+.

## Review Notes
- The `ADD DATAFILE` clause in `CREATE TABLESPACE` became optional in MySQL 8.0.14. The post shows it as required, which is correct for MySQL 5.7 through 8.0.13 and still works in later versions.
- The limitation about partitioned tables not being allowed in general tablespaces is accurate for MySQL 8.0.13+ and 5.7.24+. Earlier MySQL 5.7 versions (5.7.6–5.7.23) did allow individual partitions in general tablespaces before it was deprecated.
- The `information_schema.FILES` query for listing tablespaces works but returns all InnoDB tablespace types (system, file-per-table, general), not just general tablespaces. The label "List all tablespaces" is accurate for what the query does.
- The `innodb_directories` variable mentioned in the post was introduced in MySQL 8.0.21. For MySQL 5.7 users, the relevant variables are `datadir` and `innodb_data_home_dir`.
