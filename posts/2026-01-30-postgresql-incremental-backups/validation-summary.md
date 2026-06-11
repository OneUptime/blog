# Validation Summary: How to Build PostgreSQL Incremental Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL 16 (configuration, WAL archiving, PITR)
- pgBackRest (backup/restore, stanzas, retention, multi-repo, S3, encryption)
- Write-Ahead Logging (WAL) and `pg_stat_archiver`
- Bash automation (cron, shell scripting)
- Prometheus textfile exporter (node_exporter `.prom` format)
- AWS S3 (storage repository, IAM key types)
- systemd (PostgreSQL service management)

## Sources Consulted
- pgBackRest Command Reference — https://pgbackrest.org/command.html
- pgBackRest Configuration Reference — https://pgbackrest.org/configuration.html
- PostgreSQL 16 Continuous Archiving and PITR — https://www.postgresql.org/docs/16/continuous-archiving.html
- PostgreSQL 16 WAL Configuration — https://www.postgresql.org/docs/16/wal-configuration.html
- PostgreSQL `pg_stat_archiver` view — https://www.postgresql.org/docs/16/monitoring-stats.html
- PostgreSQL recovery target action — https://www.postgresql.org/docs/16/runtime-config-wal.html

## Issues Found
- **Invalid command `pgbackrest --stanza=main archive-get --list`**: The `archive-get` command is invoked by PostgreSQL during recovery to fetch a specific WAL segment and has no `--list` option. Replaced with `pgbackrest --stanza=main info --output=json`, which is the actual way to inspect WAL archive min/max and backup status in JSON form. (Debug Commands section, Part 8.)

## Review Notes
- `wal_level = replica`, `archive_mode = on`, `archive_command`, `archive_timeout`, `max_wal_size`, `min_wal_size`, and `wal_keep_size` are all valid PostgreSQL 16 parameters with correct usage.
- `pg_switch_wal()` and `pg_stat_archiver` are correct (post-PG 10 naming).
- pgBackRest options used in the post — `repo1-path`, `repo1-retention-full/diff/incr`, `compress-type=lz4`, `compress-level=6`, `process-max`, `buffer-size`, `delta=y`, `pg1-path`, `pg1-socket-path`, `pg1-port`, `repo2-type=s3`, `repo2-s3-*`, `repo*-cipher-type=aes-256-cbc`, `repo1-s3-key-type=auto`, `protocol-timeout`, `io-timeout`, `repo*-retention-archive`, `repo*-retention-full-type` — all check out against the configuration reference.
- pgBackRest commands `stanza-create`, `check`, `backup`, `restore`, `expire`, `verify`, `info`, `archive-push`, `archive-get` are all valid; `--type=full|diff|incr`, `--type=time`, `--target`, `--target-action=promote`, `--set=`, `--delta`, `--db-include`, `--repo=N` are all valid options.
- The `compress-level=6` with `lz4` is within the valid range `[-5, 12]`; `compress-level=9` with `zst` is within `[-7, 22]`.
- The cron-day-of-week mapping (`date +%u` returns 7 for Sunday, 3 for Wednesday) correctly aligns with the cron entries (0 for Sunday, 3 for Wednesday).
- The `psql -t` field-parsing in the verification script works because the `|` separator becomes its own awk field, making `$1` = archived_count and `$3` = failed_count.
- Note for future maintenance: PostgreSQL 15+ also supports `archive_library` as an alternative to `archive_command`; the post sticks with `archive_command`, which remains supported in PG 16 and is the convention pgBackRest documents.
- Note: with `delta=y` set globally, ad-hoc `--delta` on restore is redundant but harmless — kept as written for clarity in the standalone command example.
