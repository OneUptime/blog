# Validation Summary: How to Audit PostgreSQL Access with pgaudit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pgAudit
- PostgreSQL server configuration
- PostgreSQL extensions
- Linux package managers: apt and dnf
- PostgreSQL log parsing with grep, cut, sort, and uniq

## Sources Consulted
- pgAudit official README: https://github.com/pgaudit/pgaudit
- PostgreSQL CREATE EXTENSION documentation: https://www.postgresql.org/docs/current/sql-createextension.html
- PostgreSQL ALTER SYSTEM documentation: https://www.postgresql.org/docs/current/sql-altersystem.html
- PostgreSQL PGDG APT repository metadata for `postgresql-16-pgaudit`: https://download.postgresql.org/pub/repos/apt/
- PostgreSQL PGDG YUM repository metadata for `pgaudit_16`: https://download.postgresql.org/pub/repos/yum/

## Issues Found
- The RHEL/CentOS package command used `pgaudit16`, but PGDG PostgreSQL 16 YUM repository metadata lists the package as `pgaudit_16`. Changed the command to `sudo dnf install pgaudit_16`.
- The configuration sequence set `pgaudit.log` before creating the extension. The pgAudit documentation states that `CREATE EXTENSION pgaudit` should be called before `pgaudit.log` is set so DDL auditing has proper object type and name information. Split the preload setting from the audit settings and added a note to restart PostgreSQL and create the extension first.
- The audit class table described READ as `COPY FROM`, which is incorrect for pgAudit's class definitions. Updated READ to cover `SELECT` and `COPY` when the source is a relation or query.
- The WRITE class omitted `TRUNCATE` and relation-destination `COPY`. Updated the description to include `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, and `COPY` when the destination is a relation.
- The audit class table omitted `MISC_SET`, which is a supported pgAudit class for `SET` and related commands. Added it to the table.

## Review Notes
- The log examples are representative of pgAudit output, but real output can include parameter fields such as `<not logged>` or logged parameter data depending on `pgaudit.log_parameter`.
- Object audit logging only supports `SELECT`, `INSERT`, `UPDATE`, and `DELETE`; `TRUNCATE` is not included in object audit logging even though it is part of the WRITE class for session audit logging.
