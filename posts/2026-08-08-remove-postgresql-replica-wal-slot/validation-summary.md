# Validation Summary: Remove a PostgreSQL Replica Without Orphaning Its Slot

## Status
validated

## Post Type
Operations Guide / Replica Decommissioning Runbook

## Technologies Covered
- PostgreSQL 18
- Physical streaming replication and cascading replication
- Logical replication subscriptions
- Physical and logical replication slots
- WAL retention and recycling
- Synchronous replication
- Logical failover-slot synchronization
- `pg_receivewal`
- `pg_recvlogical`

## Sources Consulted
- [PostgreSQL 18 replication slots and cascading replication](https://www.postgresql.org/docs/18/warm-standby.html#STREAMING-REPLICATION-SLOTS)
- [PostgreSQL 18 `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 18 replication management functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-REPLICATION)
- [PostgreSQL 18 WAL and recovery information functions](https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-BACKUP)
- [PostgreSQL 18 `pg_stat_replication` and `pg_stat_wal_receiver`](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18 `pg_settings`](https://www.postgresql.org/docs/18/view-pg-settings.html)
- [PostgreSQL 18 replication configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18 `pg_subscription`](https://www.postgresql.org/docs/18/catalog-pg-subscription.html)
- [PostgreSQL 18 subscription slot management](https://www.postgresql.org/docs/18/logical-replication-subscription.html#LOGICAL-REPLICATION-SUBSCRIPTION-SLOT)
- [PostgreSQL 18 `CREATE SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18 `ALTER SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-altersubscription.html)
- [PostgreSQL 18 `DROP SUBSCRIPTION`](https://www.postgresql.org/docs/18/sql-dropsubscription.html)
- [PostgreSQL `REL_18_STABLE` correction to `DROP SUBSCRIPTION` documentation, July 17, 2026](https://github.com/postgres/postgres/commit/aa572d521a1116b2c8902b98f44baf402a3e5246)
- [PostgreSQL 18 logical replication slot synchronization](https://www.postgresql.org/docs/18/logicaldecoding-explanation.html#LOGICALDECODING-REPLICATION-SLOTS-SYNCHRONIZATION)
- [PostgreSQL 18 `pg_receivewal`](https://www.postgresql.org/docs/18/app-pgreceivewal.html)
- [PostgreSQL 18 `pg_recvlogical`](https://www.postgresql.org/docs/18/app-pgrecvlogical.html)
- [PostgreSQL 18 release notes](https://www.postgresql.org/docs/18/release-18.html)
- [PostgreSQL 18 `pg_basebackup`](https://www.postgresql.org/docs/18/app-pgbasebackup.html)

## Issues Found
1. The introduction described every replication slot as persistent. Temporary slots are not saved to disk and are automatically removed on error or when their creating session ends. The wording now applies persistence specifically to non-temporary slots.
2. The physical-standby inventory could print credentials embedded in `primary_conninfo`. Added a warning to protect that value and clarified that `pg_stat_wal_receiver.conninfo` obfuscates security-sensitive fields.
3. The `pg_subscription` lookup filtered only on `subname`, even though the catalog is shared cluster-wide and subscription names need only be unique within a database. Added a `subdbid` filter for `current_database()` so a same-named subscription in another database cannot be mistaken for the target.
4. The publisher-side examples assumed the main slot name was the same as the subscription name. That is only the default because `slot_name` is configurable. Added an explicit instruction to use the captured `subslotname` whenever it differs.
5. The WAL-distance query used `pg_current_wal_lsn()`, which cannot execute during recovery even though PostgreSQL 18 can host logical slots on a hot standby. Scoped the shown query to non-recovery servers and documented `pg_last_wal_replay_lsn()` as the standby comparison point. Also removed “backup” as an independent core WAL-retention cause; backup tools retain WAL through mechanisms such as archiving, `wal_keep_size`, or replication slots.
6. The post stated that `slot_name = NONE` makes the final `DROP SUBSCRIPTION` avoid all publisher contact. PostgreSQL can still connect to remove unfinished table-synchronization slots. Corrected the behavior using the July 17, 2026 `REL_18_STABLE` documentation backpatch and clarified that an unreachable publisher leaves those slots for manual cleanup.
7. The manual logical cleanup example showed only the main slot. Clarified that `pg_drop_replication_slot()` drops only the named slot and must be called separately for every approved remaining table-synchronization slot. The table-sync naming guidance now identifies the relation OID and system identifier as subscriber-side values.
8. The `pg_recvlogical` explanation implied that dropping a logical slot requires connecting to its associated database. PostgreSQL 18 made `--dbname` optional for `--drop-slot`; it remains required for slot creation and streaming. Corrected the version-specific explanation while retaining the valid connection-string example.
9. The `max_slot_wal_keep_size` description implied a hard disk-usage cap. Clarified that it is enforced at checkpoints and can allow a slot to lose required WAL without strictly capping `pg_wal` usage.
10. The post said an invalidated slot's consumer always needs re-seeding. A physical standby can instead recover from a sufficiently complete WAL archive, so the text now allows either re-seeding or another documented recovery source.

## Review Notes
- All PostgreSQL 18 columns used from `pg_replication_slots`, `pg_stat_replication`, `pg_stat_wal_receiver`, `pg_settings`, and `pg_subscription` were verified as current and correctly named.
- The SQL statements, `LIKE ... ESCAPE` pattern, `pg_drop_replication_slot()` calls, and separate `ALTER SUBSCRIPTION` sequence are syntactically valid.
- The `pg_receivewal` and `pg_recvlogical` flags and connection-string forms are valid in PostgreSQL 18.
- The physical-slot ownership, synchronous-standby fencing, cascading-replication, logical failover-slot, and post-drop WAL recycling explanations are technically correct after the listed fixes.
- Every external link in the post returned HTTP 200 during validation.
