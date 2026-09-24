# Validation Summary: How to Choose Synchronous, Semi-Synchronous, or Asynchronous Replication

## Status

validated

## Post Type

Technical guide with SQL inspection statements, PostgreSQL configuration, and replication architecture guidance.

## Technologies Covered

- PostgreSQL 18 physical streaming replication, WAL durability, synchronous standby selection, and transaction snapshots.
- MySQL 8.4 semisynchronous replication, relay logs, source plugin variables, and status monitoring.
- Asynchronous replication, high availability, failover, fencing, recovery point objectives, and commit latency.

## Sources Consulted

- [PostgreSQL 18: Log-Shipping Standby Servers](https://www.postgresql.org/docs/18/warm-standby.html) — asynchronous defaults, synchronous acknowledgment, performance, and failure behavior.
- [PostgreSQL 18: Write Ahead Log settings](https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-SYNCHRONOUS-COMMIT) — acknowledgment levels and local versus remote durability.
- [PostgreSQL 18: Replication settings](https://www.postgresql.org/docs/18/runtime-config-replication.html#GUC-SYNCHRONOUS-STANDBY-NAMES) — standby selection syntax and application names.
- [PostgreSQL 18: Transaction Isolation](https://www.postgresql.org/docs/18/transaction-iso.html) — snapshot visibility for dependent reads.
- [PostgreSQL 18: Failover](https://www.postgresql.org/docs/18/warm-standby-failover.html) — external failover management and fencing the former primary.
- [MySQL 8.4: Semisynchronous Replication](https://dev.mysql.com/doc/refman/8.4/en/replication-semisync.html) — durable relay-log acknowledgment and asynchronous fallback.
- [MySQL 8.4: Replication Source Options and Variables](https://dev.mysql.com/doc/refman/8.4/en/replication-options-source.html) — plugin controls, timeout units, acknowledgment count, and wait points.
- [MySQL 8.4: Server Status Variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html) — operational status and acknowledged/unacknowledged transaction counters.
- [MySQL 8.4: Using System Variables](https://dev.mysql.com/doc/refman/8.4/en/using-system-variables.html) — global variable access and plugin variable availability.
- [MySQL 8.4: SHOW STATUS Statement](https://dev.mysql.com/doc/refman/8.4/en/show-status.html) — statement syntax, global scope, and pattern filtering.

## Issues Found

No technical issues found.

## Review Notes

- Reviewed the full README against the versioned official documentation. No README changes were necessary. The SQL and configuration were checked against documented syntax and behavior; no live database topology, benchmark, or failover test was run. There are no terminal commands to validate.
- PostgreSQL streaming replication is asynchronous by default. The documented failure behavior supports the post's distinction between acknowledging a commit locally and retaining it on a failover target. The latency and resource-contention discussion is consistent with synchronous replication guidance.
- The PostgreSQL configuration is valid for an existing topology. `FIRST 1 (ha_a, ha_b)` uses priority selection for one synchronous standby, with names matched to replication connection application names. It does not require acknowledgments from both named standbys.
- The explanations of `on`, `remote_write`, `remote_apply`, and `local`, including the empty standby-selection case, are correct. Durable-storage claims assume working durability settings and storage. Applications can override `synchronous_commit` per transaction, so the example is a default configuration rather than an enforcement mechanism.
- The dependent-read advice correctly requires both a qualifying replica and a sufficiently fresh snapshot. An existing transaction snapshot can remain older than a newly replayed commit.
- MySQL acknowledges receipt after relay-log flushing, independently of transaction application. The four queried source variables are valid global plugin variables; the statements require the source plugin to be installed as stated. Timeout units, acknowledgment count, and the ordering of `AFTER_SYNC` and `AFTER_COMMIT` are correct.
- A further MySQL operational caveat is that `rpl_semi_sync_source_wait_no_replica=OFF` permits fallback before timeout when too few replicas remain. The post's timeout statement is correct and does not claim timeout is the only fallback trigger. Monitoring alone cannot enforce a no-loss contract; any surrounding admission control must actually prevent relevant work from succeeding under weaker guarantees.
- `Rpl_semi_sync_source_no_tx` tracks commits without successful replica acknowledgment; `Rpl_semi_sync_source_yes_tx` tracks acknowledged commits, and `Rpl_semi_sync_source_status` indicates operational state. The broad status query is valid. Some returned timing variables are deprecated, but the post does not recommend relying on them.
- Promotion eligibility, fencing, degraded-state handling, and resolving uncertain commit outcomes are appropriate acceptance criteria. They are deployment requirements, not guarantees supplied by the replication labels alone.
- All linked documentation pages resolve to the relevant resources. The PostgreSQL `/current/` links currently show PostgreSQL 18; version-pinned links would preserve that scope after future releases. The author link resolves to the named GitHub profile. The reviewed settings are valid for the explicitly stated PostgreSQL 18 and MySQL 8.4 versions.
