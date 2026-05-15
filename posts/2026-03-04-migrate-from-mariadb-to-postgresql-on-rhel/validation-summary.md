# Validation Summary: How to Migrate from MariaDB to PostgreSQL on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- EPEL
- MariaDB
- PostgreSQL
- pgloader
- SQL

## Sources Consulted
- pgloader MySQL to PostgreSQL documentation: https://pgloader.readthedocs.io/en/latest/ref/mysql.html
- pgloader transformation functions documentation: https://pgloader.readthedocs.io/en/latest/ref/transforms.html
- PostgreSQL CREATE USER documentation: https://www.postgresql.org/docs/current/sql-createuser.html
- PostgreSQL CREATE DATABASE documentation: https://www.postgresql.org/docs/current/sql-createdatabase.html
- PostgreSQL cumulative statistics documentation: https://www.postgresql.org/docs/15/monitoring-stats.html
- PostgreSQL pg_sequences documentation: https://www.postgresql.org/docs/17/view-pg-sequences.html
- MariaDB Information Schema TABLES documentation: https://mariadb.com/docs/server/reference/system-tables/information-schema/information-schema-tables/information-schema-tables-table
- MariaDB GRANT documentation: https://mariadb.com/docs/server/reference/sql-statements/account-management-sql-statements/grant
- Fedora EPEL getting started documentation: https://docs.fedoraproject.org/en-US/epel/getting-started/

## Issues Found
- The EPEL installation commands used `dnf install epel-release`, which is not the recommended setup path for RHEL 9. Updated the commands to enable CodeReady Builder and install the official EPEL 9 release RPM.
- The MariaDB migration user was described as read-only but was granted `TRIGGER`, which permits trigger operations and is not needed for pgloader's documented MySQL migration path. Removed `TRIGGER` from the grant.
- The verification section described `information_schema.tables.table_rows` and `pg_stat_user_tables.n_live_tup` as row counts. MariaDB documents `TABLE_ROWS` as an estimate for engines such as InnoDB, and PostgreSQL documents `n_live_tup` as an estimated number of live rows. Updated the comments to call them approximate row estimates.
- The data type comparison table said `DATETIME` maps to `TIMESTAMP`, but pgloader's documented default mapping is `timestamptz`, and the post's own control file uses `timestamptz`. Updated the table.
- The data type comparison table said `ENUM(...)` maps to `TEXT (with CHECK constraint)`, but pgloader defaults to PostgreSQL enum types unless a custom cast rule maps enum values to text. Updated the table.
- The data type comparison table said all `TINYINT` values map to `SMALLINT`, but pgloader's default rules can map `TINYINT(1)` to `BOOLEAN`. Added that caveat.

## Review Notes
The examples are otherwise consistent with pgloader's documented MySQL-to-PostgreSQL command syntax. The guide is now accurate for the RHEL 9 EPEL setup path; RHEL 8 or RHEL 10 users would need the matching EPEL release package and repository names.
