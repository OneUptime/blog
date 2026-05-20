# Validation Summary: How to Handle Database Backup Schedules with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications and diff customization
- Kubernetes CronJobs
- CloudNativePG Cluster and ScheduledBackup resources
- PostgreSQL pg_dump and pg_restore
- MySQL mysqldump
- MongoDB mongodump
- AWS CLI for S3 backup storage
- Velero backup concepts

## Sources Consulted
- CloudNativePG scheduled backup documentation: https://github.com/cloudnative-pg/cloudnative-pg/blob/main/docs/src/backup.md
- CloudNativePG API reference: https://cloudnative-pg.io/docs/devel/cloudnative-pg.v1/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- PostgreSQL 16 pg_dump documentation: https://www.postgresql.org/docs/16/app-pgdump.html
- PostgreSQL pg_restore documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- MySQL 8.0 mysqldump documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MongoDB Database Tools mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- AWS CLI S3 command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/
- Velero backup and schedule documentation: https://velero.io/docs/v1.15/backup-reference/

## Issues Found
- CloudNativePG ScheduledBackup schedules used five-field Kubernetes-style cron expressions. CloudNativePG requires a six-field expression with seconds, so the daily and hourly examples were changed to `0 0 2 * * *` and `0 0 * * * *`.
- The Velero overview said Velero backups "capture everything including volumes." This was too absolute, so it now says Velero can capture Kubernetes resources and persistent volumes when configured with snapshots or file-system backups.
- The PostgreSQL CronJob used the official `postgres:16` image while calling `aws`, which that image does not provide. The example now uses a custom image placeholder that must include PostgreSQL client tools and AWS CLI.
- The PostgreSQL dump used custom-format pg_dump output but named it `.sql.gz`. The file and S3 object now use `.dump`, matching pg_dump custom archive output restored by `pg_restore`.
- The MySQL and MongoDB CronJobs wrote to `/backups` without defining a backing volume and did not upload the dump anywhere durable. They now define an `emptyDir`, upload to S3, clean up the local file, and use custom image placeholders that include the database tools plus AWS CLI.
- The MongoDB example used `mongo:7.0`, but `mongodump` is part of MongoDB Database Tools rather than the server image contract. The example now names a custom MongoDB Database Tools plus AWS CLI image.
- The verification CronJob used `aws`, `DB_HOST`, `DB_USER`, and `DB_PASSWORD` without defining the image requirements or environment variables. It now uses the custom PostgreSQL/AWS CLI image, defines the needed environment variables, uses the backup ServiceAccount, and fails explicitly when no backup is found.
- The retention CronJob used `grep -P`, which is less portable across container bases. It now uses `sed`, skips files without an embedded date, and defines AWS region and ServiceAccount settings.

## Review Notes
The examples are syntactically valid YAML. The custom image names are placeholders; a production implementation should build or select images that include the listed tools, pin immutable tags or digests, and prefer S3 lifecycle policies for retention when possible.
