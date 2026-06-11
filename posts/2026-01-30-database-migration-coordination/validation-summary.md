# Validation Summary: How to Build Database Migration Coordination

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL schema migrations, constraints, locks, transactions, indexes, views, and PL/pgSQL
- Node.js and TypeScript
- node-postgres (`pg`)
- Prometheus metrics with `prom-client`
- Blue-green and expand/migrate/contract deployment patterns

## Sources Consulted
- PostgreSQL documentation: Explicit Locking and Advisory Locks - https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL documentation: CREATE INDEX - https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL documentation: ALTER TABLE - https://www.postgresql.org/docs/current/sql-altertable.html
- node-postgres documentation: Transactions - https://node-postgres.com/features/transactions
- node-postgres documentation: Pool API - https://node-postgres.com/apis/pool
- prom-client README and API examples - https://github.com/siimon/prom-client
- Prometheus documentation: Metric Types - https://prometheus.io/docs/concepts/metric_types/

## Issues Found
- The lock acquisition text said the SQL used advisory locks, but the function relied on a unique constraint and `unique_violation` handling. Updated the explanation to match the implementation.
- The migration runner queried and inserted into `schema_migrations`, but the post did not define that table. Added a minimal `schema_migrations` schema.
- The TypeScript migration runner imported `fs` and `path` without using them. Removed the unused imports so the snippet works in projects with `noUnusedLocals` enabled.
- `executeMigration` was marked `private`, but the metrics example calls it from outside `MigrationRunner`. Made it public so the metrics example type-checks.
- The chunked migration example referenced `Pool`, `getProgress`, `saveProgress`, and `sleep` without declarations, and its original `lastId + batchSize` progress update could skip rows or stop early when IDs are sparse. Added the missing declarations and changed the batch callback to return an explicit last processed ID and completion flag.
- The archive-table example selected `archived_at` from `users`, which may not exist and would fail for the intended archive timestamp. Changed it to `NOW() AS archived_at`.

## Review Notes
- The explicit `idx_migration_locks_name` index is redundant because the `UNIQUE` constraint on `lock_name` already creates an index in PostgreSQL, but it is not technically incorrect.
- The migration runner intentionally wraps normal migrations in a transaction. PostgreSQL operations such as `CREATE INDEX CONCURRENTLY` must be handled outside that transaction, which the post separately addresses under long-running migrations.
