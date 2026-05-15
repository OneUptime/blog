# Validation Summary: How to Benchmark MySQL and PostgreSQL Performance with sysbench on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- EPEL
- sysbench
- MySQL
- PostgreSQL
- Database benchmarking

## Sources Consulted
- sysbench official GitHub README: https://github.com/akopytov/sysbench
- Red Hat Enable Sysadmin, "How to install EPEL on RHEL and CentOS Stream": https://www.redhat.com/en/blog/install-epel-linux
- PostgreSQL 15 documentation, GRANT: https://www.postgresql.org/docs/15/sql-grant.html
- PostgreSQL 15 documentation, Schemas and privileges: https://www.postgresql.org/docs/15/ddl-schemas.html
- MySQL 8.4 Reference Manual, CREATE USER: https://dev.mysql.com/doc/refman/8.4/en/create-user.html
- MySQL 8.0 Reference Manual, GRANT: https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
- The EPEL setup used `sudo dnf install -y epel-release`, which is not the documented RHEL enablement flow. Updated it to enable CodeReady Linux Builder and install the EPEL release RPM from Fedora, matching Red Hat's RHEL guidance while deriving the running RHEL major version.
- The PostgreSQL setup granted privileges on the database but not `CREATE` on the `public` schema. On current PostgreSQL defaults, sysbench creates unqualified tables in the first schema on the search path, so the benchmark user needs schema-level `CREATE`. Added `GRANT CREATE ON SCHEMA public TO sbuser;` against the `sbtest` database.

## Review Notes
The sysbench `oltp_read_write.lua` usage, MySQL account and database grants, table and thread options, and benchmark output description are technically consistent with the consulted documentation. The local environment did not have sysbench installed, so command verification relied on official sysbench documentation rather than local `sysbench --help` output.
