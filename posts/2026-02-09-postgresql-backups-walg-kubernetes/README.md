# How to Set Up Automated Database Backups for PostgreSQL on Kubernetes Using WAL-G

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, Backups

Description: Learn how to implement automated PostgreSQL backups on Kubernetes using WAL-G for continuous archival, point-in-time recovery, and efficient incremental backups to cloud storage.

---

Database backups are critical insurance against data loss, corruption, and human error. WAL-G provides efficient PostgreSQL backup and recovery by streaming write-ahead logs to object storage and creating periodic base backups. This guide demonstrates implementing automated PostgreSQL backups on Kubernetes with WAL-G, enabling point-in-time recovery and disaster recovery capabilities.

## Understanding WAL-G Architecture

WAL-G operates at the PostgreSQL WAL (Write-Ahead Log) level, continuously archiving transaction logs to object storage like S3, GCS, or Azure Blob. It periodically creates full base backups and stores them alongside WAL archives. This approach enables point-in-time recovery to any moment between backups, not just specific backup snapshots.

The incremental nature of WAL archiving makes continuous backup feasible. Only changes since the last archive are uploaded, minimizing storage costs and network bandwidth. WAL-G also compresses and encrypts data, providing efficient and secure backups.

## Deploying PostgreSQL with WAL-G Sidecar

Create a PostgreSQL StatefulSet with WAL-G sidecar for backup operations:

```yaml
# postgres-with-walg.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-config
  namespace: database
data:
  postgresql.conf: |
    # WAL configuration for archiving
    wal_level = replica
    archive_mode = on
    archive_command = 'envdir /etc/wal-g/env wal-g wal-push %p'
    archive_timeout = 60
    max_wal_senders = 10
    wal_keep_size = 1024

    # Performance tuning
    shared_buffers = 2GB
    effective_cache_size = 6GB
    maintenance_work_mem = 512MB
    checkpoint_completion_target = 0.9
    wal_buffers = 16MB
    default_statistics_target = 100
    random_page_cost = 1.1
    effective_io_concurrency = 200
    work_mem = 10MB
    min_wal_size = 1GB
    max_wal_size = 4GB

  recovery.conf: |
    # Recovery configuration for WAL-G
    restore_command = 'envdir /etc/wal-g/env wal-g wal-fetch %f %p'
    recovery_target_timeline = 'latest'
---
apiVersion: v1
kind: Secret
metadata:
  name: walg-config
  namespace: database
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: "your-access-key"
  AWS_SECRET_ACCESS_KEY: "your-secret-key"
  AWS_REGION: "us-west-2"
  WALG_S3_PREFIX: "s3://postgres-backups/production"
  WALG_COMPRESSION_METHOD: "lz4"
  WALG_DELTA_MAX_STEPS: "6"
  PGHOST: "localhost"
  PGPORT: "5432"
  PGUSER: "postgres"
  PGPASSWORD: "your-postgres-password"
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: database
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      initContainers:
        # Restore from backup on first start
        - name: restore-backup
          image: wal-g/wal-g:latest
          command:
            - /bin/sh
            - -c
            - |
              if [ -f /var/lib/postgresql/data/PG_VERSION ]; then
                echo "Database already exists, skipping restore"
                exit 0
              fi

              echo "Checking for existing backups..."
              envdir /etc/wal-g/env wal-g backup-list

              if [ $? -eq 0 ]; then
                echo "Restoring from latest backup..."
                envdir /etc/wal-g/env wal-g backup-fetch /var/lib/postgresql/data LATEST
              else
                echo "No backups found, will initialize new database"
              fi
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: walg-config
              mountPath: /etc/wal-g/env

      containers:
        - name: postgres
          image: postgres:16-alpine
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: walg-config
                  key: PGPASSWORD
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: postgres-config
              mountPath: /etc/postgresql
            - name: walg-config
              mountPath: /etc/wal-g/env
          command:
            - postgres
            - -c
            - config_file=/etc/postgresql/postgresql.conf
          resources:
            requests:
              cpu: "2"
              memory: "4Gi"
            limits:
              cpu: "4"
              memory: "8Gi"

        # WAL-G sidecar for backup operations
        - name: walg
          image: wal-g/wal-g:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "WAL-G sidecar started, ready for backup operations"
              # Keep container running
              tail -f /dev/null
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: walg-config
              mountPath: /etc/wal-g/env

      volumes:
        - name: postgres-config
          configMap:
            name: postgres-config
        - name: walg-config
          secret:
            secretName: walg-config

  volumeClaimTemplates:
    - metadata:
        name: postgres-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: fast-ssd
        resources:
          requests:
            storage: 100Gi
```

Deploy PostgreSQL:

```bash
kubectl create namespace database
kubectl apply -f postgres-with-walg.yaml

# Verify deployment
kubectl get pods -n database
```

## Creating Scheduled Base Backups

Create a CronJob for periodic full backups:

```yaml
# walg-backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: database
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: wal-g/wal-g:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "Starting backup at $(date)"

                  # Create backup
                  envdir /etc/wal-g/env wal-g backup-push /var/lib/postgresql/data

                  if [ $? -eq 0 ]; then
                    echo "Backup completed successfully"

                    # Delete old backups (keep last 7 days)
                    envdir /etc/wal-g/env wal-g delete --confirm retain 7

                    # List current backups
                    envdir /etc/wal-g/env wal-g backup-list
                  else
                    echo "Backup failed!"
                    exit 1
                  fi
              volumeMounts:
                - name: postgres-data
                  mountPath: /var/lib/postgresql/data
                  readOnly: true
                - name: walg-config
                  mountPath: /etc/wal-g/env
              resources:
                requests:
                  cpu: 500m
                  memory: 512Mi

          volumes:
            - name: postgres-data
              persistentVolumeClaim:
                claimName: postgres-data-postgres-0
            - name: walg-config
              secret:
                secretName: walg-config
```

Deploy the backup job:

```bash
kubectl apply -f walg-backup-cronjob.yaml

# Trigger manual backup immediately
kubectl create job --from=cronjob/postgres-backup manual-backup-1 -n database

# Monitor backup progress
kubectl logs -f job/manual-backup-1 -n database
```

## Verifying Backup Success

Check backup status and list available backups:

```bash
# List all backups
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g backup-list

# Output shows:
# name                          last_modified        wal_segment_backup_start
# base_000000010000000000000003 2026-02-09T02:00:00Z 000000010000000000000003

# Check WAL archives
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g wal-verify integrity

# Verify backup integrity
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g backup-fetch /tmp/restore-test LATEST --verify

# Check backup size
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g backup-list --detail
```

## Implementing Point-in-Time Recovery

Restore database to a specific timestamp:

```bash
# Stop PostgreSQL
kubectl scale statefulset postgres --replicas=0 -n database

# Create recovery job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: postgres-pitr
  namespace: database
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: restore
          image: wal-g/wal-g:latest
          command:
            - /bin/sh
            - -c
            - |
              echo "Starting point-in-time recovery..."

              # Clear existing data
              rm -rf /var/lib/postgresql/data/pgdata/*

              # Restore base backup
              envdir /etc/wal-g/env wal-g backup-fetch \
                /var/lib/postgresql/data/pgdata LATEST

              # Create recovery.signal file
              touch /var/lib/postgresql/data/pgdata/recovery.signal

              # Configure recovery target
              cat >> /var/lib/postgresql/data/pgdata/postgresql.auto.conf <<RECOVERY
              restore_command = 'envdir /etc/wal-g/env wal-g wal-fetch %f %p'
              recovery_target_time = '2026-02-09 14:30:00'
              recovery_target_action = 'promote'
              RECOVERY

              echo "Recovery configuration complete"
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
            - name: walg-config
              mountPath: /etc/wal-g/env
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-data-postgres-0
        - name: walg-config
          secret:
            secretName: walg-config
EOF

# Wait for recovery job to complete
kubectl wait --for=condition=complete --timeout=600s job/postgres-pitr -n database

# Restart PostgreSQL
kubectl scale statefulset postgres --replicas=1 -n database

# PostgreSQL will apply WAL archives up to the target time
kubectl logs -f -n database postgres-0 -c postgres
```

## Monitoring Backup Operations

Create monitoring for backup health:

```yaml
# backup-monitor.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-monitor
  namespace: database
data:
  check-backups.sh: |
    #!/bin/bash

    # Check last backup age
    LAST_BACKUP=$(envdir /etc/wal-g/env wal-g backup-list --json | \
      jq -r '.[0].time' | date -d - +%s)

    CURRENT_TIME=$(date +%s)
    AGE=$((CURRENT_TIME - LAST_BACKUP))
    MAX_AGE=$((24 * 3600))  # 24 hours

    if [ $AGE -gt $MAX_AGE ]; then
      echo "CRITICAL: Last backup is $((AGE / 3600)) hours old"
      exit 2
    fi

    # Check WAL archiving
    WAL_COUNT=$(envdir /etc/wal-g/env wal-g wal-verify | grep "verified" | wc -l)

    if [ $WAL_COUNT -lt 10 ]; then
      echo "WARNING: Only $WAL_COUNT WAL archives found"
      exit 1
    fi

    echo "OK: Backups are current, $WAL_COUNT WAL archives verified"
    exit 0
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-monitor
  namespace: database
spec:
  schedule: "*/30 * * * *"  # Every 30 minutes
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: monitor
              image: wal-g/wal-g:latest
              command:
                - /bin/bash
                - /scripts/check-backups.sh
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
                - name: walg-config
                  mountPath: /etc/wal-g/env
          volumes:
            - name: scripts
              configMap:
                name: backup-monitor
                defaultMode: 0755
            - name: walg-config
              secret:
                secretName: walg-config
```

## Configuring Backup Retention Policies

Implement automated cleanup of old backups:

```bash
# Keep backups based on multiple criteria
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g delete --confirm retain FULL 7

# This keeps:
# - 7 most recent full backups
# - All WAL archives needed for those backups

# Alternative: keep backups within time window
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g delete --confirm before \
  "2026-01-01T00:00:00Z"

# Or keep specific backup count
kubectl exec -it -n database postgres-0 -c walg -- \
  envdir /etc/wal-g/env wal-g delete --confirm retain 10
```

## Implementing Backup Encryption

Enable encryption for backups at rest:

```yaml
# Add to walg-config secret
apiVersion: v1
kind: Secret
metadata:
  name: walg-config
  namespace: database
stringData:
  # ... existing config ...
  WALG_GPG_KEY_ID: "your-gpg-key-id"
  WALG_PGP_KEY: |
    -----BEGIN PGP PRIVATE KEY BLOCK-----
    ... your PGP key ...
    -----END PGP PRIVATE KEY BLOCK-----
  WALG_PGP_KEY_PASSPHRASE: "your-passphrase"
```

Backups will be encrypted before upload to object storage.

## Testing Disaster Recovery

Regularly test recovery procedures:

```bash
# Create test namespace for recovery testing
kubectl create namespace database-test

# Deploy test PostgreSQL instance
# ... deploy postgres-with-walg.yaml to database-test namespace ...

# Restore will happen automatically via initContainer

# Verify data
kubectl exec -it -n database-test postgres-0 -c postgres -- \
  psql -U postgres -c "SELECT COUNT(*) FROM your_table;"
```

## Conclusion

WAL-G provides robust, efficient PostgreSQL backups on Kubernetes through continuous WAL archiving and periodic base backups. The point-in-time recovery capability protects against both infrastructure failures and human errors, enabling recovery to any moment between backups.

The key to successful implementation is regular testing of recovery procedures and monitoring backup health. By automating backup creation, verification, and retention management, you create a reliable disaster recovery system that protects your data without manual intervention. Combined with proper encryption and monitoring, WAL-G delivers enterprise-grade backup capabilities for PostgreSQL on Kubernetes.
