# Validation Summary: How to Rename PostgreSQL Tables Without Losing Logical Replication Changes

## Status
validated

## Post Type
Technical guide with SQL examples and a coordinated database maintenance procedure.

## Technologies Covered
- PostgreSQL 18 SQL and transactional DDL.
- Built-in logical replication, publications, subscriptions, and replication slots.
- Replication barriers, writer fencing, initial synchronization, and apply monitoring.
- Table identity, ownership, permissions, and lock timeouts.

## Sources Consulted
- [Logical replication subscriptions](https://www.postgresql.org/docs/18/logical-replication-subscription.html): schema-qualified table matching and subscription lifecycle.
- [Logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html): transactional apply order and initial synchronization.
- [Logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html): DDL is not replicated and partition mapping requires care.
- [ALTER SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-altersubscription.html): refresh options, transaction restrictions, two-phase restrictions, enable/disable behavior, and skipping changes.
- [CREATE SUBSCRIPTION](https://www.postgresql.org/docs/18/sql-createsubscription.html): subscription settings, including two-phase replication and apply privileges.
- [pg_subscription_rel](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html): relation OIDs and synchronization state codes.
- [pg_stat_subscription](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION): worker types, process IDs, relation IDs, and received LSN.
- [CREATE PUBLICATION](https://www.postgresql.org/docs/18/sql-createpublication.html) and [ALTER PUBLICATION](https://www.postgresql.org/docs/18/sql-alterpublication.html): table membership, publication scope, and published DML operations.
- [Logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) and [GRANT](https://www.postgresql.org/docs/18/sql-grant.html): publisher copy privileges and subscriber apply permissions.
- [ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html): rename syntax, locking, and preservation of stored data.
- [pg_publication_rel](https://www.postgresql.org/docs/18/catalog-pg-publication-rel.html) and [pg_publication_tables](https://www.postgresql.org/docs/18/view-pg-publication-tables.html): OID-based membership and publication inspection columns.
- [Client connection defaults](https://www.postgresql.org/docs/18/runtime-config-client.html) and [SET](https://www.postgresql.org/docs/18/sql-set.html): lock timeout semantics and transaction-local settings.
- [CREATE TABLE](https://www.postgresql.org/docs/18/sql-createtable.html), [INSERT](https://www.postgresql.org/docs/18/sql-insert.html), [date/time functions](https://www.postgresql.org/docs/18/functions-datetime.html), and [object identifier types](https://www.postgresql.org/docs/18/datatype-oid.html): barrier schema, default timestamp, marker insertion, and regclass casts.
- PostgreSQL 18 source: [subscriptioncmds.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/subscriptioncmds.c), particularly `AlterSubscription_refresh`, and [tablecmds.c](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/tablecmds.c), particularly `RenameRelationInternal`: checked local OID matching during refresh and preservation of relation identity during rename.

## Issues Found
- **Missing publication prerequisites.** The barrier depends on publishing inserts, while `ADD TABLE` assumes a publication whose membership can be managed explicitly. Added those assumptions so readers do not apply the example unchanged to incompatible publication settings.
- **Missing subscriber barrier permissions.** The publisher-side `SELECT` grant does not authorize subscriber apply. Added instructions to use the existing replicated table's owner for the barrier, or grant the subscription owner the necessary table privileges when `run_as_owner = true`.
- **Two-phase refresh restriction omitted.** The initial `copy_data = true` refresh fails when two-phase replication is enabled. Explicitly scoped that example to `two_phase = false`.
- **Transaction boundaries were implicit.** Added instructions to execute individual statements in autocommit mode except for the explicit rename transactions, and identified refresh as requiring execution outside a transaction block. This makes marker commits and worker shutdown sequencing unambiguous.
- **Ready-state check was underspecified.** Identified `srsubstate = 'r'` as the required result for both tables; completion of the copy alone is insufficient for the barrier argument.
- **Canary connection location was ambiguous.** Specified committing the final marker and canary on the publisher so the checks demonstrate replication to subscribers.

## Review Notes
- The central procedure is correct: fence relevant writers, resolve existing transactions, observe a unique committed barrier through the same ready subscription, stop workers, rename both existing objects, then resume and verify before releasing writers.
- The rename preserves relation OIDs. Publication membership remains attached to the source object, and refresh recognizes the renamed subscriber object by its existing local OID. No replacement slot or table copy is required for this coordinated rename.
- The PostgreSQL 18 monitoring columns used in the post are valid. `received_lsn` describes receipt, so it is not a substitute for observing the applied marker.
- `lock_timeout` bounds each lock acquisition wait, rather than the total maintenance window. The post's statement about a blocked rename failing promptly is accurate.
- The marker establishes an apply boundary for the subscribed changes; it does not audit historical consistency or recover previously skipped transactions. The existing requirement to resolve all relevant transactions and keep the fence active remains essential.
- Partitioned deployments need to account for leaf-table versus partition-root publication mapping. The guide assumes the named table is the relation being replicated and checked for readiness.
- Checked all original documentation links and the author profile link; they resolve to the intended resources. No deprecated syntax was identified for PostgreSQL 18.
- Validation was based on official documentation and PostgreSQL 18 source inspection. No live publisher/subscriber integration test was performed.
