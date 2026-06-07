# Validation Summary: How to Use PostgreSQL Triggers and Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (12+, but examples target modern versions)
- PL/pgSQL (PostgreSQL's procedural language)
- SQL DDL (CREATE TABLE, CREATE TRIGGER, CREATE FUNCTION, ALTER TABLE)
- PostgreSQL system catalogs (`pg_trigger`, `information_schema.triggers`, `pg_stat_statements`, `pg_stat_user_tables`)
- JSONB functions (`to_jsonb`, `jsonb_object_keys`, `jsonb_build_object`)
- Trigger transition tables (REFERENCING ... TABLE AS, PostgreSQL 10+)
- `pg_notify` / LISTEN-NOTIFY

## Sources Consulted
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL Trigger Functions: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL PL/pgSQL Control Structures (CASE, RAISE, GET DIAGNOSTICS): https://www.postgresql.org/docs/current/plpgsql-control-structures.html
- PostgreSQL Functions and Operators (JSONB, system info, array): https://www.postgresql.org/docs/current/functions.html
- PostgreSQL pg_trigger system catalog: https://www.postgresql.org/docs/current/catalog-pg-trigger.html
- pg_stat_statements documentation: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL ALTER TABLE (DISABLE/ENABLE TRIGGER): https://www.postgresql.org/docs/current/sql-altertable.html

## Issues Found
1. **Subquery inside a trigger WHEN clause (technical error).** The original `vip_order_alert` example used `EXISTS (SELECT 1 FROM customers ...)` inside the trigger's `WHEN` clause. PostgreSQL explicitly disallows this: per the CREATE TRIGGER docs, "WHEN expressions cannot contain subqueries." Attempting to create that trigger would raise `cannot use subquery in trigger WHEN condition`. Rewrote the example to use only a `NEW.total_amount > 1000` condition and added a short note that table-lookup checks (like VIP status) must be performed inside the trigger function instead.

## Review Notes
- The prerequisite of "PostgreSQL 12 or higher" is technically loose: the post uses `EXECUTE FUNCTION` (introduced in PostgreSQL 11, so fine) and the `pg_stat_statements` columns `total_exec_time`/`mean_exec_time` which were renamed from `total_time`/`mean_time` in PostgreSQL 13. The monitoring snippet would fail on PG 12, but since PostgreSQL 12 reached EOL in November 2024, this is a minor concern for current readers. Not changed.
- In the `get_products_needing_restock` function, the `RETURNS TABLE` column names overlap with table column names referenced inside the query (e.g., `reorder_level`). Because the query references are table-qualified (`p.reorder_level`) and the SELECT list uses positional matching for `RETURN QUERY`, this works correctly under PostgreSQL's default `variable_conflict` behavior, but readers should be aware of this potential ambiguity in their own functions.
- The `log_batch_import` function references both `new_rows` and `old_rows` transition tables, but the example trigger only declares `REFERENCING NEW TABLE AS new_rows` (AFTER INSERT). The DELETE/UPDATE branches in the function are effectively dead code for this trigger; they only become reachable if the function is reused on triggers that declare the corresponding transition tables. Acceptable as instructional content but worth noting.
- The post correctly describes BEFORE-DELETE soft-delete by returning NULL from the trigger function to cancel the DELETE; this matches PostgreSQL semantics.
- The `pg_trigger.tgenabled` value decoding (`O`/`D`/`R`/`A`) is accurate per the catalog documentation.
