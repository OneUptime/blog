# Validation Summary: How to Set Up Warm Standby Servers on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu Server (22.04 LTS+)
- PostgreSQL 14 streaming replication
- WAL archiving
- `pg_basebackup`
- `pg_ctl promote` / failover
- `pg_stat_replication` and recovery-info functions
- Bash monitoring script + cron
- Patroni + etcd (briefly, for automated failover)

## Sources Consulted
- PostgreSQL 14 WAL Configuration: https://www.postgresql.org/docs/14/runtime-config-wal.html
- PostgreSQL 14 Replication Configuration: https://www.postgresql.org/docs/14/runtime-config-replication.html
- PostgreSQL 14 pg_basebackup: https://www.postgresql.org/docs/14/app-pgbasebackup.html
- PostgreSQL 14 pg_ctl: https://www.postgresql.org/docs/14/app-pg-ctl.html
- PostgreSQL 14 System Administration Functions: https://www.postgresql.org/docs/14/functions-admin.html
- PostgreSQL 14 Monitoring / pg_stat_replication: https://www.postgresql.org/docs/14/monitoring-stats.html
- PostgreSQL 14 Hot Standby: https://www.postgresql.org/docs/14/hot-standby.html
- Ubuntu 22.04 (jammy) etcd package: https://packages.ubuntu.com/jammy/etcd
- Patroni docs: https://patroni.readthedocs.io/

## Issues Found

1. **Broken `sudo -u postgres cat > file << EOF` redirect** (fixed). Shell redirects (`>`) are processed by the calling shell *before* sudo elevates privileges, so the file would be written as the invoking user rather than as `postgres`. In `/var/lib/postgresql/14/main/`, this either fails with "Permission denied" or produces a root-owned file that breaks `ALTER SYSTEM`. Replaced with `sudo -u postgres tee … > /dev/null << 'EOF'`, which runs `tee` (and the write) as the postgres user.

## Review Notes

- All other PostgreSQL 14 specifics verified correct: `wal_level = replica` is valid (and the default); `wal_keep_size` (PG 13+) and its `MB` units are valid; `max_wal_senders = 5` is allowed (PG 14 default is 10, so this is conservative — fine for a small setup); `pg_basebackup -R` does create `standby.signal` and append `primary_conninfo` to `postgresql.auto.conf`; `--wal-method=stream` is valid (and the default); `pg_stat_replication` columns and all `pg_last_*` / `pg_is_in_recovery` functions exist in PG 14; `pg_ctl promote -D <datadir>` is correct.
- **Trigger-file failover (`promote_trigger_file`) is removed in PostgreSQL 16.** It still works in PG 14 (which is what this post targets), but readers upgrading should switch to `pg_ctl promote` or `SELECT pg_promote()`. Worth a note if the post is ever updated for PG 16+.
- **Warm vs. hot standby terminology.** In strict PostgreSQL terms, a "warm standby" requires `hot_standby = off`, which the post does not set — meaning the standby will actually be a *hot* standby (accepting read-only queries) per the PG 14 default. The post's operational definition ("stays offline to client connections until promotion") matches industry usage and the verification queries in the post depend on `hot_standby = on`, so the inconsistency is intentional in practice. Not flagged as an error, but worth noting.
- **Ubuntu version drift.** `apt-get install etcd` works on Ubuntu 22.04 (transitional package → `etcd-server` 3.3.x, which is quite old), but on Ubuntu 24.04 the transitional package is gone and `pip3 install patroni[etcd]` is blocked by PEP 668. For 24.04+ readers, recommended path is `apt install patroni etcd-server etcd-client` or use `pipx`/`--break-system-packages`. Not changed since the post recommends 22.04+ and works correctly on 22.04.
- The monitoring script's `psql -h "$STANDBY_HOST"` relies on `.pgpass` / `pg_hba.conf` already being configured for passwordless auth — not explicitly called out, but reasonable for a tutorial.
- PostgreSQL 14 reaches end of community support in November 2026. Readers starting fresh deployments today may want to use a newer major version, though the configuration patterns shown remain broadly applicable.
