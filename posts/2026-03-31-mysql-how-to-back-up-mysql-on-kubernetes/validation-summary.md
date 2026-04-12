# Validation Summary: How to Back Up MySQL on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Kubernetes (CronJob, PersistentVolumeClaim, Secrets)
- mysqldump
- AWS S3 (streaming upload)
- kubectl CLI

## Sources Consulted
- MySQL 8.0 Reference Manual - mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0.26 Release Notes (deprecation of --master-data): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-26.html
- Kubernetes API Reference - CronJob (batch/v1): https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes API Reference - PersistentVolumeClaim: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found

1. **`--master-data=2` is deprecated** (lines 84): The `--master-data` flag was deprecated in MySQL 8.0.26 and removed in MySQL 8.4. Changed to `--source-data=2`, which is the supported replacement introduced in MySQL 8.0.26.

2. **Misleading MySQL server hostname** (lines 78, 137): The mysqldump commands used `-h mysql-client.mysql.svc.cluster.local` as the MySQL server address. `mysql-client` is a confusing name for a server service. Changed to `mysql.mysql.svc.cluster.local`, which follows the standard Kubernetes naming convention for MySQL server services.

3. **Incorrect section heading "Backup to S3 Using a Sidecar"**: The S3 backup example pipes mysqldump output directly through gzip to `aws s3 cp` in a single container. This is a streaming upload, not a sidecar pattern (which would involve a separate container in the same pod). Changed heading to "Backup to S3 Using Streaming Upload".

4. **Missing image requirement for S3 backup**: The S3 backup snippet uses `aws s3 cp`, but the `mysql:8.0` Docker image does not include the AWS CLI. Added a note that a custom image containing both `mysqldump` and the AWS CLI is required.

5. **Monitor section targeted wrong pod for listing backups**: The command to list backup files used `kubectl exec` on a pod labeled `app=mysql` (the MySQL server pod), but the backup PVC is only mounted on the CronJob pods. Since CronJob pods enter Completed state after the job finishes and cannot be exec'd into, replaced the command with a temporary pod approach using `kubectl run --rm` with the backup PVC mounted.

6. **Restore section used wrong backup filename**: The restore commands referenced `mysql-backup-20260101-020000.sql.gz`, but the backup script produces files named `all-databases-YYYYMMDD-HHMMSS.sql.gz`. Fixed to use the correct filename format.

## Review Notes
- The restore command uses `mysql -u root -p` which prompts for a password interactively. This works with `kubectl exec -it` but could be improved by passing the password via an environment variable for scripted restores.
- The `--source-data=2` flag records the binary log position as a SQL comment in the dump file, which is useful for point-in-time recovery. This requires the `RELOAD` privilege, which the root user has.
- The `find /backup -name "*.sql.gz" -mtime +7 -delete` pruning command is shown as a standalone bash snippet. For production use, it should be appended to the CronJob's backup command to run automatically after each backup.
