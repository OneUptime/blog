# Validation Summary: How to Install and Secure PostgreSQL on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (hands-on, step-by-step installation, hardening, backup, and replication walkthrough)

## Technologies Covered
- PostgreSQL 17 (on Ubuntu 22.04 / 24.04 LTS)
- PostgreSQL APT repository (PGDG) and APT packaging
- `postgresql.conf` and `pg_hba.conf` configuration
- Roles/RBAC, SCRAM-SHA-256 authentication
- SSL/TLS (OpenSSL self-signed certificates)
- Backups: `pg_dump`, `pg_dumpall`, `pg_basebackup`, `pg_restore`
- Streaming replication (WAL, replication slots, standby setup)
- Performance tuning (memory, query planner)
- PgBouncer connection pooling
- Extensions: `pg_stat_statements`, `pg_trgm`, `btree_gin`, `pgcrypto`

## Sources Consulted
- PostgreSQL runtime config — Replication: https://www.postgresql.org/docs/current/runtime-config-replication.html (max_wal_senders, wal_keep_size, hot_standby_feedback)
- PostgreSQL versioning / release support policy: https://www.postgresql.org/support/versioning/ (PG 18 released 2025-09-25; PG 17 supported until 2029)
- PostgreSQL APT repository docs: https://www.postgresql.org/download/linux/ubuntu/
- General cross-reference of `pg_stat_replication`, `pg_stat_wal_receiver`, `pg_replication_slots` column names, `pg_dump`/`pg_basebackup` flags, and SSL parameters against current PostgreSQL documentation.

## Issues Found
1. **Incorrect comment on `max_wal_senders`** (Part 2, WAL settings): The comment described it as "Number of WAL segments to keep for replication," which actually describes `wal_keep_size`. `max_wal_senders` controls the maximum number of concurrent connections from standby servers / streaming base backup clients. Corrected the comment to accurately describe the parameter. (Note: the post's later Part 6 occurrence already described it correctly.)
2. **`hot_standby_feedback` placed under PRIMARY server config** (Part 6): Per the docs, `hot_standby_feedback` only takes effect on the standby (the standby sends feedback to the primary); it has no effect when set on the primary. Removed the misleading two lines from the PRIMARY section — the parameter is already correctly documented in the STANDBY section.
3. **Outdated "latest stable version" claim**: The install comment called PostgreSQL 17 "latest stable version as of 2026," but PostgreSQL 18 was released 2025-09-25 (and PG 19 was in beta by mid-2026). Reworded to "a current, fully supported stable release; PostgreSQL 18 is also available." PostgreSQL 17 is still fully supported (until 2029), so the rest of the guide using 17 remains valid and was left unchanged.

## Review Notes
- The GPG key URL (`https://www.postgresql.org/media/keys/ACCC4CF8.asc`), the PGDG `sources.list` line, package names (`postgresql-17`, `postgresql-contrib-17`), config file paths (`/etc/postgresql/17/main/...`), and service management commands are all correct for the PGDG Ubuntu packaging.
- All replication monitoring queries use valid column names for `pg_stat_replication`, `pg_stat_wal_receiver`, and `pg_replication_slots`. `pg_stat_statements` columns (`total_exec_time`, `mean_exec_time`) are correct for PG 13+ (including 17).
- `pg_basebackup` flags (`--wal-method=stream`, `--write-recovery-conf`, `--slot`, `--gzip`), and the note that `--write-recovery-conf` creates `standby.signal` + `postgresql.auto.conf`, are accurate for PG 12+.
- SSL parameters (`ssl_min_protocol_version`, `ssl_prefer_server_ciphers`, `ssl_ciphers`) and `openssl s_client -starttls postgres` are valid.
- Minor (not changed, defensible as written): `logging_collector = on` with `log_directory = 'pg_log'` writes logs to the data directory, while the verification step tails `/var/log/postgresql/postgresql-17-main.log` (the Debian/Ubuntu default stderr log). Both files can exist; readers should be aware of where their logs land based on this setting.
- Minor (not changed): `work_mem = 256MB` combined with `max_connections = 200` is aggressive; the post already includes a cautionary comment that work_mem is per-operation, so this is an intentional tuning recommendation rather than an error.
- `archive_command = 'cp %p .../%f'` is a simplistic example (no fsync/durability guarantee) but is the standard illustrative form used in tutorials and is acceptable here.
