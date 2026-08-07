# Validation Summary: Fix Duplicate-Key Conflicts in PostgreSQL Logical Replication

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- PostgreSQL 18
- Built-in logical replication, publications, subscriptions, and replication slots
- Logical replication conflict logging and statistics
- PostgreSQL system catalogs and monitoring views
- PostgreSQL sequences, serial columns, and identity columns
- SQL locking, role privileges, and read-only session defaults

## Sources Consulted

- [PostgreSQL 18: Logical Replication Conflicts](https://www.postgresql.org/docs/18/logical-replication-conflicts.html)
- [PostgreSQL 18: Logical Replication Restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html)
- [PostgreSQL 18: Logical Replication Subscription and Slot Management](https://www.postgresql.org/docs/18/logical-replication-subscription.html)
- [PostgreSQL 18: Logical Replication Architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html)
- [PostgreSQL 18: Logical Replication Security](https://www.postgresql.org/docs/18/logical-replication-security.html)
- [PostgreSQL 18: `pg_stat_subscription` and `pg_stat_subscription_stats`](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION)
- [PostgreSQL 18: `pg_subscription`](https://www.postgresql.org/docs/18/catalog-pg-subscription.html)
- [PostgreSQL 18: `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-altersubscription.html)
- [PostgreSQL 18: Sequence Manipulation Functions](https://www.postgresql.org/docs/18/functions-sequence.html)
- [PostgreSQL 18: `CREATE SEQUENCE`](https://www.postgresql.org/docs/18/sql-createsequence.html)
- [PostgreSQL 18: System Information Functions](https://www.postgresql.org/docs/18/functions-info.html)
- [PostgreSQL 18: `pg_index`](https://www.postgresql.org/docs/18/catalog-pg-index.html)
- [PostgreSQL 18: `LOCK`](https://www.postgresql.org/docs/18/sql-lock.html)
- [PostgreSQL 18: `ALTER ROLE`](https://www.postgresql.org/docs/18/sql-alterrole.html)
- [PostgreSQL 18: `REVOKE`](https://www.postgresql.org/docs/18/sql-revoke.html)
- [PostgreSQL 18: Client Connection Defaults](https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-DEFAULT-TRANSACTION-READ-ONLY)
- [PostgreSQL 18: Privileges](https://www.postgresql.org/docs/18/ddl-priv.html)

## Issues Found

- The conflict-classification sentence treated every single unique violation alike and omitted `multiple_unique_conflicts`. It now states that PostgreSQL 18 reports violations of one `NOT DEFERRABLE` unique constraint as `insert_exists` or `update_exists`, while violations of multiple such constraints are `multiple_unique_conflicts`, matching the PostgreSQL 18 conflict documentation.
- A cause listed two publications as writing overlapping keys into one subscriber table. Publications define change sets; subscriptions receive and apply those changes. The text now attributes the overlapping writes to two subscriptions applying changes from publishers.
- The description of detailed conflict logging referred broadly to “current releases,” although the specific structured conflict types, row detail, and counters discussed are PostgreSQL 18 behavior. The statement is now explicitly scoped to PostgreSQL 18.
- The `pg_subscription` inventory query filtered only by subscription name even though that catalog is shared across every database in the cluster and subscription names can repeat in different databases. It now also filters `subdbid` to the current database.
- The sequence-reset example used `1` for an empty table but described its assumptions only as a positive increment of one. It now explicitly assumes a sequence starting at 1 and notes that custom start or minimum values require adaptation.

## Review Notes

- All SQL statements and referenced PostgreSQL 18 catalog/view columns were checked and are valid, including `ALTER SUBSCRIPTION ... DISABLE`, `ENABLE`, and `SKIP`, `subskiplsn`, `worker_type`, `apply_error_count`, and the `confl_*` counters used in the post.
- The warnings that `SKIP` requires the remote transaction's finish LSN, skips the entire transaction, and may lack a logged finish LSN with parallel streaming accurately reflect the PostgreSQL 18 documentation.
- The sequence guidance correctly distinguishes replicated column values from non-replicated sequence state, explains `currval()` session scope, uses the three-argument `setval()` form without an off-by-one error, and notes that sequence changes are not rolled back with the surrounding transaction.
- The locking, privilege-revocation, and per-role `default_transaction_read_only` syntax is current for PostgreSQL 18. No deprecated commands or invalid external links were found.
