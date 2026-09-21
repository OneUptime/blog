# Validation Summary: How to Recover a PostgreSQL Standby After Its Required WAL Has Been Removed

## Status

validated

## Post Type

Technical troubleshooting and recovery guide containing SQL queries, PostgreSQL configuration, and a shell command.

## Technologies Covered

- PostgreSQL 18 physical standby and streaming replication
- Write-ahead logging (WAL), archives, and recovery timelines
- Physical replication slots and retention limits
- `pg_basebackup` and standby configuration
- Hot standby monitoring and recovery verification
- Patroni and controller-managed recovery workflows

## Sources Consulted

- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html) — archive/local WAL/streaming fallback, version compatibility, replication authentication, and slot configuration.
- [PostgreSQL 18: pg_replication_slots](https://www.postgresql.org/docs/18/view-pg-replication-slots.html) — all selected columns, WAL availability states, and invalidation reasons.
- [PostgreSQL 18: Continuous Archiving and Point-in-Time Recovery](https://www.postgresql.org/docs/18/continuous-archiving.html) — restore placeholders, missing-file behavior, compressed archives, and timeline history.
- [PostgreSQL 18: pg_basebackup](https://www.postgresql.org/docs/18/app-pgbasebackup.html) — every command option, destination requirements, streamed WAL, slot creation, recovery configuration, and tablespace mappings.
- [PostgreSQL 18: Hot Standby](https://www.postgresql.org/docs/18/hot-standby.html) — the five recovery-sensitive settings and consequences of insufficient standby values.
- [PostgreSQL 18: The Cumulative Statistics System](https://www.postgresql.org/docs/18/monitoring-stats.html) — `pg_stat_wal_receiver` columns and primary-side replication monitoring.
- [PostgreSQL 18: System Administration Functions](https://www.postgresql.org/docs/18/functions-admin.html) — recovery state, receive/replay LSN functions, and physical slot reservation semantics.
- [PostgreSQL 18: Replication Configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html) — retention limits, idle slot invalidation, and standby connection settings.
- [PostgreSQL 18: Write Ahead Log Configuration](https://www.postgresql.org/docs/18/runtime-config-wal.html) — archive recovery and `restore_command` configuration.
- [PostgreSQL 18: The Password File](https://www.postgresql.org/docs/18/libpq-pgpass.html) — protected password-file authentication for replication connections.
- [Patroni: patronictl reinit](https://patroni.readthedocs.io/en/latest/patronictl.html#patronictl-reinit) — controller-supported rebuilding of a standby.

## Issues Found

- **Slot creation does not necessarily reserve WAL immediately.** The original sentence said that creating a slot protects its new retention boundary without explaining when reservation begins. PostgreSQL's `pg_create_physical_replication_slot` normally reserves the LSN on the first streaming connection, unless `immediately_reserve` is true. Updated that sentence to state this condition while preserving the warning that a new slot cannot recover deleted WAL. No command examples needed changes.

## Review Notes

- Verified the SQL function names and every selected view column against PostgreSQL 18. The `flushed_lsn` field and `idle_timeout` invalidation reason are valid for the stated version.
- Confirmed that archive recovery can bridge missing upstream WAL and resume streaming when the necessary history remains available. Restarting or increasing retention cannot recreate removed segments.
- The local `cp` restore example is consistent with the documented pattern. The post correctly requires a nonzero result for missing files and appropriate tooling for compressed or remote archives.
- All `pg_basebackup` flags are valid and compatible. The combination creates a persistent physical slot, streams required WAL, creates `standby.signal`, and records connection and slot settings in `postgresql.auto.conf`.
- Operational prerequisites still apply: replication authentication and privileges, capacity for two backup replication connections, and an available replication slot. Existing tablespace destinations require attention because plain backups use source paths unless mappings are supplied; the article already directs readers to those options.
- The five listed standby settings match the hot standby documentation. Receive and replay positions have distinct meanings: the receive function tracks streaming, whereas replay can advance through archived WAL. A receive LSN can be null before streaming begins.
- Slot retention is subject to configured limits and idle invalidation. `safe_wal_size` can be null for a lost slot or unlimited retention, so alerts should account for those states.
- All six PostgreSQL documentation links in the post resolved to the intended PostgreSQL 18 resources. The author URL resolved to the expected GitHub profile. PostgreSQL 18 documentation lists the version as supported.
- Review consisted of documentation cross-checks and static inspection. No live PostgreSQL recovery, base backup, or application canary was executed.
