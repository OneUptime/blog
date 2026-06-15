# Validation Summary: How to Fix 'out of shared memory' Errors in PostgreSQL

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- PostgreSQL
- SQL
- PL/pgSQL
- PostgreSQL configuration
- Python database access patterns

## Sources Consulted
- PostgreSQL 18 Documentation: Lock Management - https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL 18 Documentation: pg_locks - https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL 18 Documentation: Transactions and Locking - https://www.postgresql.org/docs/current/xact-locking.html
- PostgreSQL 18 Documentation: Transaction Isolation - https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL 18 Documentation: PL/pgSQL Transaction Management - https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL 18 Documentation: DO - https://www.postgresql.org/docs/current/sql-do.html
- PostgreSQL 18 Documentation: Resource Consumption - https://www.postgresql.org/docs/current/runtime-config-resource.html
- PostgreSQL 18 Documentation: PREPARE TRANSACTION - https://www.postgresql.org/docs/current/sql-prepare-transaction.html
- PostgreSQL 18 Documentation: pg_prepared_xacts - https://www.postgresql.org/docs/current/view-pg-prepared-xacts.html
- PostgreSQL 18 Documentation: Configuration Settings Functions - https://www.postgresql.org/docs/current/functions-admin.html

## Issues Found
- The post stated that each row lock consumes shared memory controlled by `max_locks_per_transaction`. PostgreSQL documents that `max_locks_per_transaction` is for object locks and that row-level locks are recorded in the locked rows. I changed the explanation and sample `pg_locks` output to avoid implying tuple locks are the common lock-table capacity issue.
- The lock capacity formulas used only `max_connections * max_locks_per_transaction`. PostgreSQL allocates lock-table space per server process or prepared transaction, so I updated the formulas and monitoring queries to include `max_prepared_transactions`.
- The serializable transaction example said predicate locks are created on all matching rows. PostgreSQL predicate locks depend on the query plan and can be tuple, page, or relation level, so I changed the wording to say they are based on data accessed by the query plan.
- The partition-processing Python example interpolated relation names returned as unquoted text. I changed the SQL that discovers partition names to return safely quoted schema-qualified identifiers.
- The batching example used `COMMIT` inside a `DO` block without noting the top-level execution requirement. I clarified that the `DO` block must not be run inside another transaction block.
- The shared buffer size estimate cast `current_setting('shared_buffers')` to `bigint` and multiplied by 8192. Because `current_setting` corresponds to `SHOW`, unit-formatted values can be returned. I changed it to use `pg_size_bytes(current_setting('shared_buffers'))`.
- The monitoring view included a `peak_locks` column that was just the current aggregate value, not a historical peak. I removed that misleading column from the view.

## Review Notes
The configuration recommendations are broad starting points rather than universal sizing rules. Future improvements could mention `max_pred_locks_per_relation` and `max_pred_locks_per_page` for serializable workloads, but the existing scope is technically valid after the fixes above.
