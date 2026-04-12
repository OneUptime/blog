# How to Back Up MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Kubernetes, Backup, CronJob, Database

Description: Learn how to back up MySQL running on Kubernetes using CronJobs, mysqldump, and persistent volumes for reliable automated backups.

---

## Backup Strategies for MySQL on Kubernetes

Running MySQL on Kubernetes introduces unique backup challenges. Pods are ephemeral, so backups must be stored outside the MySQL pod - either in object storage (S3, GCS) or on a separate persistent volume. The two most common approaches are:

1. **mysqldump** - logical backups, portable but slower for large databases
2. **Volume snapshots** - faster, but requires CSI snapshot support

This guide covers `mysqldump`-based backups using Kubernetes CronJobs.

## Store Credentials as a Secret

```bash
kubectl create secret generic mysql-backup-secret \
  --from-literal=MYSQL_ROOT_PASSWORD=S3cur3P@ssw0rd \
  -n mysql
```

## Create a Backup PersistentVolumeClaim

```yaml
# backup-pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mysql-backup-pvc
  namespace: mysql
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 50Gi
```

```bash
kubectl apply -f backup-pvc.yaml
```

## Create a Daily Backup CronJob

```yaml
# mysql-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: mysql-backup
  namespace: mysql
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: mysql-backup
              image: mysql:8.0
              command:
                - /bin/sh
                - -c
                - |
                  DATE=$(date +%Y%m%d-%H%M%S)
                  mysqldump \
                    -h mysql.mysql.svc.cluster.local \
                    -u root \
                    -p${MYSQL_ROOT_PASSWORD} \
                    --all-databases \
                    --single-transaction \
                    --flush-logs \
                    --source-data=2 \
                    | gzip > /backup/all-databases-${DATE}.sql.gz
                  echo "Backup completed: all-databases-${DATE}.sql.gz"
              env:
                - name: MYSQL_ROOT_PASSWORD
                  valueFrom:
                    secretKeyRef:
                      name: mysql-backup-secret
                      key: MYSQL_ROOT_PASSWORD
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: mysql-backup-pvc
```

```bash
kubectl apply -f mysql-backup-cronjob.yaml
```

## Trigger a Manual Backup

```bash
kubectl create job --from=cronjob/mysql-backup mysql-backup-manual -n mysql
```

## Monitor Backup Jobs

```bash
# List recent backup jobs
kubectl get jobs -n mysql

# View backup logs
kubectl logs -l job-name=mysql-backup-manual -n mysql

# List backup files (start a temporary pod with the backup PVC)
kubectl run backup-list -n mysql --rm -i --restart=Never --image=busybox \
  --overrides='{"spec":{"volumes":[{"name":"backup-storage","persistentVolumeClaim":{"claimName":"mysql-backup-pvc"}}],"containers":[{"name":"backup-list","image":"busybox","command":["ls","-lh","/backup/"],"volumeMounts":[{"name":"backup-storage","mountPath":"/backup"}]}]}}'
```

## Backup to S3 Using Streaming Upload

For production workloads, push backups to S3 rather than a local PVC:

```yaml
command:
  - /bin/sh
  - -c
  - |
    DATE=$(date +%Y%m%d-%H%M%S)
    mysqldump \
      -h mysql.mysql.svc.cluster.local \
      -u root -p${MYSQL_ROOT_PASSWORD} \
      --all-databases \
      --single-transaction \
      | gzip \
      | aws s3 cp - s3://my-mysql-backups/all-databases-${DATE}.sql.gz
```

This requires an image that includes both `mysqldump` and the AWS CLI (e.g., a custom image). You will also need to add AWS credentials as environment variables or use an IAM role for service accounts (IRSA) on EKS.

## Prune Old Backups

Add a cleanup step to prevent disk bloat:

```bash
# Delete backups older than 7 days
find /backup -name "*.sql.gz" -mtime +7 -delete
```

## Restore from a Backup

```bash
# Copy the backup file to a running pod
kubectl cp all-databases-20260101-020000.sql.gz mysql/mysql-0:/tmp/

# Restore
kubectl exec -it mysql-0 -n mysql -- bash -c \
  "gunzip -c /tmp/all-databases-20260101-020000.sql.gz | mysql -u root -p"
```

## Summary

Backing up MySQL on Kubernetes requires using CronJobs to schedule regular `mysqldump` exports, storing results on a dedicated PVC or in object storage. For production environments, always push backups off-cluster to S3 or GCS and test restores regularly to validate backup integrity.
