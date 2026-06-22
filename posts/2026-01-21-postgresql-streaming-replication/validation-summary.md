# Validation Summary: How to Set Up PostgreSQL Streaming Replication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL streaming replication
- PostgreSQL physical replication slots
- PostgreSQL base backups with `pg_basebackup`
- PostgreSQL synchronous replication
- PostgreSQL failover and `pg_rewind`
- PostgreSQL monitoring views and Prometheus exporter metrics

## Sources Consulted
- PostgreSQL documentation: Replication configuration (`wal_level`, `max_wal_senders`, `max_replication_slots`, `wal_keep_size`, `synchronous_standby_names`) - https://www.postgresql.org/docs/current/runtime-config-replication.html
- PostgreSQL documentation: Log-shipping standby servers, streaming replication, replication slots, cascading replication, and synchronous replication - https://www.postgresql.org/docs/current/warm-standby.html
- PostgreSQL documentation: `pg_basebackup` options (`-R`, `-X stream`, `-C`, `-S`) - https://www.postgresql.org/docs/current/app-pgbasebackup.html
- PostgreSQL documentation: `pg_stat_replication`, `pg_stat_wal_receiver`, and replication lag columns - https://www.postgresql.org/docs/current/monitoring-stats.html
- PostgreSQL documentation: `pg_replication_slots` system view - https://www.postgresql.org/docs/current/view-pg-replication-slots.html
- PostgreSQL documentation: `CREATE ROLE` replication and login attributes - https://www.postgresql.org/docs/current/sql-createrole.html
- PostgreSQL documentation: `pg_ctl promote` - https://www.postgresql.org/docs/current/app-pg-ctl.html
- PostgreSQL documentation: `pg_rewind` requirements and source connection behavior - https://www.postgresql.org/docs/current/app-pgrewind.html
- PostgreSQL documentation: WAL archiving settings - https://www.postgresql.org/docs/current/runtime-config-wal.html
- Prometheus Community PostgreSQL exporter repository and issue examples for replication metric names - https://github.com/prometheus-community/postgres_exporter

## Issues Found
- The post created physical replication slots manually and then used `pg_basebackup -C -S replica1_slot`, which would fail if the slot already existed. Changed the base backup command to use `-S replica1_slot` and clarified that `-C -S` is only for creating the slot when it was not created earlier.
- The replication user example granted `pg_read_all_data`, which is not required for physical streaming replication and conflicts with the later recommendation to keep the replication user separate. Replaced it with a note that no table privileges are required.
- The `postgresql.auto.conf` output was labeled as mandatory expected content even though password handling depends on how credentials are supplied to `pg_basebackup`. Changed the label to "Example content."
- The primary-side replication slot query selected `confirmed_flush_lsn`, which is `NULL` for physical slots. Replaced it with `wal_status` and `safe_wal_size`, which are useful for physical slot monitoring.
- The old-primary reconfiguration section implied that touching `standby.signal` is always sufficient after failover. Added the required caveat that a diverged old primary needs `pg_rewind` or a new base backup.
- The `pg_rewind` section did not mention its data checksums/`wal_log_hints` requirement and used the replication user for the source connection. Added the requirement and changed the example to use a normal database connection role with sufficient privileges.
- The SQL example for lag seconds used `EXTRACT(EPOCH FROM (NOW() - replay_lag))`, which computes an epoch value from a timestamp rather than seconds of lag. Changed it to `EXTRACT(EPOCH FROM replay_lag)`.
- The Prometheus examples used `pg_replication_lag` and `pg_stat_replication_pg_current_wal_lsn`, which are not reliable current metric names for the Prometheus Community PostgreSQL exporter. Updated the examples to use `pg_stat_replication_pg_wal_lsn_diff` and an `absent(...)` alert for missing replication metrics.

## Review Notes
The guide is technically relevant and broadly accurate after the targeted fixes. PostgreSQL package paths and service names vary by operating system and distribution, so the `/var/lib/postgresql/16/main` and `systemctl postgresql` examples remain distribution-specific examples rather than universal commands.
