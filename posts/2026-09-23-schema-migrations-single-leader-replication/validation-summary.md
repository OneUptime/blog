# Validation Summary: How to Run Schema Migrations Safely with Single-Leader Replication

## Status

validated

## Post Type

Technical guide with PostgreSQL SQL examples and deployment procedures.

## Technologies Covered

- PostgreSQL 18 schema migrations and transactional DDL
- Physical streaming replication, WAL positions, and replica replay
- Logical replication and publication column lists
- Lock and statement timeouts
- Concurrent index creation and system catalog inspection
- Application deployment compatibility, rollback, and database failover

## Sources Consulted

- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html) — column addition, locking, table rewrites, and constraint validation.
- [PostgreSQL 18: SET](https://www.postgresql.org/docs/18/sql-set.html) — transaction-local settings and syntax.
- [PostgreSQL 18: Client Connection Defaults](https://www.postgresql.org/docs/18/runtime-config-client.html) — lock and statement timeout behavior and units.
- [PostgreSQL 18: Explicit Locking](https://www.postgresql.org/docs/18/explicit-locking.html) — conflicting lock modes, transaction duration, and advisory locking.
- [PostgreSQL 18: ROLLBACK TO SAVEPOINT](https://www.postgresql.org/docs/18/sql-rollback-to.html) — recovery from transaction errors.
- [PostgreSQL 18: System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html) — WAL insertion, write, and replay positions; recovery status; NULL results.
- [PostgreSQL 18: pg_lsn Type](https://www.postgresql.org/docs/18/datatype-pg-lsn.html) — LSN representation, casts, and comparison operators.
- [PostgreSQL 18: Asynchronous Commit](https://www.postgresql.org/docs/18/wal-async-commit.html) — commit acknowledgment before WAL reaches durable storage.
- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html) — physical WAL replay, streaming replication delays, and promotion.
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/18/continuous-archiving.html#BACKUP-TIMELINES) — branching WAL histories and timeline identity.
- [PostgreSQL 18: CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html) — concurrent builds, transaction restrictions, invalid indexes, and recovery options.
- [PostgreSQL 18: pg_index](https://www.postgresql.org/docs/18/catalog-pg-index.html) — indexrelid, indisready, and indisvalid.
- [PostgreSQL 18: System Information Functions and Operators](https://www.postgresql.org/docs/18/functions-info.html) — to_regclass name resolution and missing-relation behavior.
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html) — DDL exclusion and subscriber schema compatibility.
- [PostgreSQL 18: Logical Replication Column Lists](https://www.postgresql.org/docs/18/logical-replication-col-lists.html) — published columns and subscriber requirements.
- [Author GitHub profile](https://github.com/nawazdhandala) — verified the post's author link resolves to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed all five SQL blocks against PostgreSQL 18 documentation. No deprecated functions or invalid syntax were identified. There are no terminal commands or standalone configuration snippets to validate. The README was left unchanged.
- The nullable text column addition avoids a table rewrite but requires an ACCESS EXCLUSIVE lock. The transaction-local timeout settings are valid; the lock timeout is shorter than the statement timeout, and the post correctly requires rollback and controlled retry after failure.
- Capturing the WAL insertion position after a successful DDL commit provides a conservative replay barrier, including when local commit acknowledgment precedes WAL writing. This follows from the documented insertion-position and asynchronous-commit semantics. Replay readiness remains specific to the checked replica and its replication history.
- The replay comparison can return NULL. The gate must accept only an affirmative readiness result, as required by the post's instruction that missing positions fail the gate. The returned recovery status and topology must also be checked; a numeric LSN comparison alone does not establish valid failover history.
- Concurrent index creation must run outside a transaction block. The catalog query correctly checks readiness and validity, and to_regclass safely returns NULL for a missing relation. These flags do not verify the index definition, consistent with the post's warning about existing names.
- The index example assumes an ordinary, nonpartitioned table and an appropriate search_path. PostgreSQL 18 does not support CREATE INDEX CONCURRENTLY directly on a partitioned parent; deployments using partitioned orders tables need the documented per-partition approach.
- Logical DDL must be coordinated separately. Additive subscriber changes can often precede publisher changes, and publication column lists affect which columns subscribers must provide. The post correctly avoids treating physical and logical replication as interchangeable.
- Migration serialization, bounded backfills, compatibility inventory, and failure rehearsals are sound operational guidance. Their concrete implementation depends on the migration runner and deployment infrastructure, neither of which is specified here.
- All four PostgreSQL links in the post resolve to the intended version 18 documentation. The author link also resolves. This was a documentation-based review; SQL execution and multi-node failure scenarios were not tested against a running PostgreSQL cluster.
