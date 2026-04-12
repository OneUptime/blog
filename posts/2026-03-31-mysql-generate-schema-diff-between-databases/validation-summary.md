# Validation Summary: How to Generate a Schema Diff Between Two MySQL Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (information_schema, mysqldump)
- skeema (MySQL schema management CLI)
- mysql-diff (Python package for comparing MySQL dump files)
- mysqldbcompare (from deprecated mysql-utilities package)

## Sources Consulted
- skeema official documentation at https://www.skeema.io/docs/
- PyPI listing for mysql-diff: https://pypi.org/project/mysql-diff/
- mysql-diff source: https://github.com/mgaitan/mysql-compare-dump-diff-as-alter
- MySQL Utilities mysqldbcompare man page: https://linux.die.net/man/1/mysqldbcompare
- MySQL Utilities EOL notice: https://www.mysql.com/support/eol-notice.html
- MySQL information_schema.COLUMNS documentation: https://dev.mysql.com/doc/refman/8.0/en/information-schema-columns-table.html
- MySQL information_schema.STATISTICS documentation: https://dev.mysql.com/doc/refman/8.0/en/information-schema-statistics-table.html

## Issues Found

1. **skeema workflow was reversed**: The post initialized skeema from production and then ran `skeema diff`/`skeema push` against the dev host. This would generate ALTERs to make dev match production — the opposite of the stated goal (promoting dev changes to production). Fixed by initializing from the dev database (the desired state) and running diff/push against the production host. Also fixed `skeema init` syntax: the positional argument is an environment name, not a directory path. Changed to use `--dir=schema` for the output directory.

2. **Inaccurate comment for mysql-diff**: The comment said "Use Python's sqldiff or similar" but then installed `mysql-diff`, which is the actual package name. Fixed the comment to accurately reference `mysql-diff`.

3. **Wrong section title for mysqldbcompare**: The section was titled "Using MySQL Workbench Scripted Diff" but `mysqldbcompare` is from the `mysql-utilities` package, not MySQL Workbench. Fixed the title to "Using mysqldbcompare from MySQL Utilities" and updated the comment accordingly.

4. **Meaningless validation step**: The validation section used `EXPLAIN FORMAT=TREE SELECT 1;` which does not validate schema changes in any way. Replaced with a practical validation approach: dumping both the migrated copy and the dev schema with `mysqldump --no-data`, then comparing them with `diff` to confirm they match.

## Review Notes
- The `mysql-diff` Python package (v0.1.0, last updated 2021) is pre-alpha and has significant limitations: it only parses InnoDB tables and handles a subset of DDL changes (ADD COLUMN, MODIFY COLUMN, CREATE TABLE). Readers should be aware it is not production-grade.
- MySQL Utilities (which provides `mysqldbcompare`) has been EOL since May 2018. Oracle's stated replacement is MySQL Shell, though it does not yet have a direct equivalent of `mysqldbcompare`.
- The information_schema queries correctly handle only the "columns/indexes in dev but not in production" case. They do not detect modified columns, dropped columns, or other schema differences. The post scopes this correctly in its prose.
- The `--password=secret` usage in skeema commands exposes credentials on the command line. In production usage, interactive password prompts or configuration files would be preferred.
