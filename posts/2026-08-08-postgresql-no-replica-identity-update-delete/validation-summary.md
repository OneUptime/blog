# Validation Summary: Fix No Replica Identity Errors in PostgreSQL Logical Replication

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- PostgreSQL logical replication
- Publications and subscriptions
- Replica identity modes: `DEFAULT`, `USING INDEX`, `FULL`, and `NOTHING`
- Primary keys, unique indexes, and partitioned tables
- PostgreSQL system catalogs and monitoring views
- Write-ahead log (WAL) measurement

## Sources Consulted

- [PostgreSQL 18: Publications and replica identity](https://www.postgresql.org/docs/current/logical-replication-publication.html)
- [PostgreSQL 18: `ALTER TABLE`](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL 18: `CREATE PUBLICATION`](https://www.postgresql.org/docs/current/sql-createpublication.html)
- [PostgreSQL 18: Logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL 18: Logical replication column lists](https://www.postgresql.org/docs/current/logical-replication-col-lists.html)
- [PostgreSQL 18: Logical replication row filters](https://www.postgresql.org/docs/current/logical-replication-row-filter.html)
- [PostgreSQL 18: Logical replication architecture](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL 18: Logical replication protocol message formats](https://www.postgresql.org/docs/current/protocol-logicalrep-message-formats.html)
- [PostgreSQL 18: `pg_class`, `pg_index`, and `pg_attribute`](https://www.postgresql.org/docs/current/catalog-pg-class.html), [index catalog](https://www.postgresql.org/docs/current/catalog-pg-index.html), and [attribute catalog](https://www.postgresql.org/docs/current/catalog-pg-attribute.html)
- [PostgreSQL 18: Publication catalogs and `pg_publication_tables`](https://www.postgresql.org/docs/current/catalog-pg-publication.html), [publication relation catalog](https://www.postgresql.org/docs/current/catalog-pg-publication-rel.html), [publication namespace catalog](https://www.postgresql.org/docs/current/catalog-pg-publication-namespace.html), and [publication tables view](https://www.postgresql.org/docs/current/view-pg-publication-tables.html)
- [PostgreSQL 14 and 15: `pg_publication_tables` version differences](https://www.postgresql.org/docs/14/view-pg-publication-tables.html) and [PostgreSQL 15 view](https://www.postgresql.org/docs/15/view-pg-publication-tables.html)
- [PostgreSQL 16, 17, and 18: `pg_stat_subscription` version differences](https://www.postgresql.org/docs/16/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION), [PostgreSQL 17 view](https://www.postgresql.org/docs/17/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION), and [current view](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION)
- [PostgreSQL 18: `CREATE INDEX`](https://www.postgresql.org/docs/current/sql-createindex.html) and [table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [PostgreSQL 18: Transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [PostgreSQL 18: WAL location functions](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADMIN-BACKUP)
- [PostgreSQL 16 and 17 release notes](https://www.postgresql.org/docs/16/release-16.html) and [PostgreSQL 17 release notes](https://www.postgresql.org/docs/17/release-17.html)

## Issues Found

- The effective-publication guidance mentioned `pg_get_publication_tables()` without its required publication-name argument and did not identify its release-sensitive signature. The shown `pg_publication_tables` query also selects `attnames` and `rowfilter`, which are unavailable in PostgreSQL 14, and its exact table-name filter can miss partition leaves or an effective published ancestor. Removed the function reference, scoped the view query to PostgreSQL 15 and later, and required checking relevant root and leaf names.
- The candidate-index query claimed to inventory nullable, expression, and deferrable candidates but did not expose those properties. Added `indimmediate`, an expression flag, and a check of `attnotnull` across the semantic key columns identified by `indnkeyatts`. Nullable `INCLUDE` payload columns are intentionally excluded from that check.
- The post stated that a replica-identity value must remain stable for queued changes. PostgreSQL supports updates that change replica-identity columns by carrying the old key and the new tuple. Changed stability from a requirement to a recommendation while retaining the uniqueness requirement.
- Adding a primary key does not reset an explicitly selected `REPLICA IDENTITY NOTHING`, `FULL`, or `USING INDEX` mode. Added `ALTER TABLE ... REPLICA IDENTITY DEFAULT` after attaching the primary key so the repair also works when the table was not already in `DEFAULT` mode.
- The post required the same primary key on each subscriber. PostgreSQL instead requires a compatible subscriber replica identity with the same or fewer columns when the publisher identity is not `FULL`; that identity can be a qualifying unique index. Corrected the requirement.
- The unique-index option said selecting a replica identity only changes WAL and does not change application semantics. It can also change whether a published table permits updates and deletes. Replaced the overbroad claim with the precise constraint and replication effects.
- The concurrent-index and `PRIMARY KEY USING INDEX` recipe was presented without its partitioned-table limitations. Added that these operations are unsupported on a partitioned parent, that indexes must be handled per partition, and that a parent primary or unique key must include every partition-key column. Also clarified that `publish_via_partition_root` uses the topmost partitioned ancestor included in the publication.
- The original canary ran `INSERT`, `UPDATE`, and `DELETE` in one transaction. A subscriber cannot expose the intermediate states, and the final absent row is indistinguishable from no replication. Changed the procedure to commit and verify each operation separately and required canary values to satisfy applicable row filters.
- The worker query uses `pg_stat_subscription.worker_type`, which exists only in PostgreSQL 17 and later. Added the version scope and changed “worker health” to the more accurate “worker activity.”

## Review Notes

- The corrected SQL and DDL snippets were exercised against PostgreSQL 18. The primary-key mode behavior was also reproduced: a table left in `REPLICA IDENTITY NOTHING` continued rejecting published updates after a primary key was attached until `REPLICA IDENTITY DEFAULT` was set.
- Subscriber index-assisted lookup for `REPLICA IDENTITY FULL` is version-sensitive: B-tree lookup was added in PostgreSQL 16 and hash lookup in PostgreSQL 17. The post explicitly says “Current PostgreSQL,” so its B-tree-or-hash statement is correct for PostgreSQL 18.
- `CREATE INDEX CONCURRENTLY` must run outside an explicit transaction block. Attaching the completed index as a constraint still takes the lock required by `ALTER TABLE`, although it is normally fast when no `NOT NULL` scan is required.
- `pg_current_wal_lsn()` measures the cluster-wide WAL write position, so before-and-after comparisons should use comparable workloads and account for unrelated WAL activity.
