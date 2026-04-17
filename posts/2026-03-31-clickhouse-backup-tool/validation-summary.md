# Validation Summary: How to Use clickhouse-backup Tool

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- clickhouse-backup (Altinity)
- ClickHouse
- AWS S3 (remote storage)
- systemd (timer + service unit)
- Kubernetes CronJob
- ClickHouse SQL (CREATE USER / GRANT)

## Sources Consulted
- Altinity/clickhouse-backup ReadMe.md (master): https://github.com/Altinity/clickhouse-backup/blob/master/ReadMe.md
- Altinity/clickhouse-backup CLI source (cmd/clickhouse-backup/main.go): https://github.com/Altinity/clickhouse-backup/blob/master/cmd/clickhouse-backup/main.go
- Altinity/clickhouse-backup config struct (pkg/config/config.go): https://github.com/Altinity/clickhouse-backup/blob/master/pkg/config/config.go
- ClickHouse GRANT statement docs: https://clickhouse.com/docs/en/sql-reference/statements/grant
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- Kubernetes CronJob docs (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found

1. **Wrong CLI subcommand names: `create-and-upload` and `restore-remote`.** The actual command names use underscores: `create_remote` and `restore_remote` (verified in `cmd/clickhouse-backup/main.go` — `Name: "create_remote"`, `Name: "restore_remote"`; no hyphenated aliases exist). Replaced all occurrences in shell snippets, the systemd `ExecStart`, the Kubernetes CronJob command, the monitoring example, and the closing summary.

2. **Invalid `--rm` flag with `create_remote`.** The `--rm` / `--drop` flag exists only on `restore` / `restore_remote` (drops schema before restore). For `create_remote`, the equivalent "remove local backup after upload" flag is `--delete-source` (aliases `--delete`, `--delete-local`). Replaced `clickhouse-backup create-and-upload --rm 2026-03-31-full` with `clickhouse-backup create_remote --delete-source 2026-03-31-full`.

3. **Non-existent config keys in YAML example.**
   - `general.disable_progress_bar` is not a field in `GeneralConfig` (no `disable_progress_bar` yaml tag in `pkg/config/config.go`). Removed.
   - `clickhouse.data_path` is not a field in `ClickHouseConfig`. Removed (clickhouse-backup discovers the data path from `system.disks`).
   - `s3.part_size` is not a field in `S3Config`. The actual size-control fields are `chunk_size` and `max_parts_count`. Replaced the `part_size` line with `chunk_size: 0` (auto-calculated) and added `max_parts_count: 4000` (matches the documented default).

4. **Invalid SQL grants for the backup user.**
   - `GRANT TABLE ENGINE ON *.* TO backup_user;` is not valid ClickHouse syntax — `TABLE ENGINE` grants take a specific engine name (`GRANT TABLE ENGINE ON ENGINE_NAME TO ...`), not `*.*`.
   - `SYSTEM FREEZE` is not a real ClickHouse access type; the FREEZE operation is governed by `ALTER FREEZE PARTITION` (and `SYSTEM UNFREEZE` for unfreeze). The minimum permission set is also more involved than the post listed (needs CREATE/INSERT/ATTACH for restores, ALTER for FREEZE, SELECT on `system.*`, etc.).
   - Replaced both lines with the simpler, recommended `GRANT ALL ON *.* TO backup_user;` which is what most clickhouse-backup deployments use and is consistent with the tool's broad access requirements (read all user data, freeze, attach, create on restore, read system tables).

## Review Notes

- The post sets `s3.compression_format: tar` (valid — `tar` means "no compression, just archived"), `compression_level: 1`, and `storage_class: STANDARD_IA`. All match valid options in `S3Config`.
- The systemd unit uses `%%Y-%%m-%%d` to escape `%` for systemd's specifier handling — this is correct for systemd unit files.
- The Kubernetes CronJob uses `apiVersion: batch/v1`, which is the GA API since Kubernetes 1.21. Correct.
- The `altinity/clickhouse-backup:latest` Docker image tag is the official image (`hub.docker.com/r/altinity/clickhouse-backup`); pinning a specific version tag would be a future improvement but the snippet is functionally correct.
- The tutorial does not mention `create_remote`'s sibling commands `clean`, `clean_remote`, `watch`, or the `use_embedded_backup_restore: true` mode (BACKUP / RESTORE SQL) — those are out of scope for an introductory walkthrough but worth knowing for follow-up content.
- Backup retention via `backups_to_keep_local` / `backups_to_keep_remote` is enforced *during* `create` / `create_remote` operations (not by a separate cron-like cleaner inside the tool), which the post correctly states.
