# How to Set Up ClickHouse Backup CronJobs on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Kubernetes, Backup, CronJob, S3

Description: Automate ClickHouse backups on Kubernetes using CronJobs that run clickhouse-backup to push snapshots to S3 or other object storage.

---

Automating ClickHouse backups with Kubernetes CronJobs ensures you have regular, consistent snapshots without manual intervention. The `clickhouse-backup` tool is the de facto solution for this workflow.

## Installing clickhouse-backup

`clickhouse-backup` is an open-source tool that supports local, S3, GCS, and Azure storage backends. Use it as the container image in your CronJob:

```yaml
image: altinity/clickhouse-backup:2.6.43
```

## Creating the Backup CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: clickhouse-backup
  namespace: clickhouse
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: clickhouse-backup
              image: altinity/clickhouse-backup:2.6.43
              args: ["create_remote"]
              env:
                - name: CLICKHOUSE_HOST
                  value: "clickhouse.clickhouse.svc.cluster.local"
                - name: CLICKHOUSE_PORT
                  value: "9000"
                - name: CLICKHOUSE_USERNAME
                  value: "backup_user"
                - name: CLICKHOUSE_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: clickhouse-backup-secret
                      key: password
                - name: REMOTE_STORAGE
                  value: "s3"
                - name: S3_BUCKET
                  value: "my-clickhouse-backups"
                - name: S3_PATH
                  value: "backups"
                - name: S3_REGION
                  value: "us-east-1"
                - name: S3_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: clickhouse-backup-secret
                      key: aws-key-id
                - name: S3_SECRET_KEY
                  valueFrom:
                    secretKeyRef:
                      name: clickhouse-backup-secret
                      key: aws-secret-key
```

## Creating the Backup User

Create a dedicated ClickHouse user for backups with minimal privileges:

```sql
CREATE USER backup_user IDENTIFIED BY 'secure_password';
GRANT SELECT ON system.* TO backup_user;
GRANT ALTER FREEZE PARTITION, ALTER FETCH PARTITION ON *.* TO backup_user;
GRANT CREATE TABLE, DROP TABLE ON *.* TO backup_user;
GRANT CREATE DATABASE, DROP DATABASE ON *.* TO backup_user;
```

## Storing Secrets Safely

```bash
kubectl create secret generic clickhouse-backup-secret \
  --from-literal=password='secure_password' \
  --from-literal=aws-key-id='AKIAIOSFODNN7EXAMPLE' \
  --from-literal=aws-secret-key='wJalrXUtnFEMI...' \
  -n clickhouse
```

Use IRSA (IAM Roles for Service Accounts) on EKS instead of static credentials for better security.

## Verifying Backups

Add a separate CronJob to verify backup integrity weekly:

```yaml
spec:
  schedule: "0 6 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: verify-backup
              image: altinity/clickhouse-backup:2.6.43
              args: ["list", "remote"]
```

## Restore Process

To restore from a backup:

```bash
kubectl run clickhouse-restore --rm -it \
  --image=altinity/clickhouse-backup:2.6.43 \
  --restart=Never \
  -- restore_remote --tables=mydb.events backup_name
```

## Retention Policy

Configure automatic cleanup of old backups in the clickhouse-backup config:

```yaml
backups_to_keep_remote: 7
```

## Summary

Kubernetes CronJobs provide a reliable way to schedule ClickHouse backups using `clickhouse-backup`. Run nightly backups with `create_remote`, store credentials in Kubernetes Secrets, use a dedicated ClickHouse backup user, and add a weekly verification job to confirm backups are restorable.
