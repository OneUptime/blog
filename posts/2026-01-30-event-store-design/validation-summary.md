# Validation Summary: How to Build Event Store Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Event sourcing and event store design
- PostgreSQL schema design, JSONB, transactions, advisory locks, partitioning, triggers, LISTEN/NOTIFY
- TypeScript
- Node.js node-postgres (`pg`)
- Projection and snapshot patterns

## Sources Consulted
- PostgreSQL SELECT documentation: https://www.postgresql.org/docs/current/sql-select.html
- PostgreSQL explicit locking and advisory locks documentation: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL table partitioning documentation: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL LISTEN documentation: https://www.postgresql.org/docs/current/sql-listen.html
- PostgreSQL NOTIFY documentation: https://www.postgresql.org/docs/current/sql-notify.html
- node-postgres transactions documentation: https://node-postgres.com/features/transactions
- node-postgres Client API documentation: https://node-postgres.com/apis/client

## Issues Found
- The append implementation used `SELECT COALESCE(MAX(stream_position), 0) ... FOR UPDATE`. PostgreSQL does not allow locking clauses such as `FOR UPDATE` with aggregation, and this would not serialize concurrent writes to an empty stream. Replaced it with a transaction-scoped advisory lock using `pg_advisory_xact_lock(...)`, then read the current stream version without `FOR UPDATE`.
- The aggregate rehydration example tracked replay state in a local variable but called `aggregate.apply(event)` without passing that state. Updated the aggregate interface and replay loop to call `apply(state, event)` so the code accurately replays from the snapshot state.
- The projection code referenced `projection_checkpoints` but did not define the table. Added the checkpoint table schema used by the sample code.
- The subscription example performed catch-up before issuing `LISTEN`, which can miss notifications committed between catch-up and listener registration. Updated the example to register notification handling, execute `LISTEN`, then catch up from the durable event log.
- The partitioned table example could be read as preserving the original `(stream_id, stream_position)` uniqueness invariant. Added a PostgreSQL partitioning caveat explaining that unique constraints on partitioned tables must include the partition key, so per-stream version uniqueness needs separate enforcement or a different partitioning strategy.
- The key takeaways claimed global ordering enables exactly-once projections. Reworded this to ordered, resumable projections because exactly-once processing also requires idempotency or transactional checkpoint/read-model updates.

## Review Notes
The corrected examples are appropriate for a conceptual guide, but production implementations should also define read-model table schemas, make projection handlers idempotent, handle subscription errors and reconnection, and consider a dedicated stream metadata/version table for stronger concurrency and partitioning guarantees.
