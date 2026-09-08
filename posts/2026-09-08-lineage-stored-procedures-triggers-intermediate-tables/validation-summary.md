# Validation Summary: How to Trace Lineage Through Procedures, Triggers, and Intermediate Tables

## Status
validated

## Post Type
Technical guide with illustrative SQL and Python examples.

## Technologies Covered
- PostgreSQL and SQL
- Stored procedures, PL/pgSQL, table/view triggers, and event triggers
- Temporary tables and common table expressions
- pg_stat_statements and auto_explain
- Transaction-aware data lineage and runtime event correlation
- Python set operations

## Sources Consulted
- [PostgreSQL: pg_trigger catalog](https://www.postgresql.org/docs/current/catalog-pg-trigger.html)
- [PostgreSQL: pg_proc catalog](https://www.postgresql.org/docs/current/catalog-pg-proc.html)
- [PostgreSQL: System information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL: CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)
- [PostgreSQL: Triggers](https://www.postgresql.org/docs/current/triggers.html)
- [PostgreSQL: Trigger behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL: pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL: auto_explain](https://www.postgresql.org/docs/current/auto-explain.html)
- [PostgreSQL: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL: CREATE TABLE AS](https://www.postgresql.org/docs/current/sql-createtableas.html)
- [PostgreSQL: INSERT](https://www.postgresql.org/docs/current/sql-insert.html)
- [PostgreSQL: DROP TABLE](https://www.postgresql.org/docs/current/sql-droptable.html)
- [PostgreSQL: CALL](https://www.postgresql.org/docs/current/sql-call.html)
- [PostgreSQL: Event trigger catalog](https://www.postgresql.org/docs/current/catalog-pg-event-trigger.html)
- [PostgreSQL: PL/pgSQL dynamic statements](https://www.postgresql.org/docs/current/plpgsql-statements.html)
- [PostgreSQL: PL/pgSQL transaction management](https://www.postgresql.org/docs/current/plpgsql-transactions.html)
- [PostgreSQL: PL/pgSQL exception handling](https://www.postgresql.org/docs/current/plpgsql-control-structures.html)
- [PostgreSQL: ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/current/sql-rollback-to.html)
- [PostgreSQL: libpq pipeline mode](https://www.postgresql.org/docs/current/libpq-pipeline-mode.html)
- [PostgreSQL: Logging and session identifiers](https://www.postgresql.org/docs/current/runtime-config-logging.html)
- [PostgreSQL: Common table expressions](https://www.postgresql.org/docs/current/queries-with.html)
- [Python set types](https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found
1. **Trigger execution ownership:** The initial diagram placed the trigger invocation directly under the orchestrator. Changed it to show the procedure's target write firing the trigger, matching PostgreSQL trigger execution behavior.
2. **auto_explain prerequisites and overhead:** Added the requirement to load the module and enable logging with a nonnegative log_min_duration. Clarified that duration thresholds do not prevent per-node timing overhead with analysis and timing enabled; sampling or disabling timing can reduce this cost.
3. **Partial rollback:** Outer transaction commit alone does not establish that every observed write persisted. Updated the durable-edge rule to exclude writes undone by savepoint rollback or aborted subtransactions, including PL/pgSQL exception blocks.
4. **Connection concurrency:** Replaced the implication that a pooled PostgreSQL connection executes concurrent client statements with connection reuse across jobs. PostgreSQL executes statements sequentially on a connection, including in pipeline mode.
5. **Procedure/transaction cardinality:** Clarified that a top-level procedure call can perform internal transaction control and span multiple transactions. Nested statements must be associated with their actual transaction rather than a single transaction assumed for the entire call.

## Review Notes
- Checked against PostgreSQL 18 documentation, which the current documentation URLs resolved to during review. All eight official documentation links and the author profile resolved to the intended resources.
- The catalog query uses valid catalog columns, joins, and supported definition/identity functions. It intentionally inventories non-internal relation triggers; event triggers require the separate catalog. Definition extraction returns reconstructed SQL rather than original source formatting.
- CALL and the temporary-table CREATE AS, INSERT SELECT, and DROP statements are syntactically valid. They are illustrative fragments: execution requires the named procedure, schemas, source columns, appropriate privileges, and a destination table whose column order and types match the SELECT output. No schema definitions are supplied, so these examples were reviewed against documentation rather than executed against a database.
- The Python subtraction expressions correctly compute set differences, assuming both edge collections are sets containing comparable, hashable identities.
- Confirmed nested-statement tracking, aggregation and bounded retention in pg_stat_statements; trigger timing, conditions, deferral and recursion; session-local temporary tables; and query-scoped CTEs. No deprecated syntax was found in the examples. There are no terminal commands or standalone configuration files to validate.
- The trigger inventory does not itself collect tgenabled; implementations following the later enabled-state requirement should collect that catalog field and relevant session_replication_role evidence. The example is a definition inventory, not a complete runtime collector.
- Session identifiers used in archival lineage should identify a session incarnation, not merely a reusable process ID. The proposed creation sequence also needs to distinguish repeated temporary-object lifecycles.
- Declared/observed edges, invocation IDs, coverage counters, and graph projections are proposed collector design conventions, not native PostgreSQL features. pg_stat_statements and sampled plans alone cannot supply the complete call tree or commit ledger described here.
- For the rollback canary, use a procedure without internal commits and control each invocation's transaction from the test harness. Already committed transactions cannot be undone by a later rollback.
