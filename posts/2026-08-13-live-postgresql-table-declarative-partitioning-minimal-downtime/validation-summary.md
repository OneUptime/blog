# Validation Summary: Convert a Live PostgreSQL Table to Partitioning With Minimal Downtime

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- PostgreSQL 18
- Declarative range partitioning
- Logical replication and change data capture (CDC)
- Replica identity and publications/subscriptions
- PostgreSQL dependency tracking and object identifiers (OIDs)
- Partitioned indexes and `ATTACH PARTITION`
- Sequence synchronization
- Snapshot-consistent backfills
- Data validation and dependency-aware cutovers

## Sources Consulted

- [PostgreSQL 18: Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL 18: CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html)
- [PostgreSQL 18: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL 18: CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html)
- [PostgreSQL 18: ALTER INDEX](https://www.postgresql.org/docs/current/sql-alterindex.html)
- [PostgreSQL 18: Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL 18: Logical Replication Architecture and Initial Snapshot](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL 18: Publications and Replica Identity](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL 18: CREATE PUBLICATION](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL 18: Subscriptions](https://www.postgresql.org/docs/current/logical-replication-subscription.html)
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL 18: Logical Replication Conflicts](https://www.postgresql.org/docs/current/logical-replication-conflicts.html)
- [PostgreSQL 18: pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL 18: Dependency Tracking](https://www.postgresql.org/docs/current/ddl-depend.html)
- [PostgreSQL 18: `pg_depend`](https://www.postgresql.org/docs/current/catalog-pg-depend.html)
- [PostgreSQL 18: Date/Time Functions and Operators](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL 18: Sequence Manipulation Functions](https://www.postgresql.org/docs/current/functions-sequence.html)
- [PostgreSQL 18: System Information Functions (`pg_get_serial_sequence`)](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL 18: Trigger Behavior](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL 18: Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html)
- [PostgreSQL 18: `lock_timeout`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-LOCK-TIMEOUT)

## Issues Found

- The table-scoped `pg_dump --schema-only --table=public.events` command could be read as a complete dependency inventory. Added the documented warning that `--table` does not automatically include every related object and directed readers to catalog inspection or a full database-wide schema-only dump.
- The dependency explanation stated too broadly that PostgreSQL dependencies refer to OIDs. Narrowed it to catalog-tracked dependencies such as parsed views and foreign keys, and documented that function bodies stored as string literals can resolve names at execution time without a tracked table dependency.
- The reverse-order dual-write example said an old snapshot row would overwrite a newer target row. A plain insert can instead fail on a uniqueness conflict; clarified that overwrite occurs under a blind upsert.
- The CDC protocol omitted `TRUNCATE`. Added allowed truncates to the ordered change stream, noted that row triggers do not capture `TRUNCATE`, and documented the `publish_via_partition_root = true` limitation for truncates issued directly against leaf partitions.
- The logical-replication discussion did not state that built-in subscriptions match tables by fully qualified name and therefore cannot replicate `public.events` directly into `public.events_new`. Added that restriction, limited the partition-root advice to a partitioned publisher, and clarified when a name-mapping CDC consumer is required.
- The logical-replication restrictions generalized the behavior of attaching existing rows to any published tree. Scoped the claim to a root published with `publish_via_partition_root = true`, which is the case documented by `CREATE PUBLICATION`.
- The monthly validation query grouped `timestamptz` values using the session `TimeZone`, so its buckets could differ from the UTC partition bounds. Changed it to truncate after conversion to UTC and stated that equivalent source and target results must be compared at the same captured or fenced change position.
- The `ATTACH PARTITION` explanation overstated schema, constraint, and index compatibility requirements and did not identify the exact lock modes. Replaced it with PostgreSQL's actual column, type, `NOT NULL`, and inheritable `CHECK` requirements; documented automatic creation or attachment of corresponding indexes and key constraints; and specified the parent, attached-table, and default-partition locks.

## Review Notes

- PostgreSQL 18 is the current supported release on the validation date; PostgreSQL 19 is still in beta. The post's `/docs/current/` links currently resolve to version 18 documentation.
- The `setval` example is intentionally conditional. In the shown target DDL, `event_id` is a plain `bigint`, so the example applies only if the production schema actually associates that column with a serial or identity sequence, as the post now already states.
- The primary key is valid for the shown range-partitioned table because it includes the partition key, `occurred_at`.
- All external links present in the post returned successful HTTP responses during validation.
