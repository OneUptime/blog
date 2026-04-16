# Validation Summary: How to Use clickhouse-backup Tool for Automated Backups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- clickhouse-backup (Altinity)
- ClickHouse
- AWS S3 (remote storage backend)
- Bash / cron
- Kubernetes CronJob (batch/v1)
- YAML configuration

## Sources Consulted
- Altinity/clickhouse-backup GitHub repository: https://github.com/Altinity/clickhouse-backup
- Altinity/clickhouse-backup ReadMe: https://github.com/Altinity/clickhouse-backup/blob/master/ReadMe.md
- GitHub Releases API for latest release asset names (verified `clickhouse-backup-linux-amd64.tar.gz` exists in v2.6.43)
- Inspected actual archive contents via `tar -tzf` to verify layout

## Issues Found
- **Install step — wrong path to extracted binary.** The post's original install snippet ran `mv clickhouse-backup /usr/local/bin/` after extracting the tarball, but the release archive layout is `build/linux/amd64/clickhouse-backup` (verified by downloading v2.6.43 and listing the archive). The `mv` would fail because the binary is not at the top level. Fixed by changing the command to `mv build/linux/amd64/clickhouse-backup /usr/local/bin/`.

## Review Notes
- Verified config structure: `general`, `clickhouse`, and `s3` sections all use correct field names. `compression_format` and `compression_level` correctly belong to the `s3` section (each remote backend has its own), not `general`.
- Verified CLI commands and flags: `list [local|remote]`, `create [--tables]`, `create-remote [--diff-from-remote]`, `upload`, `download`, `restore [--tables|--schema]`, `clean`, `print-config` are all valid per upstream docs.
- The cron snippet correctly escapes `%` as `\%` inside crontab lines.
- The release asset naming (`clickhouse-backup-linux-amd64.tar.gz`) matches the current v2.6.43 release.
- The Kubernetes CronJob uses `altinity/clickhouse-backup:latest` — in production users should pin a tagged version rather than `latest`, but this is a best-practice note rather than a correctness issue.
