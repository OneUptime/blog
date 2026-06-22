# Validation Summary: How to Implement Audit Logging in PostgreSQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL
- PL/pgSQL triggers
- JSONB
- pgAudit
- pg_cron
- Debian/Ubuntu and RHEL/CentOS package installation
- Audit log partitioning and retention

## Sources Consulted
- PostgreSQL documentation: Trigger Functions - https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL documentation: CREATE TRIGGER - https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL documentation: CREATE TABLE and partition bounds - https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL documentation: JSON Functions and Operators - https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL documentation: System Administration Functions - https://www.postgresql.org/docs/current/functions-admin.html
- PostgreSQL Red Hat family downloads and PGDG package repository - https://www.postgresql.org/download/linux/redhat/
- PGDG package index for PostgreSQL 16 pgAudit RPMs - https://download.postgresql.org/pub/repos/yum/16/redhat/rhel-8-x86_64/
- pgAudit official documentation - https://github.com/pgaudit/pgaudit
- pg_cron official documentation - https://github.com/citusdata/pg_cron

## Issues Found
- The prerequisite listed PostgreSQL 12+, but PostgreSQL 12 and 13 are unsupported and current pgAudit supports PostgreSQL 14 or greater. Changed the prerequisite to PostgreSQL 14+.
- The enhanced audit trigger inserted into an `app_context` column that was not defined in the earlier `audit_log` table. Added `app_context JSONB` to the table definition.
- The generic audit trigger assumed every audited table had an `id` column and would fail on tables without one. Changed row ID extraction to read the `id` key from `to_jsonb(OLD)` or `to_jsonb(NEW)`, which leaves `row_id` null instead of raising a missing-column error.
- The `SECURITY DEFINER` trigger function did not set a controlled `search_path`. Added `SET search_path = public, pg_temp` to avoid unsafe object resolution.
- The RHEL/CentOS pgAudit install command used the wrong PGDG package name. Changed `pgaudit16` to `pgaudit_16`.
- The pgAudit setup set `pgaudit.log` in `postgresql.conf` before creating the extension, contrary to pgAudit guidance. Kept only `shared_preload_libraries` in `postgresql.conf`, then moved pgAudit settings after `CREATE EXTENSION pgaudit` using `ALTER SYSTEM` and `pg_reload_conf()`.
- The pgAudit configuration enabled `pgaudit.log_client` while describing it as client info logging. Changed the comment and default value to reflect that it controls whether audit messages are visible to clients and is generally left off.
- The `mask_sensitive_fields` function passed text to `jsonb_set`, whose third argument must be JSONB. Wrapped the masked card value in `to_jsonb(...)`.

## Review Notes
- The pgAudit parsing example is intentionally simple and works for the sample lines, but production log parsing should use a CSV-aware parser because pgAudit statements can contain commas and quoted fields.
- The audit examples assume `audit_log` is created in `public` because the security-definer function now uses `public, pg_temp` as its search path. Use a dedicated audit schema and schema-qualify the table in production.
