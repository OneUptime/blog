# Validation Summary: How to Set Up PostgreSQL Streaming Replication Over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- PostgreSQL 15 physical streaming replication
- PostgreSQL WAL and replication configuration
- `pg_basebackup`
- `pg_stat_replication` and standby recovery functions
- IPv4-based primary/standby connectivity
- Debian/Ubuntu `pg_ctlcluster` cluster management

## Sources Consulted
- PostgreSQL 15 replication settings: https://www.postgresql.org/docs/15/runtime-config-replication.html
- PostgreSQL 15 WAL settings: https://www.postgresql.org/docs/15/runtime-config-wal.html
- PostgreSQL 15 standby and streaming replication setup: https://www.postgresql.org/docs/15/warm-standby.htm
- PostgreSQL 15 `pg_basebackup` reference: https://www.postgresql.org/docs/15/app-pgbasebackup.html
- PostgreSQL 15 recovery and replication functions: https://www.postgresql.org/docs/15/functions-admin.html
- PostgreSQL 15 monitoring views: https://www.postgresql.org/docs/15/monitoring-stats.html
- PostgreSQL 15 `pg_hba.conf` reference: https://www.postgresql.org/docs/15/auth-pg-hba-conf.html
- PostgreSQL 15 connection settings: https://www.postgresql.org/docs/15/runtime-config-connection.html
- Debian/Ubuntu `pg_ctlcluster` manpage: https://manpages.debian.org/testing/postgresql-common/pg_ctlcluster.1.en.html

## Issues Found
- The post told readers to `reload` PostgreSQL after changing replication settings in `postgresql.conf`. That is not sufficient for `listen_addresses`, `wal_level`, `max_wal_senders`, and `max_replication_slots`, which are startup-time settings. I changed the command to `pg_ctlcluster 15 main restart`.
- The `pg_basebackup` example used inline comments after backslash continuations, which makes the shell command invalid. I rewrote the block so the command is syntactically correct.
- The standby base-backup step omitted the requirement that the target directory for `pg_basebackup -D` must not exist or must be empty. I added the standby stop step and an explicit note that `/var/lib/postgresql/15/main` must be empty before running the backup.
- The optional synchronous replication comment overstated the guarantee as "no data loss" and the example was incomplete because `synchronous_standby_names` matches the standby `application_name`. I changed the wording to describe standby confirmation accurately and added `application_name=standby1` to `primary_conninfo` so the commented example is internally consistent.
- The verification query used `now() - pg_last_xact_replay_timestamp()` as `replication_delay` and said values near zero mean real-time replication. That expression measures the age of the last replayed transaction and can grow on an idle system even when the standby is fully caught up. I replaced it with `pg_last_wal_receive_lsn()` and `pg_last_wal_replay_lsn()` to check replay progress more accurately.

## Review Notes
- The guide is technically valid after correction.
- The examples use Debian/Ubuntu-specific paths and service tooling such as `/etc/postgresql/15/main` and `pg_ctlcluster`; those are correct for `postgresql-common`-based installs but are not universal across all PostgreSQL deployments.
- The post uses manual `standby.signal` and `primary_conninfo` setup, which is still valid on PostgreSQL 15. An alternative is `pg_basebackup -R`, but the current manual approach is supported.
- `hot_standby = on` remains correct, but in PostgreSQL 15 it is already the default.
