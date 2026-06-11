# Validation Summary: How to Build PostgreSQL Triggers for Audit

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (triggers, JSONB, partitioning, LISTEN/NOTIFY, custom GUCs)
- PL/pgSQL
- pg_cron extension
- Node.js with `pg` (node-postgres) client
- Python with `psycopg2`

## Sources Consulted
- PostgreSQL Triggers documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PL/pgSQL Trigger Functions: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- JSON Functions and Operators: https://www.postgresql.org/docs/current/functions-json.html
- System Information Functions (`txid_current`, `session_user`, `inet_client_addr`, `inet_client_port`, `current_setting`, `clock_timestamp`, `statement_timestamp`, `hashtext`): https://www.postgresql.org/docs/current/functions-info.html and functions-admin.html
- Table Partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- LISTEN / NOTIFY: https://www.postgresql.org/docs/current/sql-notify.html
- UNLOGGED tables: https://www.postgresql.org/docs/current/sql-createtable.html
- pg_cron documentation: https://github.com/citusdata/pg_cron
- node-postgres documentation: https://node-postgres.com/
- psycopg2 documentation: https://www.psycopg.org/docs/

## Issues Found

1. **Invalid `HASHTEXT` cast in `statement_id` default** — The original code used `statement_id INTEGER DEFAULT statement_timestamp()::TEXT::HASHTEXT`. `HASHTEXT` is a built-in function, not a type, so `::HASHTEXT` is invalid SQL and would fail at `CREATE TABLE` time with `ERROR: type "hashtext" does not exist`. Changed to `hashtext(statement_timestamp()::TEXT)`, which calls the function correctly and still returns INTEGER.

2. **Misleading "per-session" comment on UNLOGGED table** — The original comment described `CREATE UNLOGGED TABLE audit.buffer` as a "Temporary table for buffering (per-session)". UNLOGGED tables are global (visible to all sessions); only TEMPORARY tables are per-session. UNLOGGED simply means writes skip the WAL, making them faster but not crash-safe. Updated the comment to accurately reflect this.

## Review Notes

- The change-detection query in `audit.log_changes()` uses `EXCEPT` and `UNION` in a chained form without parentheses. By PostgreSQL's left-associative set-operation precedence (`A EXCEPT B UNION C EXCEPT D UNION E` → `((((A EXCEPT B) UNION C) EXCEPT D) UNION E)`), this is not the (A EXCEPT B) UNION (C EXCEPT D) UNION (changed-values) shape the author seems to be sketching. In practice, for trigger context, `OLD` and `NEW` always share the same column set, so all the EXCEPT branches resolve to empty and the result still equals the changed-values branch — so the bug does not cause incorrect behavior. Worth tightening with parentheses in a future revision.

- `txid_current()` is still functional, but PostgreSQL 13 introduced `pg_current_xact_id()` as the preferred name. Not an error, but consider updating in a future revision.

- The audit table includes a column named `session_user`. `SESSION_USER` is a SQL reserved word; PostgreSQL accepts it as a column identifier here (parsed unambiguously inside `CREATE TABLE`), but querying it without table-qualification or double-quoting can be confusing because it shadows the built-in `session_user` function. Acceptable as written but worth flagging.

- The `SECURITY DEFINER` trigger functions do not explicitly set `search_path`. PostgreSQL documentation recommends always setting `search_path` (e.g., `SET search_path = pg_catalog, public`) on SECURITY DEFINER functions to avoid privilege-escalation attacks via search-path manipulation. Not an outright bug, but a hardening recommendation worth incorporating.

- `current_setting('app.current_user', true)` returns NULL (not an empty string) if the GUC has never been set, which is correctly relied upon downstream. `SET LOCAL` must be inside an explicit transaction; otherwise PostgreSQL issues a warning and the SET has no effect. The post's Node.js example wraps it in a BEGIN/COMMIT correctly; the Python example uses `with conn:` which establishes a transaction in psycopg2 — both are valid.

- `pg_cron`'s `cron.schedule(name, schedule, command)` three-argument form requires pg_cron 1.4+. Readers on older versions will need to use the two-argument form.

- The `EXECUTE FUNCTION` syntax in `CREATE TRIGGER` requires PostgreSQL 11 or later (it replaced `EXECUTE PROCEDURE`). All current supported versions support this, so no action needed.
