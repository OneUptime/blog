# Validation Summary: PostgreSQL Cascading Replication After Failover

## Status
validated

## Post Type
Technical guide and high-availability operations runbook

## Technologies Covered

- PostgreSQL 18 physical streaming and cascading replication
- PostgreSQL failover, promotion, timelines, and timeline history files
- Physical replication slots and WAL retention
- Synchronous and asynchronous replication semantics
- Hot standby feedback
- PostgreSQL recovery configuration and WAL archives
- `pg_rewind`, `pg_controldata`, and replication monitoring views
- High-availability fencing, reparenting, and topology management

## Sources Consulted

- [PostgreSQL 18: Log-Shipping Standby Servers, including cascading and synchronous replication](https://www.postgresql.org/docs/18/warm-standby.html)
- [PostgreSQL 18: Failover](https://www.postgresql.org/docs/18/warm-standby-failover.html)
- [PostgreSQL 18: Replication configuration](https://www.postgresql.org/docs/18/runtime-config-replication.html)
- [PostgreSQL 18: WAL and recovery-target configuration](https://www.postgresql.org/docs/18/runtime-config-wal.html)
- [PostgreSQL 18: Replication monitoring views](https://www.postgresql.org/docs/18/monitoring-stats.html)
- [PostgreSQL 18: `pg_settings`](https://www.postgresql.org/docs/18/view-pg-settings.html)
- [PostgreSQL 18: `pg_replication_slots`](https://www.postgresql.org/docs/18/view-pg-replication-slots.html)
- [PostgreSQL 18: System administration and recovery-control functions](https://www.postgresql.org/docs/18/functions-admin.html)
- [PostgreSQL 18: Continuous archiving, timelines, and timeline history files](https://www.postgresql.org/docs/18/continuous-archiving.html#BACKUP-TIMELINES)
- [PostgreSQL 18: Streaming replication protocol](https://www.postgresql.org/docs/18/protocol-replication.html)
- [PostgreSQL 18: `pg_rewind`](https://www.postgresql.org/docs/18/app-pgrewind.html)
- [PostgreSQL 18: `pg_controldata`](https://www.postgresql.org/docs/18/app-pgcontroldata.html)
- [PostgreSQL 18: libpq connection strings and multiple hosts](https://www.postgresql.org/docs/18/libpq-connect.html#LIBPQ-MULTIPLE-HOSTS)
- [PostgreSQL 18: Password files](https://www.postgresql.org/docs/18/libpq-pgpass.html)

## Issues Found

- The relay-failure wording implied that changing configuration is always required. PostgreSQL does not discover a new upstream from the replication topology, but libpq can try hosts or an HA endpoint already listed in `primary_conninfo`. The post now distinguishes an unconfigured upstream from a preconfigured alternative.
- The WAL-availability checklist blurred streaming with archive recovery. A's WAL sender serves retained WAL from A's `pg_wal`; C retrieves older archived segments through its own `restore_command`. The checklist and slot-recovery paragraph now state those paths explicitly.
- Slot retention was described as unconditional after reservation. PostgreSQL can remove required WAL when configured retention limits are exceeded or invalidate an idle slot. The post now limits the claim to a valid slot and acknowledges configured retention and invalidation limits.
- “Larger recovery point” was not the correct failure-impact term. It was changed to a larger data-loss window that can violate the recovery point objective (RPO).
- Merely making C eligible for synchronous replication would not guarantee that covered commits wait for it. The post now requires C to be an active synchronous standby for those commits at the required durability level.
- The hot-standby-feedback paragraph was broader than PostgreSQL's documented effect. It now says feedback reduces downstream query cancellations caused by cleanup conflicts rather than implying that it prevents every recovery-conflict class.
- The preconfiguration checklist omitted an explicit `hot_standby = on` requirement for relays and the rule that a standby's `max_wal_senders` must be at least the primary's value. Both requirements are now included, and replication-slot capacity is described separately.

## Review Notes

- All SQL statements, function signatures, configuration names, libpq options, and shell commands are valid for PostgreSQL 18. No deprecated APIs or commands were found.
- The selected `pg_replication_slots.invalidation_reason` column exists in PostgreSQL 17 and 18 but not PostgreSQL 14 through 16; the query is correct for the post's PostgreSQL 18 example.
- `pg_settings.sourcefile` and `sourceline` can be `NULL` for callers without superuser privileges or membership in `pg_read_all_settings`.
- `pg_stat_wal_receiver.conninfo` already obfuscates security-sensitive fields, but the post's general instruction to redact connection secrets remains appropriate.
- A standby using `archive_mode = on` starts archiving after promotion but does not rearchive received or restored files while still in recovery; deployments that require that behavior use `archive_mode = always` and a collision-safe archive.
- Every external link in the post resolved successfully and pointed to the intended official PostgreSQL or author page during review.
