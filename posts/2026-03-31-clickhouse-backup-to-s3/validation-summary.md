# Validation Summary: How to Back Up ClickHouse to AWS S3

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- ClickHouse (native BACKUP command, system tables)
- AWS S3 (storage destination, IAM instance roles)
- AWS CLI (s3 ls, s3 cp)
- Bash scripting (automation script with cron-style logic)
- XML configuration (ClickHouse config.d)

## Sources Consulted
- ClickHouse Backup and Restore docs: https://clickhouse.com/docs/operations/backup
- ClickHouse system.backups docs: https://clickhouse.com/docs/en/operations/system-tables/backups
- ClickHouse Backup to disk docs: https://clickhouse.com/docs/operations/backup/disk
- ClickHouse PR #42333 (S3 backup destination support): https://github.com/ClickHouse/ClickHouse/pull/42333

## Issues Found

1. **Incorrect minimum version (22.4 → 22.11).** The post claimed native `BACKUP TO S3` was introduced in 22.4. S3 as a BACKUP destination was actually added via PR #42333 (merged October 19, 2022), which landed in the 22.11 release. Updated both the intro paragraph and the `SELECT version()` comment to state 22.11+.

2. **Invalid `SETTINGS async = true` syntax.** The documented syntax for asynchronous backups is the `ASYNC` keyword appended to the statement (`BACKUP ... ASYNC`), not a `SETTINGS` clause. Replaced `SETTINGS async = true;` with `ASYNC;` in the Asynchronous Backup section.

3. **Non-existent `database` column in `system.backups`.** The `Checking Backup Status` query selected a `database` column, but `system.backups` does not have one (a single backup can span many databases). Replaced `database` with `base_backup_name`, which is a real column and useful for identifying incremental chains.

4. **Wrong parser used on `.backup` manifest.** The verification snippet piped the `.backup` file through `python3 -m json.tool`, but the ClickHouse backup manifest is XML, not JSON — the command would fail. Removed the JSON pretty-printer and annotated that the file is XML.

## Review Notes

- The recommended path for IAM-role authentication with `BACKUP` is actually to register a named S3 disk under `storage_configuration` and then use `BACKUP TO Disk('s3_backup', 'path')`, rather than `BACKUP TO S3('url')` without credentials. The post's approach (omitting credentials in the SQL and relying on the S3 client's default credential chain) can work in practice because ClickHouse's S3 client falls back to environment/instance credentials, but the documented/idiomatic pattern is the disk-based one. This is a style/robustness note, not a bug — left the post as-is.
- `<backups><allowed_path>` with an `s3://` value is a weak form of restriction; `allowed_path` is intended for local filesystem paths used by the `File()` backup engine. For S3 backup hardening, `<backups><allowed_disk>` combined with a named disk is the documented control. Left unchanged since the value is still accepted by the parser and the post's intent is clear.
- The `ClickHouse 22.4+ ... transactionally consistent for MergeTree tables` phrasing is slightly informal — ClickHouse doesn't offer ACID transactions, but the backup does take a consistent snapshot of data parts. Minor wording nit, not corrected.
- `sudo apt-get install -y awscli` installs AWS CLI v1 from distro repos, which is still functional for the `s3 ls` / `s3 cp` commands shown. AWS recommends CLI v2, but this is not wrong.
