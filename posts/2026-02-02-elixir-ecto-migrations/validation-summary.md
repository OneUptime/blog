# Validation Summary: How to Handle Database Migrations with Ecto

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elixir
- Ecto / Ecto SQL
- Ecto.Migration / Ecto.Migrator
- PostgreSQL (JSONB, GIN indexes, enums, partial indexes, concurrent indexes, PL/pgSQL DO blocks)
- Mix tasks (`ecto.gen.migration`, `ecto.migrate`, `ecto.rollback`, `ecto.migrations`, `ecto.reset`)
- Elixir releases (`bin/<app> eval`)

## Sources Consulted
- Ecto.Migration documentation: https://hexdocs.pm/ecto_sql/Ecto.Migration.html
- Ecto.Migrator documentation: https://hexdocs.pm/ecto_sql/Ecto.Migrator.html
- Mix.Tasks.Ecto.Rollback: https://hexdocs.pm/ecto_sql/Mix.Tasks.Ecto.Rollback.html
- Mix.Tasks.Ecto.Migrate: https://hexdocs.pm/ecto_sql/Mix.Tasks.Ecto.Migrate.html
- Phoenix "Deploying with Releases" guide (canonical `MyApp.Release` pattern): https://hexdocs.pm/phoenix/releases.html
- PostgreSQL DO block reference: https://www.postgresql.org/docs/current/sql-do.html
- PostgreSQL CREATE INDEX (CONCURRENTLY): https://www.postgresql.org/docs/current/sql-createindex.html

## Issues Found
1. **`BackfillUserSlugs` migration would fail to run.** The migration executes a PL/pgSQL `DO $$ ... $$` block that contains `COMMIT;` to flush each batch. Per the PostgreSQL docs, transaction-control statements inside a `DO` block only work when the block is *not* called from inside an outer transaction. Ecto wraps every migration in a transaction by default, so the `COMMIT` would error out with "invalid transaction termination". Fixed by adding `@disable_ddl_transaction true` (and `@disable_migration_lock true`, which is the usual companion) to the migration module, plus a one-line comment explaining why. No other code changes were needed.

## Review Notes
- The canonical `MyApp.Release` module (load app, `Ecto.Migrator.with_repo/3` + `Ecto.Migrator.run/3`, matching `{:ok, _, _}`) matches the pattern documented in the Phoenix and Ecto.Migrator docs exactly.
- `add_if_not_exists` is shown inside a `change/0` callback in the troubleshooting section. This works for the forward direction, but Ecto cannot auto-reverse `add_if_not_exists`, so attempting to roll that migration back would raise. Not changed because the example is presented as a one-off idempotency aid rather than a reversible pattern, but readers should be aware.
- `@disable_migration_lock true` in the concurrent-index example is intentional (it's needed alongside `@disable_ddl_transaction` so the advisory lock doesn't hold a connection while CONCURRENTLY runs); kept as written.
- All Mix tasks, flag names (`--step`, `-n`, `--to`), and DSL functions (`flush/0`, `references/2`, `timestamps/1`, `create_if_not_exists`, partial indexes via `where:`/`name:`) verified against current Ecto SQL docs.
- PostgreSQL-specific syntax (`GIN`, `to_tsvector`, `split_part`, `position`, `substring`, `CONCAT_WS`, `FOR UPDATE SKIP LOCKED`, enum types via `CREATE TYPE`) is all correct.
