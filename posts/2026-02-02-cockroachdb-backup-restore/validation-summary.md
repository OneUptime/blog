# Validation Summary: How to Back Up and Restore CockroachDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CockroachDB (BACKUP, RESTORE, scheduled backups, PITR)
- SQL (CockroachDB dialect)
- AWS S3, Google Cloud Storage, Azure Blob Storage
- Bash (shell script automation)
- Kubernetes (CronJob manifests)
- AWS CLI

## Sources Consulted
- [CockroachDB RESTORE documentation](https://www.cockroachlabs.com/docs/stable/restore)
- [CockroachDB SHOW BACKUP documentation](https://www.cockroachlabs.com/docs/stable/show-backup)
- [CockroachDB BACKUP documentation](https://www.cockroachlabs.com/docs/stable/backup)
- [CockroachDB CREATE SCHEDULE FOR BACKUP documentation](https://www.cockroachlabs.com/docs/stable/create-schedule-for-backup)
- [CockroachDB Licensing FAQs](https://www.cockroachlabs.com/docs/stable/licensing-faqs)

## Issues Found

1. **Deprecated `SHOW BACKUP` syntax.** The post used the legacy form `SHOW BACKUP 's3://.../2024/01/15-120000.00?...'`, which has been replaced in modern CockroachDB by the collection-aware form. Updated it to `SHOW BACKUP FROM '2024/01/15-120000.00' IN 's3://my-bucket/backups/mydb?...'` to match the current documented syntax.

2. **Invalid `new_table_name` RESTORE option.** The post showed `RESTORE TABLE ... WITH into_db = 'mydb', new_table_name = 'users_restored'`. The official RESTORE WITH options do not include `new_table_name` — there is no supported way to rename a table during a RESTORE. Rewrote the example to restore the table into a different (pre-existing) database using `WITH into_db = 'mydb_restored'`, which is the documented approach.

3. **Misleading comment on `skip_missing_foreign_keys`.** The cluster restore example labelled the line "Restore cluster with specific databases excluded", but `skip_missing_foreign_keys` does not exclude databases — it allows the restore to proceed when foreign key constraints reference tables that aren't being restored. Updated the comment to accurately describe what the option does.

## Review Notes
- The post states that backup/restore "requires an enterprise license or CockroachDB Dedicated/Serverless". This was accurate for v23.x (which the Kubernetes example pins via `cockroachdb/cockroach:v23.2.0`). As of the August 2024 licensing change, the Enterprise edition is free for individual developers and companies under $10M in annual revenue, so most readers can use these features without a paid license — but the statement that a license is required is still technically correct and was left unchanged.
- The Kubernetes example pins `cockroachdb/cockroach:v23.2.0`. Readers running newer clusters should bump this image tag accordingly. No change made since the syntax shown is forward-compatible.
- The `RESTORE FROM LATEST IN '...'` cluster-restore example requires a fresh cluster with no user data; this is noted in the post text but worth highlighting if expanded later.
- All other SQL syntax (`BACKUP ... INTO`, `BACKUP ... INTO LATEST IN`, `CREATE SCHEDULE ... FOR BACKUP ... RECURRING ... FULL BACKUP ...`, `SHOW BACKUPS IN`, `SHOW BACKUP FROM LATEST IN ... WITH check_files`, `RESTORE ... WITH new_db_name`, `RESTORE ... WITH encryption_passphrase`, `RESTORE ... AS OF SYSTEM TIME`, schedule management with `PAUSE/RESUME/DROP SCHEDULE`) was verified against current CockroachDB documentation and is correct.
