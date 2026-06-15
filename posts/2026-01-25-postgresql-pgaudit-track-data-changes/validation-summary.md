# Validation Summary: How to Track Data Changes with pgAudit in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- pgAudit
- PostgreSQL server logging
- PostgreSQL CSV and JSON log output
- SQL
- Debian/Ubuntu and RHEL package installation

## Sources Consulted
- pgAudit official README and settings documentation: https://github.com/pgaudit/pgaudit
- PostgreSQL logging documentation: https://www.postgresql.org/docs/current/runtime-config-logging.html
- PostgreSQL PGDG RPM repository package listing for `pgaudit_16`: https://download.postgresql.org/pub/repos/yum/16/redhat/rhel-9-x86_64/
- PostgreSQL PGDG APT repository package listing for `postgresql-16-pgaudit`: https://apt.postgresql.org/pub/repos/apt/pool/main/p/pgaudit-16/

## Issues Found
- The introduction said pgAudit "satisfies" compliance frameworks. Changed this to "can support" compliance frameworks because pgAudit is one control, not a complete compliance solution.
- The standard logging comparison said there is no structured format. PostgreSQL supports structured CSV and JSON logging, so this was changed to say standard logging lacks audit-specific fields.
- The source installation example did not select the PostgreSQL-major-version-specific pgAudit branch. Added `git checkout REL_16_STABLE` for the PostgreSQL 16 example.
- The `pgaudit.log` option list omitted `MISC_SET`. Added it.
- The `pgaudit.log_statement_once` comment incorrectly described failed-statement logging. Changed it to describe its actual behavior: logging statement text only once per statement/substatement.
- The `pgaudit.log_level` comment implied it controls all audit log messages. Changed it to note that it applies to client-visible audit messages when `pgaudit.log_client` is enabled.
- The object audit logging description implied any query against granted tables is logged. Clarified that object audit logging supports `SELECT`, `INSERT`, `UPDATE`, and `DELETE`, not `TRUNCATE`, and depends on the audit role having permission for the executed command.
- The audit log format omitted the `PARAMETER` field. Added the field to the format, table, and sample log entries.
- The JSON logging example used an unsafe CSV-to-JSON shell pipeline that would not correctly parse quoted CSV fields. Replaced it with PostgreSQL's native `jsonlog` configuration.
- The CSV import example attempted to copy a PostgreSQL csvlog file directly into a four-column archive table with `HEADER true`. PostgreSQL csvlog files have many fixed columns and no header row, so the example would fail. Replaced it with a staging table matching PostgreSQL csvlog columns, then inserted pgAudit messages into the archive table.
- The performance benchmark table gave precise overhead percentages without an authoritative basis. Replaced it with workload-dependent qualitative guidance.

## Review Notes
- pgAudit's official documentation notes that audit entries are comma-separated and are compliant CSV only after any log line prefix is removed.
- pgAudit cannot reliably audit superusers; that caveat is not covered in the post and could be added in a future revision.
