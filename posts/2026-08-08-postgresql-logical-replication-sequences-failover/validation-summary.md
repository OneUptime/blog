# Validation Summary: Prepare PostgreSQL Sequences for Logical Replication Failover

## Status
validated

## Post Type
Operational guide and failover runbook

## Technologies Covered

- PostgreSQL 18
- PostgreSQL built-in logical replication, publications, and subscriptions
- Sequences, `serial`, and identity columns
- PostgreSQL system catalogs, statistics views, and sequence functions
- WAL locations, replication slots, row-level security, and `pg_dump`

## Sources Consulted

- [PostgreSQL logical replication overview](https://www.postgresql.org/docs/current/logical-replication.html)
- [PostgreSQL logical replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)
- [PostgreSQL logical replication architecture](https://www.postgresql.org/docs/current/logical-replication-architecture.html)
- [PostgreSQL logical replication conflicts](https://www.postgresql.org/docs/current/logical-replication-conflicts.html)
- [PostgreSQL subscription management and replication slots](https://www.postgresql.org/docs/current/logical-replication-subscription.html)
- [PostgreSQL `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/current/sql-altersubscription.html)
- [PostgreSQL `pg_stat_subscription`](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION)
- [PostgreSQL `pg_subscription_rel`](https://www.postgresql.org/docs/current/catalog-pg-subscription-rel.html)
- [PostgreSQL sequence manipulation functions](https://www.postgresql.org/docs/current/functions-sequence.html)
- [PostgreSQL `CREATE SEQUENCE`](https://www.postgresql.org/docs/current/sql-createsequence.html)
- [PostgreSQL `ALTER SEQUENCE`](https://www.postgresql.org/docs/current/sql-altersequence.html)
- [PostgreSQL identity columns](https://www.postgresql.org/docs/current/ddl-identity-columns.html)
- [PostgreSQL system information functions](https://www.postgresql.org/docs/current/functions-info.html)
- [PostgreSQL `pg_sequences`](https://www.postgresql.org/docs/current/view-pg-sequences.html)
- [PostgreSQL `pg_class`](https://www.postgresql.org/docs/current/catalog-pg-class.html)
- [PostgreSQL `ALTER VIEW`](https://www.postgresql.org/docs/current/sql-alterview.html)
- [PostgreSQL row security policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL 18 sequence ownership implementation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/commands/sequence.c)
- [PostgreSQL 19 sequence replication (development documentation)](https://www.postgresql.org/docs/19/logical-replication-sequences.html)

## Issues Found

- The owned-sequence inventory excluded sequences owned by view columns. PostgreSQL permits a sequence to be `OWNED BY` a view column, and an updatable view can have a column default that calls `nextval()`. Added the `v` relation kind to the inventory query and corrected the coverage description.
- The sentinel procedure did not account for tables still undergoing initial synchronization in separate table-synchronization workers. Added a `pg_subscription_rel` readiness check and required every known subscribed relation to have `srsubstate = 'r'` before relying on the sentinel.
- Sentinel visibility was described as proving that all earlier published transactions had applied. PostgreSQL can manually skip an entire transaction, and missing-row `UPDATE` or `DELETE` conflicts skip individual changes automatically. Revised the claim to say the apply stream has advanced past the earlier transactions and made the skip caveat explicit.

## Review Notes

- The post was validated against PostgreSQL 18, the current stable documentation on 2026-08-08. PostgreSQL 19 Beta 2 introduces explicit initial and manual sequence synchronization, but publisher sequence advances can still leave subscriber sequences out of sync; the post's write-fenced cutover guidance remains relevant.
- `pg_sequences.last_value` can also be `NULL` for an unlogged sequence on a physical standby. That case does not affect the logical-subscriber runbook described here.
- With sequence caching, `last_value` can be greater than the last value handed to a caller. Using it as an upper bound in this runbook is conservative.
