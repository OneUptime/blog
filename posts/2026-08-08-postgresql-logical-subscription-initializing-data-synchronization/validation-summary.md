# Validation Summary: Diagnose PostgreSQL Logical Subscription Initial Synchronization

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- PostgreSQL 18
- PostgreSQL logical replication, publications, and subscriptions
- Initial table synchronization and `COPY`
- PostgreSQL system catalogs and statistics views
- Logical replication slots, WAL senders, and replication origins
- PostgreSQL roles, privileges, row-level security, and trigger modes
- `pg_dump` and SQL diagnostics

## Sources Consulted
- [PostgreSQL 18 logical replication architecture](https://www.postgresql.org/docs/18/logical-replication-architecture.html) - initial snapshot, table synchronization workers, trigger behavior, catch-up, and handoff to the apply worker.
- [PostgreSQL 18 subscriptions and replication-slot management](https://www.postgresql.org/docs/18/logical-replication-subscription.html) - schema matching, text conversion, generated synchronization-slot names, slot cleanup, and resynchronization behavior.
- [PostgreSQL 18 `pg_subscription_rel`](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html) - relation state codes and `srsublsn` semantics.
- [PostgreSQL 18 `pg_subscription`](https://www.postgresql.org/docs/18/catalog-pg-subscription.html) - shared-catalog scope, database ownership, slot names, and sensitive connection information.
- [PostgreSQL 18 subscription statistics](https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-SUBSCRIPTION) - `pg_stat_subscription` and `pg_stat_subscription_stats` columns and meanings.
- [PostgreSQL 18 `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html) - slot state, activity, WAL availability, inactivity, and invalidation columns.
- [PostgreSQL 18 `CREATE SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-createsubscription.html) - `slot_name`, `binary`, `copy_data`, `streaming`, `disable_on_error`, and `run_as_owner` behavior.
- [PostgreSQL 18 `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-altersubscription.html) - refresh, skip, enable/disable, and previously subscribed table behavior.
- [PostgreSQL 18 logical replication security](https://www.postgresql.org/docs/18/logical-replication-security.html) and [privilege definitions](https://www.postgresql.org/docs/18/ddl-priv.html) - replication-role, database, schema, table, RLS, and subscriber apply permissions.
- [PostgreSQL 18 `session_replication_role`](https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-SESSION-REPLICATION-ROLE) and [`ALTER TABLE` trigger modes](https://www.postgresql.org/docs/18/sql-altertable.html) - replica-mode trigger and foreign-key behavior.
- [PostgreSQL 18 logical replication configuration](https://www.postgresql.org/docs/18/logical-replication-config.html), [PostgreSQL 18 replication settings](https://www.postgresql.org/docs/18/runtime-config-replication.html), and [PostgreSQL 17 replication settings](https://www.postgresql.org/docs/17/runtime-config-replication.html) - worker, WAL-sender, slot, and replication-origin capacity limits across versions.
- [PostgreSQL 18 `pg_dump`](https://www.postgresql.org/docs/18/app-pgdump.html) - command syntax and the `--schema-only`, `--no-owner`, `--no-privileges`, and `--table` options.
- [PostgreSQL 18 `ORDER BY` rules](https://www.postgresql.org/docs/18/queries-order.html) - restriction that an output alias must stand alone when used for sorting.
- PostgreSQL REL_18_STABLE source for the [`pg_stat_subscription` view](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/catalog/system_views.sql#L979-L994), [table-synchronization slot creation](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/replication/logical/tablesync.c#L1485-L1493), and [replica-role worker initialization](https://github.com/postgres/postgres/blob/REL_18_STABLE/src/backend/replication/logical/worker.c#L4674-L4680).

## Issues Found
1. The worker query cast the `relation` output alias inside `ORDER BY`. PostgreSQL only permits an output alias there as a standalone name, so the query would fail. Changed it to sort by `(relid::regclass)::text`.
2. The post said a disabled or repeatedly crashing subscription could have no `pg_stat_subscription` rows. PostgreSQL 18 defines the view with a left join, so it retains a placeholder row with null worker fields. Corrected the explanation to use the null `pid` as the no-worker signal.
3. Filters on `pg_stat_subscription`, `pg_stat_subscription_stats`, and direct reads of `pg_subscription` used only `subname`. Because `pg_subscription` is cluster-shared and names can repeat in different databases, those queries could mix subscriptions. Updated the shared-view queries to resolve `subid` within `current_database()` and constrained the direct catalog query by `subdbid`.
4. The post called table-synchronization slots temporary. PostgreSQL 18 creates them as permanent slots (`temporary = false`) and normally drops them when synchronization completes. Corrected the terminology and clarified that the generated subscription OID, relation OID, and system identifier are subscriber-side.
5. The publisher slot query assumed the main slot had the default subscription name and used PostgreSQL 18-only columns without saying so. Added instructions to substitute the actual `subslotname` when customized and to adjust the selected columns on older releases.
6. The trigger section implied that ordinary triggers and foreign-key checks fire during the initial copy. Table synchronization also runs with `session_replication_role = replica`; only `ENABLE REPLICA` or `ENABLE ALWAYS` triggers are eligible. Qualified the trigger explanation and removed ordinary foreign-key constraints from the copy-failure list.
7. The publisher permission checklist omitted `CONNECT` on the database and `USAGE` on the containing schema, and it did not account for the superuser exception to `REPLICATION` and object privileges. Corrected the explanation and added `rolsuper`, `has_database_privilege`, and `has_schema_privilege` diagnostics.
8. Automatic synchronization-worker respawn was stated unconditionally. With the default `disable_on_error = false`, PostgreSQL retries; with `disable_on_error = true`, it disables the subscription. Added that caveat and the requirement to repair the cause before re-enabling.
9. The PostgreSQL 18 capacity checklist omitted `max_active_replication_origins`, which must include reserve for table synchronization. Added the diagnostic and explained that releases before 18 use subscriber-side `max_replication_slots` for this limit.

## Review Notes
- The five `pg_subscription_rel` states, `srsublsn` semantics, snapshot/copy/catch-up lifecycle, statistics columns, replication-slot fields, RLS guidance, worker-pool relationships, lock diagnostics, refresh behavior, and `SKIP` warning were otherwise accurate for PostgreSQL 18.
- The schema comparison commands and all four `pg_dump` options were verified against PostgreSQL 18 documentation and local `pg_dump --help` output.
- The post is current for PostgreSQL 18. It now calls out the snippets that need column or setting adjustments on older supported releases.
