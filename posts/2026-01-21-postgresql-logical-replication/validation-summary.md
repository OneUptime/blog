# Validation Summary: How to Configure PostgreSQL Logical Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL logical replication
- Publications and subscriptions
- Replication slots and WAL sender configuration
- PostgreSQL system catalogs and monitoring views
- Replication conflict handling

## Sources Consulted
- PostgreSQL Documentation: Logical Replication - https://www.postgresql.org/docs/current/logical-replication.html
- PostgreSQL Documentation: CREATE PUBLICATION - https://www.postgresql.org/docs/current/sql-createpublication.html
- PostgreSQL Documentation: CREATE SUBSCRIPTION - https://www.postgresql.org/docs/current/sql-createsubscription.html
- PostgreSQL Documentation: ALTER SUBSCRIPTION - https://www.postgresql.org/docs/current/sql-altersubscription.html
- PostgreSQL Documentation: Logical Replication Configuration Settings - https://www.postgresql.org/docs/current/logical-replication-config.html
- PostgreSQL Documentation: Logical Replication Conflicts - https://www.postgresql.org/docs/current/logical-replication-conflicts.html
- PostgreSQL Documentation: Logical Replication Restrictions - https://www.postgresql.org/docs/current/logical-replication-restrictions.html
- PostgreSQL Documentation: Logical Replication Architecture - https://www.postgresql.org/docs/current/logical-replication-architecture.html
- PostgreSQL Documentation: Monitoring Statistics - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL 15 Release Notes - https://www.postgresql.org/docs/release/15.0/
- PostgreSQL 16 Release Notes - https://www.postgresql.org/docs/release/16.0/

## Issues Found
- The prerequisites implied all examples work on PostgreSQL 10+. Updated the prerequisite note and added inline version caveats for `FOR TABLES IN SCHEMA`, `ALTER SUBSCRIPTION ... SKIP`, and `origin = none`, which require newer PostgreSQL releases.
- The subscriber configuration used `max_replication_slots`, but PostgreSQL's subscriber-side logical replication setting is `max_active_replication_origins`. Replaced it with the correct setting.
- The two `CREATE SUBSCRIPTION` examples reused the same subscription name, which would fail if run as written. Renamed the second example to `my_subscription_with_options`.
- The publication details section queried `pg_stat_publication`, which is not a PostgreSQL statistics view. Replaced it with `pg_stat_replication` for publisher-side replication activity.
- The conflict-handling example advanced the replication origin directly without disabling the subscription and used the conflicting finish LSN rather than the next LSN required by `pg_replication_origin_advance()`. Added the documented `ALTER SUBSCRIPTION ... SKIP` form and corrected the origin-advance workflow.
- The trigger-based conflict example defined only a trigger function. Added the trigger creation, enabled it for replication apply, and changed the function so non-conflicting inserts still proceed.
- The subscriber monitoring query selected `relname` from an invalid join. Updated it to join `pg_stat_subscription.relid` to `pg_class.oid`.

## Review Notes
- The guide remains a high-level tutorial. Production multi-directional logical replication still needs explicit conflict-resolution rules; `origin = none` prevents loops but does not resolve concurrent writes.
- Sequence state is not replicated by PostgreSQL logical replication, so migrations that promote a subscriber should also synchronize sequences.
