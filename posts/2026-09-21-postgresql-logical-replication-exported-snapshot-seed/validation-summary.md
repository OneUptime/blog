# Validation Summary: How to Seed PostgreSQL Logical Replication Safely from an Exported Snapshot

## Status

validated

## Post Type

Tutorial / database migration guide with SQL and shell commands.

## Technologies Covered

- PostgreSQL 18 logical replication, publications, subscriptions, and `pgoutput`.
- Replication slots, exported snapshots, and write-ahead logging (WAL).
- `pg_dump`, `psql`, SQL privileges, and libpq TLS connections.

## Sources Consulted

- [PostgreSQL 18 streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html): replication connections, slot creation syntax, snapshot lifetime, and streaming start position.
- [Logical decoding concepts](https://www.postgresql.org/docs/18/logicaldecoding-explanation.html): snapshot/stream consistency, persistent slots, consumers, and resource retention.
- [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html): existing slots, initial copying, disabled creation, permissions, and authentication.
- [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html): enabling replication.
- [pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html): all dump flags, snapshot import, and table selection.
- [psql](https://www.postgresql.org/docs/18/app-psql.html): connection arguments, startup-file suppression, script execution, error handling, and transaction wrapping.
- [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html): publisher and subscriber permissions.
- [Logical replication configuration](https://www.postgresql.org/docs/18/logical-replication-config.html): WAL level, slots, senders, and workers.
- [CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html): publication syntax, default published operations, and replica identity requirements.
- [CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html) and [GRANT](https://www.postgresql.org/docs/18/sql-grant.html): table definition and schema/table grants.
- [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) and [pg_subscription](https://www.postgresql.org/docs/18/catalog-pg-subscription.html): verification query columns, join, and ready state.
- [pg_replication_slots](https://www.postgresql.org/docs/18/view-pg-replication-slots.html): retained WAL, confirmed consumption, and invalidation reasons.
- [libpq SSL support](https://www.postgresql.org/docs/18/libpq-ssl.html): `sslmode=verify-full` and certificate verification.
- [Author profile](https://github.com/nawazdhandala): checked the post's author link and redirect.

## Issues Found

1. The introduction described the gap as applying generally to an ordinary dump followed by a new logical subscription. A default subscription copies existing data itself; restoring a dump first can instead cause duplicate-data conflicts. Qualified the sentence to specify a manually seeded subscription with `copy_data = false` and a slot created after the dump. This makes the claim match the failure scenario addressed by the tutorial.

No other technical errors were found within the stated single-table scope. All code examples were retained.

## Review Notes

- Verified the PostgreSQL 18 replication command syntax, returned fields, snapshot lifetime, and persistent-slot behavior. Holding terminal A open without additional commands through the dump safely preserves snapshot availability.
- Verified that the exported snapshot and its untouched slot form the intended consistent handoff. Reusing the slot with initial copying disabled is appropriate for the manually restored seed.
- Verified the dump options and transactional restore. `ON_ERROR_STOP=1` with `--single-transaction` rolls back this table-data restore on an SQL error.
- The primary key supplies the replica identity needed for updates and deletes. The shown schema avoids generated columns, sequences, partitioning, and other extensions beyond the stated scope.
- Running subscription creation outside a transaction is valid, although `create_slot = false` does not itself require that restriction. The default connection behavior still discovers publication tables when the subscription is created disabled.
- Credentials and TLS trust must already be configured as assumed. For a non-superuser subscription owner, the default `password_required = true` requires a password in the connection string; a superuser-owned subscription is exempt. The subscriber owner must also have the documented table-owner role access.
- Readiness and row counts alone do not establish data equality. The proposed concurrent insert/update/delete rehearsal, catch-up, controlled comparison, and canary provide complementary checks.
- PostgreSQL 18 can invalidate inactive slots through `idle_replication_slot_timeout`; WAL retention limits can also make a slot unusable. These fit the post's instruction to monitor and restart with a fresh slot/snapshot pair after invalidation. Abandoned slots should be dropped when no longer needed.
- The linked PostgreSQL documentation pages resolve to the intended version-specific resources. No deprecated syntax was identified.
- This was a documentation-based technical review. No live publisher/subscriber deployment or end-to-end replication rehearsal was executed.
