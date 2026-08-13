# Validation Summary: How Many PostgreSQL Partitions Are Too Many? Measure the Overhead

## Status
validated

## Post Type
Performance testing guide / technical reference

## Technologies Covered
- PostgreSQL 18
- Declarative table partitioning and subpartitioning
- PostgreSQL SQL and system catalogs
- Query planning, `EXPLAIN`, and partition pruning
- Prepared statements and custom versus generic plans
- Relation locking and lock-table sizing
- Backend memory contexts
- `pg_stat_statements`
- Partition maintenance and DDL

## Sources Consulted
- PostgreSQL table partitioning, including declarative partitioning, maintenance, pruning, and best practices: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL `pg_partition_tree` and related partition information functions: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-INFO-PARTITION
- PostgreSQL `EXPLAIN`: https://www.postgresql.org/docs/current/sql-explain.html
- PostgreSQL guide to interpreting `EXPLAIN`, including the scope of Planning Time: https://www.postgresql.org/docs/current/using-explain.html
- PostgreSQL `PREPARE`: https://www.postgresql.org/docs/current/sql-prepare.html
- PostgreSQL `pg_stat_statements`: https://www.postgresql.org/docs/current/pgstatstatements.html
- PostgreSQL `pg_backend_memory_contexts`: https://www.postgresql.org/docs/current/view-pg-backend-memory-contexts.html
- PostgreSQL server signaling functions, including `pg_log_backend_memory_contexts`: https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-SIGNAL
- PostgreSQL `pg_locks`: https://www.postgresql.org/docs/current/view-pg-locks.html
- PostgreSQL system information functions, including `pg_blocking_pids`: https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-INFO-SESSION
- PostgreSQL lock management configuration: https://www.postgresql.org/docs/current/runtime-config-locks.html
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL `lock_timeout`: https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT
- PostgreSQL system catalogs: https://www.postgresql.org/docs/current/catalogs.html
- PostgreSQL `pg_attribute`: https://www.postgresql.org/docs/current/catalog-pg-attribute.html
- PostgreSQL `pg_constraint`: https://www.postgresql.org/docs/current/catalog-pg-constraint.html
- PostgreSQL `pg_index`: https://www.postgresql.org/docs/current/catalog-pg-index.html

## Issues Found
- The measurement checklist grouped server parsing with planning even though PostgreSQL's reported `Planning Time` excludes parsing and rewriting. Added that limitation and separated parse/rewrite time from the reported planning time.
- The lock-count query filtered only by PID, so it counted every `pg_locks` lock type, including virtual transaction and transaction ID locks, despite being presented as a relation-lock count. Added `AND locktype = 'relation'` so the result measures relation locks as described.
- The lock-count example used an unbound `$1` parameter, so it was not directly runnable as ordinary SQL. Replaced it with an illustrative PID and a comment telling readers to substitute the target backend PID.
- The blocker function was written as the zero-argument `pg_blocking_pids()`, but PostgreSQL requires the blocked backend's PID. Changed the text to specify the documented `pg_blocking_pids(integer)` signature.
- The `pg_backend_memory_contexts` example did not mention its default access restriction and could fail for an ordinary role. Added that the view is readable by default only by superusers or roles with the privileges of `pg_read_all_stats`.
- The official `pg_partition_tree` link pointed to `functions-info.html`, where the referenced anchor does not exist. Updated it to the current System Administration Functions page at `functions-admin.html#FUNCTIONS-INFO-PARTITION`.

## Review Notes
- All SQL examples are syntactically valid. The partition-tree, index-count, non-executing `EXPLAIN`, memory-context, and catalog-count examples were also exercised successfully on a disposable PostgreSQL 14.17 instance and checked against the current PostgreSQL 18 documentation.
- Relation locks must be sampled while the target statement is active or before its transaction ends.
- `pg_partition_tree` reports the supplied root at level 0. The index-count query includes partitioned index objects on partitioned nodes as well as physical indexes on leaf partitions, which is appropriate for measuring the full hierarchy's catalog footprint.
- The claims about conditional scalability to a few thousand partitions, planning and per-session memory growth, executor-time pruning, initialization-pruned partitions still being locked, `max_locks_per_transaction`, and `pg_stat_statements.track_planning` match the current PostgreSQL documentation.
- After the documentation-link correction, all external links in the post resolve to the intended current PostgreSQL documentation pages.
