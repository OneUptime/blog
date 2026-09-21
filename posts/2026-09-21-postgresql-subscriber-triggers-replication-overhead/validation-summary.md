# Validation Summary: How to Enable PostgreSQL Subscriber Triggers and Measure Overhead

## Status
validated

## Post Type
Tutorial / operational performance guide with SQL examples.

## Technologies Covered
- PostgreSQL 18 logical replication, publications, subscriptions, and apply workers.
- PL/pgSQL row triggers and session replication roles.
- Identity columns, ownership, and privileges.
- Function statistics, configuration reloads, and performance measurement.

## Sources Consulted
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) — trigger modes, ownership, and replica identity.
- [Logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) — apply role, row triggers, initial synchronization, and transaction order.
- [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) — target-table ownership and apply privileges.
- [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html) — run_as_owner and disable_on_error defaults.
- [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html) — re-enabling a disabled subscription.
- [Logical replication conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html) — failures that interrupt apply.
- [PL/pgSQL trigger functions](https://www.postgresql.org/docs/18/plpgsql-trigger.html) — TG_OP, OLD, NEW, AFTER return values, and errors.
- [CREATE TRIGGER](https://www.postgresql.org/docs/18/sql-createtrigger.html) and [CREATE FUNCTION](https://www.postgresql.org/docs/18/sql-createfunction.html) — syntax and execution context.
- [Identity columns](https://www.postgresql.org/docs/18/ddl-identity-columns.html) — automatic identity generation.
- [PostgreSQL 18 source: primnodes.h](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/include/nodes/primnodes.h) — NextValueExpr explicitly documents that identity generation bypasses sequence privilege checks.
- [PostgreSQL 18 source: execExprInterp.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/executor/execExprInterp.c) and [sequence.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/sequence.c) — identity evaluation passes false to the sequence permission-check parameter.
- [Cumulative statistics](https://www.postgresql.org/docs/18/monitoring-stats.html) — function counters, millisecond units, reporting delay, and snapshot behavior.
- [Run-time statistics](https://www.postgresql.org/docs/18/runtime-config-statistics.html) — track_functions values and privileges.
- [PostgreSQL 18 source: system_views.sql](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/catalog/system_views.sql) — pg_stat_user_functions excludes functions without collected call statistics.
- [ALTER SYSTEM](https://www.postgresql.org/docs/18/sql-altersystem.html) and [administration functions](https://www.postgresql.org/docs/18/functions-admin.html) — configuration persistence and reload.
- [pg_trigger](https://www.postgresql.org/docs/18/catalog-pg-trigger.html) and [system information functions](https://www.postgresql.org/docs/18/functions-info.html) — inventory columns and pg_get_triggerdef.
- [Date/time functions](https://www.postgresql.org/docs/18/functions-datetime.html) — clock_timestamp return type and behavior.
- [Author profile](https://github.com/nawazdhandala) — verified the article's author link resolves to the intended profile.

## Issues Found
1. **Unnecessary identity-sequence privilege requirement.** The text said the apply role must be able to use the audit sequence. PostgreSQL's automatic identity generation does not require a separate sequence privilege. Removed that requirement and clarified the identity behavior while retaining the audit-table INSERT requirement.
2. **Incomplete function-statistics calculation.** A function with no tracked calls can be absent from pg_stat_user_functions, and the ordinary-mode baseline produces no replicated trigger calls. Added a zero initial baseline for a missing pre-call row, restricted division to a positive call delta, and required counters not to have been reset. Clarified that a zero-call run has no per-invocation average.
3. **Unconditional retry advice.** Repair alone does not resume a subscription disabled by disable_on_error. Added the necessary ALTER SUBSCRIPTION ... ENABLE step for that configuration.

## Review Notes
- Reviewed all SQL examples against PostgreSQL 18 documentation. No deprecated syntax or APIs were identified. The article's documentation links resolve to the intended version and topics.
- Confirmed replica/origin/always trigger behavior, initial COPY trigger behavior, default table-owner switching, and the correct OLD/NEW branches in the audit function. AFTER-trigger return values are ignored, so the existing returns are valid.
- The three-row verification assumes committed INSERT, UPDATE, and DELETE changes are all published, the test ID remains unchanged, and publication filters do not exclude or transform the test changes.
- Function timing is cumulative database-level instrumentation. Controlled runs must avoid unrelated calls to the same function, and elapsed replication time plus system metrics remain necessary to assess broader overhead.
- ALTER SYSTEM requires the appropriate administrative privilege and must run outside an explicit transaction block. Restore the previous configuration and reload after measurement.
- This was a documentation and PostgreSQL 18 source review, not a live PostgreSQL 18 replication benchmark. The locally available PostgreSQL binary reports version 14.17 and was not used to claim PostgreSQL 18 runtime validation.
- Changes were limited to technical corrections within the existing sections; the article structure and SQL examples were preserved.
