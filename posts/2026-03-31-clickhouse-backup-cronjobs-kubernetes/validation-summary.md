# Validation Summary: How to Set Up ClickHouse Backup CronJobs on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Altinity `clickhouse-backup`
- Kubernetes (CronJob, Secret, `kubectl`)
- Amazon S3 (object storage backend)
- IRSA (IAM Roles for Service Accounts) on EKS

## Sources Consulted
- Altinity clickhouse-backup README: https://github.com/Altinity/clickhouse-backup/blob/master/ReadMe.md
- Altinity clickhouse-backup Examples: https://github.com/Altinity/clickhouse-backup/blob/master/Examples.md
- Altinity clickhouse-backup releases (v2.6.43 latest): https://github.com/Altinity/clickhouse-backup/releases/tag/v2.6.43
- Docker Hub image: https://hub.docker.com/r/altinity/clickhouse-backup
- Kubernetes CronJob API reference (`batch/v1` GA in 1.21): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- ClickHouse GRANT statement reference: https://clickhouse.com/docs/en/sql-reference/statements/grant

## Issues Found
1. **Wrong S3 credential env var names.** The post used `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`. The canonical env vars documented by `clickhouse-backup` are `S3_ACCESS_KEY` and `S3_SECRET_KEY` (they map to the `s3.access_key` / `s3.secret_key` config fields). Replaced both variable names in the CronJob manifest.
2. **Incorrect GRANT statements for the backup user.** The original SQL used `SHOW TABLES`, `SHOW DATABASES`, `dictGet`, and `SYSTEM FREEZE` — none of which are the privileges `clickhouse-backup` actually requires. In particular, `SYSTEM FREEZE` is not a valid ClickHouse privilege; the correct privilege is `ALTER FREEZE PARTITION`. Replaced the grants with the minimal set documented by Altinity (`SELECT ON system.*`, `ALTER FREEZE/FETCH PARTITION`, `CREATE/DROP TABLE`, `CREATE/DROP DATABASE`) so both create and restore operations succeed.
3. **Outdated image tag.** The post pinned `altinity/clickhouse-backup:2.5.0`. The current stable release at the time of publication (2026-03-31) is `v2.6.43`. Bumped all image references to `2.6.43`.

## Review Notes
- `apiVersion: batch/v1` for CronJob is correct for any Kubernetes 1.21+ cluster (the `batch/v1beta1` alias was removed in 1.25).
- Subcommands `create_remote`, `list remote`, and `restore_remote` with the `--tables=<db>.<table>` flag are all valid per the clickhouse-backup CLI.
- `backups_to_keep_remote` is the correct config key for remote retention; the corresponding env var is `BACKUPS_TO_KEEP_REMOTE`.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` will still work in practice because the underlying AWS SDK reads them as fallback, but they are not the documented interface for this tool — using `S3_ACCESS_KEY` / `S3_SECRET_KEY` is the canonical choice and also aligns with the Altinity examples.
- Consider recommending IRSA on EKS (already mentioned) or Workload Identity on GKE so static credentials can be dropped entirely.
