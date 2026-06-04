# Validation Summary: How to Configure CockroachDB Backup Schedules with Full and Incremental Backups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CockroachDB backup and restore
- CockroachDB scheduled backups
- Kubernetes CronJob
- Amazon S3 and S3-compatible backup storage
- Bash scripting

## Sources Consulted
- CockroachDB BACKUP documentation: https://www.cockroachlabs.com/docs/stable/backup
- CockroachDB RESTORE documentation: https://www.cockroachlabs.com/docs/stable/restore
- CockroachDB CREATE SCHEDULE FOR BACKUP documentation: https://www.cockroachlabs.com/docs/stable/create-schedule-for-backup
- CockroachDB SHOW BACKUP documentation: https://www.cockroachlabs.com/docs/stable/show-backup
- CockroachDB SHOW JOBS documentation: https://www.cockroachlabs.com/docs/stable/show-jobs
- CockroachDB Use Cloud Storage documentation: https://www.cockroachlabs.com/docs/stable/use-cloud-storage
- CockroachDB Releases Overview: https://www.cockroachlabs.com/docs/releases/

## Issues Found
- The S3 backup URI was later used as `${BACKUP_URI}/full` even though the secret value already contained query parameters. Appending a path after `?AWS_ACCESS_KEY_ID=...` would corrupt the URI. I moved `/full` into the path portion of the URI and removed the later `/full` suffixes.
- The CockroachDB container image used `v23.1.0`, which is outdated for a 2026 tutorial. I updated the examples to the current stable `cockroachdb/cockroach:v26.2.1`.
- The full backup job used an invalid `SHOW JOBS SELECT ...` statement and did not track the actual detached job ID. I changed the backup command to capture the `DETACHED` job ID and query `SELECT status FROM [SHOW JOBS] WHERE job_id = ...`.
- The incremental backup job also ran detached but immediately reported completion. I changed it to capture and monitor the backup job ID before printing completion.
- The native schedule section created separate full and incremental schedules using `INTO LATEST IN`, which does not match the documented `CREATE SCHEDULE FOR BACKUP` syntax. I replaced it with one schedule using `RECURRING` for incrementals and `FULL BACKUP` for the daily full cadence.
- Several restore and monitoring examples still referenced the old `scheduled/full` collection URI. I made the collection URI consistent across scheduled backup, restore, monitoring, and validation examples.
- The restore script said it was monitoring progress after running a blocking restore. I changed it to run `RESTORE ... WITH detached`, capture the restore job ID, and monitor that specific job.
- The monitoring section used `SHOW BACKUP ... WITH revision_history`, which is not a valid `SHOW BACKUP` option. I changed it to `SHOW BACKUPS IN ... WITH REVISION START TIME`, which is the documented way to view revision-history windows.
- The validation scripts used `kubectl exec -it` in non-interactive command substitutions. I removed `-it` so the scripts are suitable for non-interactive execution.

## Review Notes
The examples still use inline S3 credentials for brevity, but production deployments should prefer external connections, IAM roles, or workload identity where available.
