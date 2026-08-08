# Validation Summary: Monitor PostgreSQL Replication with Actionable Alerts

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- PostgreSQL 18
- Physical streaming and cascading replication
- Logical replication and subscriptions
- Write-ahead logging (WAL) and log sequence numbers (LSNs)
- WAL receivers and senders
- Physical, logical, synchronized, and failover replication slots
- Synchronous replication
- WAL archiving
- PostgreSQL cumulative statistics and monitoring roles
- Replication alerting and capacity forecasting

## Sources Consulted

- [PostgreSQL 18: `pg_stat_replication`, `pg_stat_wal_receiver`, `pg_stat_subscription`, `pg_stat_subscription_stats`, `pg_stat_archiver`, and `pg_stat_database_conflicts`](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18: `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 18: WAL, recovery, replay-pause, and LSN functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [PostgreSQL 18: streaming, cascading, slot, and synchronous replication](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL 18: replication configuration, including `primary_conninfo`, `synchronous_standby_names`, and receiver settings](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18: logical replication failover readiness](https://www.postgresql.org/docs/18/logical-replication-failover.html)
- [PostgreSQL 18: logical replication monitoring](https://www.postgresql.org/docs/18/logical-replication-monitoring.html)
- [PostgreSQL 18: `pg_subscription_rel` state codes](https://www.postgresql.org/docs/18/catalog-pg-subscription-rel.html)
- [PostgreSQL 18: `CREATE SUBSCRIPTION` and optional slot association](https://www.postgresql.org/docs/18/sql-createsubscription.html)
- [PostgreSQL 18: `ORDER BY` expressions and output aliases](https://www.postgresql.org/docs/18/queries-order.html)
- [PostgreSQL 18: `pg_lsn` representation and comparison](https://www.postgresql.org/docs/18/datatype-pg-lsn.html)
- [PostgreSQL 18: continuous WAL archiving](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [PostgreSQL 18: predefined monitoring roles](https://www.postgresql.org/docs/18/predefined-roles.html)

## Issues Found

- Standby application names were described as needing uniqueness without noting that synchronous-standby matching is case-insensitive. The post now requires case-insensitive uniqueness so names that differ only by letter case cannot produce indeterminate synchronous selection.
- The cascading-standby discussion said an absent receiver makes `pg_last_wal_receive_lsn()` return `NULL`. PostgreSQL instead returns `NULL` when streaming is disabled or has never started; after earlier streaming, the function can retain a stale non-`NULL` position while archive recovery advances. The explanation was corrected.
- The post attributed asynchronous visibility-delay semantics to all three sender lag intervals. Only `replay_lag` approximates recent visibility delay; `write_lag` and `flush_lag` describe earlier synchronous-commit stages. The explanation now makes that distinction.
- The standby query labeled `pg_is_wal_replay_paused()` as an actual paused state. That function reports whether a pause was requested. The alias is now `replay_pause_requested`, and the post explains that `pg_get_wal_replay_pause_state()` distinguishes a pending request from an actually paused recovery.
- Synchronized logical-slot readiness was reduced to `synced = true`. PostgreSQL's failover-readiness check also requires a persistent slot and no invalidation. The post now checks expected presence and `synced AND NOT temporary AND invalidation_reason IS NULL`.
- The `safe_wal_size` deadline discussion did not account for lost slots, for which `safe_wal_size` is also `NULL`. It now limits the calculation to non-`NULL` values and directs monitors to alert immediately on `wal_status = 'lost'`.
- Archive staleness was tied to any ongoing WAL generation, but PostgreSQL invokes archiving only for completed WAL segments. The alert condition now accounts for segment completion and `archive_timeout`.
- The synchronous-replication guidance would have alerted on any `SyncRep` wait, even though short waits are normal. It now alerts only when commits remain in the IPC `SyncRep` wait beyond the expected synchronous-commit latency budget, which also disambiguates it from the separate LWLock wait with the same name.
- The logical-subscription introduction implied that every subscription always has an active WAL-sender connection and owns a slot. PostgreSQL subscriptions normally use slots, but can be disabled or configured with no associated slot. The wording now applies to active subscriptions and says they normally use logical slots.
- The logical-subscription SQL used `relation::text` in `ORDER BY`, where `relation` was a select-list alias. PostgreSQL requires an output alias to stand alone in `ORDER BY`, so the query failed with `column "relation" does not exist`. It now repeats the valid source expression as `relid::regclass::text`; the corrected query was execution-tested on PostgreSQL 18.4.
- Raw textual `pg_lsn` values were described as sortable. PostgreSQL prints each hexadecimal component with variable width, so lexical text order is not numeric LSN order. The post now recommends native `pg_lsn` storage or retaining strings for display while computing sortable numeric values or byte deltas in PostgreSQL.

## Review Notes

- The PostgreSQL 18 view names and selected columns were checked against the official PostgreSQL 18 documentation. The SQL snippets were syntax- and column-checked against PostgreSQL 18.4; recovery-only behavior was additionally checked against the official function documentation.
- Column availability varies across PostgreSQL major versions, notably for subscription worker types, logical-slot conflict counters, and failover-slot fields. The post correctly calls for version-specific collector queries.
- Some archiver process-abort failures are not counted in `pg_stat_archiver`; production monitoring should retain PostgreSQL log coverage alongside the view metrics.
- `synchronous_standby_names` and runtime sender state do not prove that every transaction requests synchronous durability because `synchronous_commit` can be changed per transaction, session, user, or database.
- The post's `/current/` documentation links resolve to PostgreSQL 18 as of validation. Version-pinned `/18/` links would be more stable for a PostgreSQL 18-specific collector.
