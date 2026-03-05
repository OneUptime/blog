# How to Configure YugabyteDB Backup and Restore Using YSQL Dump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, YugabyteDB, Backup, Disaster Recovery, YSQL

Description: Implement automated backup and restore strategies for YugabyteDB on Kubernetes using ysql_dump and ysqlsh, including point-in-time recovery, incremental backups, and disaster recovery procedures.

---

YugabyteDB backups protect against data loss from user errors, corruption, or disaster scenarios. The ysql_dump utility creates logical backups compatible with PostgreSQL tools, making it familiar for teams with PostgreSQL experience.

## Understanding YugabyteDB Backup Options

YugabyteDB supports two backup approaches. Logical backups using ysql_dump export data and schema as SQL statements. Physical backups using snapshots capture raw data files. Each approach has different use cases and trade-offs.

Logical backups work across YugabyteDB versions and allow selective restore of specific databases or tables. They compress well and integrate easily with object storage. However, they are slower for large databases and require database resources during dump.

Physical snapshots are faster for large datasets and have minimal performance impact. They require more storage space and must restore to the same or newer YugabyteDB version. For most Kubernetes deployments, logical backups provide the best balance of flexibility and simplicity.

## Creating Manual Database Backups

Access a YugabyteDB pod to run backup commands:

```bash
# Get a shell in a tablet server pod
kubectl exec -it yb-tserver-0 -n yugabyte -- bash

# Backup a single database
/home/yugabyte/bin/ysql_dump \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -d production_db \
  -F c \
  -f /tmp/production_db.backup

# Backup with compression
/home/yugabyte/bin/ysql_dump \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -d production_db \
  | gzip > /tmp/production_db.sql.gz

# Backup all databases
/home/yugabyte/bin/ysql_dumpall \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  | gzip > /tmp/all_databases.sql.gz
```

The `-F c` flag creates a custom format archive that supports parallel restore and selective object restoration. Plain SQL format works better for debugging and version control.

## Implementing Automated Backup CronJob

Create a Kubernetes CronJob for scheduled backups:

```yaml
# yugabyte-backup-cronjob.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-script
  namespace: yugabyte
data:
  backup.sh: |
    #!/bin/bash
    set -e

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_DIR="/backups"
    S3_BUCKET="s3://my-yugabyte-backups"

    echo "Starting backup at $TIMESTAMP"

    # Get list of databases
    DATABASES=$(/home/yugabyte/bin/ysqlsh \
      -h yb-tserver-service \
      -p 5433 \
      -U yugabyte \
      -t \
      -c "SELECT datname FROM pg_database WHERE datistemplate = false AND datname != 'system_platform';" \
      | grep -v "^$")

    # Backup each database
    for DB in $DATABASES; do
      echo "Backing up database: $DB"

      /home/yugabyte/bin/ysql_dump \
        -h yb-tserver-service \
        -p 5433 \
        -U yugabyte \
        -d "$DB" \
        -F c \
        -Z 9 \
        -f "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup"

      # Calculate checksum
      md5sum "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup" > "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup.md5"

      # Upload to S3
      aws s3 cp "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup" "$S3_BUCKET/$DB/" --storage-class STANDARD_IA
      aws s3 cp "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup.md5" "$S3_BUCKET/$DB/"

      # Remove local backup
      rm "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup"
      rm "$BACKUP_DIR/${DB}-${TIMESTAMP}.backup.md5"
    done

    # Backup global objects (roles, tablespaces, etc.)
    echo "Backing up global objects"
    /home/yugabyte/bin/ysql_dumpall \
      -h yb-tserver-service \
      -p 5433 \
      -U yugabyte \
      --globals-only \
      | gzip > "$BACKUP_DIR/globals-${TIMESTAMP}.sql.gz"

    aws s3 cp "$BACKUP_DIR/globals-${TIMESTAMP}.sql.gz" "$S3_BUCKET/globals/"
    rm "$BACKUP_DIR/globals-${TIMESTAMP}.sql.gz"

    # Clean up old backups (keep last 30 days)
    for DB in $DATABASES; do
      aws s3 ls "$S3_BUCKET/$DB/" | \
        awk '{print $4}' | \
        sort -r | \
        tail -n +31 | \
        xargs -I {} aws s3 rm "$S3_BUCKET/$DB/{}"
    done

    echo "Backup completed successfully at $(date)"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: yugabyte-backup
  namespace: yugabyte
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        metadata:
          labels:
            app: yugabyte-backup
        spec:
          restartPolicy: OnFailure
          serviceAccountName: yugabyte-backup-sa
          containers:
            - name: backup
              image: yugabytedb/yugabyte:2.19.3.0-b140
              command:
                - /bin/bash
                - /scripts/backup.sh
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
                - name: AWS_DEFAULT_REGION
                  value: us-east-1
              volumeMounts:
                - name: backup-script
                  mountPath: /scripts
                - name: backup-storage
                  mountPath: /backups
              resources:
                requests:
                  memory: "1Gi"
                  cpu: "500m"
                limits:
                  memory: "2Gi"
                  cpu: "1000m"
          volumes:
            - name: backup-script
              configMap:
                name: backup-script
                defaultMode: 0755
            - name: backup-storage
              emptyDir:
                sizeLimit: 50Gi
```

## Creating Required RBAC and Secrets

Set up service account and AWS credentials:

```bash
# Create service account
kubectl create serviceaccount yugabyte-backup-sa -n yugabyte

# Create AWS credentials secret
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n yugabyte

# Apply the CronJob
kubectl apply -f yugabyte-backup-cronjob.yaml
```

## Implementing Incremental Backup Strategy

Track changes since last backup using transaction timestamps:

```yaml
# incremental-backup-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: incremental-backup-script
  namespace: yugabyte
data:
  incremental-backup.sh: |
    #!/bin/bash
    set -e

    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    BACKUP_DIR="/backups"
    S3_BUCKET="s3://my-yugabyte-backups"
    STATE_FILE="$BACKUP_DIR/last_backup_time.txt"

    # Get last backup timestamp
    if [ -f "$STATE_FILE" ]; then
      LAST_BACKUP=$(cat "$STATE_FILE")
    else
      LAST_BACKUP="1970-01-01 00:00:00"
    fi

    echo "Incremental backup since: $LAST_BACKUP"

    # Query changed rows (requires application-level timestamp tracking)
    /home/yugabyte/bin/ysqlsh \
      -h yb-tserver-service \
      -p 5433 \
      -U yugabyte \
      -d production_db \
      -c "COPY (SELECT * FROM audit_log WHERE updated_at > '$LAST_BACKUP') TO STDOUT" \
      | gzip > "$BACKUP_DIR/incremental-${TIMESTAMP}.csv.gz"

    # Upload to S3
    aws s3 cp "$BACKUP_DIR/incremental-${TIMESTAMP}.csv.gz" "$S3_BUCKET/incremental/"

    # Update state file
    date '+%Y-%m-%d %H:%M:%S' > "$STATE_FILE"

    echo "Incremental backup completed"
```

## Restoring from Backups

Download and restore a backup:

```bash
# Download backup from S3
kubectl exec -it yb-tserver-0 -n yugabyte -- bash

# Inside the pod
aws s3 cp s3://my-yugabyte-backups/production_db/production_db-20260209-020000.backup /tmp/

# Verify checksum
aws s3 cp s3://my-yugabyte-backups/production_db/production_db-20260209-020000.backup.md5 /tmp/
md5sum -c /tmp/production_db-20260209-020000.backup.md5

# Drop existing database (careful!)
/home/yugabyte/bin/ysqlsh \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -c "DROP DATABASE IF EXISTS production_db;"

# Create new database
/home/yugabyte/bin/ysqlsh \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -c "CREATE DATABASE production_db;"

# Restore from backup
/home/yugabyte/bin/pg_restore \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -d production_db \
  -F c \
  -j 4 \
  /tmp/production_db-20260209-020000.backup
```

The `-j 4` flag enables parallel restore using 4 jobs, significantly speeding up large restores.

## Selective Table Restore

Restore specific tables from a backup:

```bash
# List contents of backup
/home/yugabyte/bin/pg_restore \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  --list \
  /tmp/production_db-20260209-020000.backup

# Restore only specific tables
/home/yugabyte/bin/pg_restore \
  -h yb-tserver-service \
  -p 5433 \
  -U yugabyte \
  -d production_db \
  -F c \
  -t users \
  -t orders \
  /tmp/production_db-20260209-020000.backup
```

## Implementing Point-in-Time Recovery

While ysql_dump doesn't support true PITR, you can approximate it with frequent backups:

```yaml
# frequent-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: yugabyte-frequent-backup
  namespace: yugabyte
spec:
  schedule: "0 */4 * * *"  # Every 4 hours
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: yugabytedb/yugabyte:2.19.3.0-b140
              command:
                - sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)

                  /home/yugabyte/bin/ysql_dump \
                    -h yb-tserver-service \
                    -p 5433 \
                    -U yugabyte \
                    -d production_db \
                    -F c \
                    -Z 9 \
                    | aws s3 cp - s3://my-yugabyte-backups/pitr/production_db-${TIMESTAMP}.backup

                  # Keep only last 7 days of PITR backups
                  aws s3 ls s3://my-yugabyte-backups/pitr/ | \
                    awk '{print $4}' | \
                    sort -r | \
                    tail -n +43 | \
                    xargs -I {} aws s3 rm s3://my-yugabyte-backups/pitr/{}
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
```

## Testing Backup Restoration

Regularly test backups to ensure they work:

```yaml
# backup-test-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: backup-restore-test
  namespace: yugabyte
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: test
          image: yugabytedb/yugabyte:2.19.3.0-b140
          command:
            - sh
            - -c
            - |
              # Download latest backup
              LATEST=$(aws s3 ls s3://my-yugabyte-backups/production_db/ | \
                grep backup$ | \
                sort | \
                tail -1 | \
                awk '{print $4}')

              aws s3 cp "s3://my-yugabyte-backups/production_db/$LATEST" /tmp/test.backup

              # Create test database
              /home/yugabyte/bin/ysqlsh \
                -h yb-tserver-service \
                -p 5433 \
                -U yugabyte \
                -c "DROP DATABASE IF EXISTS backup_test; CREATE DATABASE backup_test;"

              # Restore to test database
              /home/yugabyte/bin/pg_restore \
                -h yb-tserver-service \
                -p 5433 \
                -U yugabyte \
                -d backup_test \
                -F c \
                -j 4 \
                /tmp/test.backup

              # Run validation queries
              /home/yugabyte/bin/ysqlsh \
                -h yb-tserver-service \
                -p 5433 \
                -U yugabyte \
                -d backup_test \
                -c "SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM orders;"

              # Cleanup
              /home/yugabyte/bin/ysqlsh \
                -h yb-tserver-service \
                -p 5433 \
                -U yugabyte \
                -c "DROP DATABASE backup_test;"

              echo "Backup restore test completed successfully"
          env:
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: access-key-id
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: aws-credentials
                  key: secret-access-key
```

## Monitoring Backup Jobs

Check backup job status:

```bash
# View recent backup jobs
kubectl get jobs -n yugabyte -l app=yugabyte-backup

# Check job logs
kubectl logs -n yugabyte -l job-name=yugabyte-backup-28458520

# View failed jobs
kubectl get jobs -n yugabyte --field-selector status.successful!=1
```

Set up alerts for backup failures using Prometheus rules or CloudWatch.

## Disaster Recovery Procedures

Document your DR process:

1. Provision new YugabyteDB cluster in disaster recovery region
2. Download latest full backup from S3
3. Restore global objects first using ysql_dumpall globals backup
4. Restore each database using pg_restore with parallel jobs
5. Verify data integrity by comparing row counts and checksums
6. Update application connection strings to point to DR cluster

YugabyteDB backup using ysql_dump provides reliable protection against data loss with minimal operational complexity on Kubernetes. Regular automated backups combined with tested restore procedures ensure your data remains safe and recoverable.
