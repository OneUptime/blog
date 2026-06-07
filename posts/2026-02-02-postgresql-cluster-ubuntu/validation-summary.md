# Validation Summary: How to Set Up PostgreSQL Cluster on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- PostgreSQL 16 (streaming replication, WAL archiving, replication slots, hot standby, synchronous replication)
- Ubuntu 22.04 / 24.04
- PostgreSQL APT repository (apt.postgresql.org)
- `pg_basebackup`, `pg_ctl`, `psql`
- `pg_stat_replication`, `pg_replication_slots` views
- WAL functions: `pg_last_wal_receive_lsn`, `pg_last_wal_replay_lsn`, `pg_last_xact_replay_timestamp`, `pg_wal_lsn_diff`, `pg_is_in_recovery`, `pg_promote`
- Optional: Patroni, repmgr, Stolon, pg_auto_failover (mentioned)
- UFW, OpenSSL (for SSL certificate generation)

## Sources Consulted
- PostgreSQL 16 official documentation: https://www.postgresql.org/docs/16/warm-standby.html
- PostgreSQL streaming replication chapter: https://www.postgresql.org/docs/16/runtime-config-replication.html
- PostgreSQL `pg_basebackup` reference: https://www.postgresql.org/docs/16/app-pgbasebackup.html
- PostgreSQL replication slots: https://www.postgresql.org/docs/16/warm-standby.html#STREAMING-REPLICATION-SLOTS
- PostgreSQL system views (`pg_stat_replication`, `pg_replication_slots`): https://www.postgresql.org/docs/16/monitoring-stats.html
- PostgreSQL synchronous_standby_names docs: https://www.postgresql.org/docs/16/runtime-config-replication.html#GUC-SYNCHRONOUS-STANDBY-NAMES
- PostgreSQL APT repository wiki: https://wiki.postgresql.org/wiki/Apt
- Ubuntu/Debian apt-key deprecation notes (apt-key(8) man page)

## Issues Found

1. **Incorrect use of `CREATE PUBLICATION` in physical replication setup.** The original SQL block created a logical-replication publication (`CREATE PUBLICATION my_publication FOR ALL TABLES;`) inside a guide that is entirely about *physical* streaming replication using replication slots. Publications belong to PostgreSQL's logical replication subsystem (pub/sub via logical decoding) and have no role in physical streaming replication. I removed the line because including it would create unused state, mislead readers about how physical replication works, and is unrelated to the slots being created in the same block.

2. **Deprecated `apt-key add` for adding the PostgreSQL repo key.** The original install commands piped the key into `sudo apt-key add -`. `apt-key` has been deprecated since Debian 11 / Ubuntu 22.04 and is removed in newer releases; the official PostgreSQL APT wiki now recommends `signed-by` with a keyring placed under `/etc/apt/keyrings/`. The post explicitly targets Ubuntu 22.04 and 24.04, so the deprecated form would emit warnings (and is the wrong pattern to teach). I replaced the block with the modern approach: install `curl`/`ca-certificates`/`gnupg`/`lsb-release`, save the ASCII-armored key to `/etc/apt/keyrings/postgresql.asc`, and reference it via `[signed-by=/etc/apt/keyrings/postgresql.asc]` in the sources list.

## Review Notes
- The `archive_command = 'cp %p /var/lib/postgresql/16/archive/%f'` works but the PostgreSQL documentation recommends a safer form that refuses to overwrite an existing archive file, e.g. `test ! -f /var/lib/postgresql/16/archive/%f && cp %p /var/lib/postgresql/16/archive/%f`. Left as-is because the simple form does function correctly; only a future enhancement note.
- All PostgreSQL config parameters (`wal_level`, `max_wal_senders`, `max_replication_slots`, `wal_keep_size`, `hot_standby`, `max_standby_streaming_delay`, `hot_standby_feedback`, `wal_sender_timeout`, `wal_receiver_timeout`, `synchronous_standby_names` with `FIRST`/`ANY` syntax) are correct for PostgreSQL 16.
- All WAL/replication SQL functions used (`pg_last_wal_receive_lsn`, `pg_last_wal_replay_lsn`, `pg_last_xact_replay_timestamp`, `pg_wal_lsn_diff`, `pg_is_in_recovery`, `pg_promote`, `pg_create_physical_replication_slot`, `pg_drop_replication_slot`) match the current PostgreSQL 16 API.
- `pg_basebackup` flags (`-h`, `-U`, `-D`, `-P`, `-R`, `-S`) are accurate; the `-R` flag correctly creates `standby.signal` and writes `primary_conninfo` to `postgresql.auto.conf` in PostgreSQL 12+.
- The sample `primary_conninfo` shown after `-R` includes many connection defaults (`channel_binding`, `sslmode`, `sslcompression`, `sslcertmode`, `sslsni`, `ssl_min_protocol_version`, `gssencmode`, `krbsrvname`, `gssdelegation`, `target_session_attrs`, `load_balance_hosts`) — these are all valid libpq connection parameters in PostgreSQL 16 and match what `pg_basebackup -R` actually writes.
- Version-specific caveat: this guide is pinned to PostgreSQL 16. If the reader installs a different major version, paths under `/etc/postgresql/<version>/main/` and `/var/lib/postgresql/<version>/` change accordingly.
- The `telnet` troubleshooting command may not be installed by default on modern Ubuntu; `nc -zv` or `ss -tnlp` could be alternatives, but `telnet` is still a common diagnostic install and not technically wrong.
