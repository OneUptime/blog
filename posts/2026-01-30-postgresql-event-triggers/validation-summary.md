# Validation Summary: How to Implement PostgreSQL Event Triggers

## Status
validated

## Post Type
Tutorial / Guide — walks the reader through building a complete DDL audit system using PostgreSQL event triggers, with PL/pgSQL functions and a companion Python listener.

## Technologies Covered
- PostgreSQL (event triggers, `pg_event_trigger_ddl_commands()`, `pg_event_trigger_dropped_objects()`, LISTEN/NOTIFY)
- PL/pgSQL
- SQL DDL (CREATE EVENT TRIGGER, ALTER EVENT TRIGGER, etc.)
- Python (`psycopg2`) for real-time notification listening
- Mermaid (diagrams only)

## Sources Consulted
- PostgreSQL docs — Event Trigger Definition: https://www.postgresql.org/docs/current/event-trigger-definition.html
- PostgreSQL docs — Event Trigger Functions: https://www.postgresql.org/docs/current/functions-event-triggers.html
- PostgreSQL docs — System Information Functions (`pg_get_triggerdef`, `pg_get_functiondef`, `pg_get_viewdef`, `pg_get_indexdef`): https://www.postgresql.org/docs/current/functions-info.html
- PostgreSQL docs — SQL Key Words (Appendix C, reserved-keyword status of `SESSION_USER` / `CURRENT_USER`): https://www.postgresql.org/docs/current/sql-keywords-appendix.html
- PostgreSQL docs — CREATE EVENT TRIGGER: https://www.postgresql.org/docs/current/sql-createeventtrigger.html
- PostgreSQL docs — ALTER EVENT TRIGGER: https://www.postgresql.org/docs/current/sql-altereventtrigger.html

## Issues Found

1. **Reserved-keyword column names (would prevent the schema from being created).**
   The `audit.ddl_history` table defined columns named `session_user` and `current_user`. Both are SQL-standard reserved keywords in PostgreSQL (per Appendix C). The `CREATE TABLE` would fail with a syntax error, and SELECTs that referenced these unquoted would silently invoke the built-in functions instead of reading the column.
   **Fix:** Renamed the columns to `session_user_name` and `current_user_name`. Updated the index on `audit.ddl_history` and every `INSERT` / `SELECT` / `ARRAY_AGG` reference accordingly. The VALUES clauses still use the bare `session_user` / `current_user` keywords (which is correct — those are the SQL functions returning the user names).

2. **`pg_get_triggerdef` lookup was wrong.**
   In `audit.handle_ddl_end`, the `'trigger'` branch did `pg_get_triggerdef((SELECT oid FROM pg_trigger WHERE tgname = v_obj.object_identity))`. The `object_identity` for a trigger has the form `trigger_name on schema.table`, never just `tgname`, so the subquery would never match and the lookup would return NULL.
   **Fix:** `v_obj.objid` from `pg_event_trigger_ddl_commands()` is already the `pg_trigger.oid`, so the call is now `pg_get_triggerdef(v_obj.objid)` — consistent with how the function, view, and index branches use `v_obj.objid` directly.

3. **Cascade detection used a fragile "first row wins" heuristic.**
   `audit.handle_sql_drop` assumed the first row from `pg_event_trigger_dropped_objects()` was the explicitly-dropped object and treated the rest as cascades. Row ordering is not guaranteed, and PostgreSQL already exposes a dedicated `original boolean` column for this purpose.
   **Fix:** Order the iteration `BY original DESC` (so root drop targets are visited first), capture the primary identity from the first `original = true` row, and compute `is_cascade` as `NOT v_obj.original` for both the audit insert and the `pg_notify` payload. The notify payload's `is_cascade` field was also fixed (it previously compared against `v_original_identity`, which carried the same bug).

4. **"Three types" framing was incomplete.**
   The intro and "Understanding the Three Event Types" section described event triggers as if there were exactly three. PostgreSQL actually exposes five: `ddl_command_start`, `ddl_command_end`, `sql_drop`, `table_rewrite`, and (since PostgreSQL 17) `login`.
   **Fix:** Reworded the intro to call out that the post covers three core DDL event triggers, and added a one-sentence acknowledgement that `table_rewrite` and `login` exist but are out of scope. Section headings were left intact to avoid restructuring.

## Review Notes
- The CREATE TABLE uses `gen_random_uuid()` without explicitly enabling `pgcrypto`. This is fine on PostgreSQL 13+ where the function is in the core; on earlier versions the reader would need `CREATE EXTENSION pgcrypto`. Not flagged as an error since PostgreSQL 13 has been the minimum supported version for years.
- `txid_current()` is used instead of the newer `pg_current_xact_id()` (PostgreSQL 13+). Both still work; `txid_current()` is retained for compatibility. No change made.
- `pg_user` / `usesuper` are still valid (compatibility view); `pg_roles` / `rolsuper` is the more modern choice. No change made.
- `psycopg2` is in maintenance mode; new Python code typically uses `psycopg` (v3). The example is still functional as-is. No change made.
- The `audit.handle_ddl_start` function inserts an audit row before the DDL runs; if the command later fails, the audit table will contain a row for an operation that never succeeded. This is intentional (the post calls it "Logging the intent before execution"), but readers should be aware.
- Sequence diagram correctly shows `sql_drop` firing before `ddl_command_end` per the docs.
