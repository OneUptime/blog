# How to Implement PostgreSQL Point-in-Time Recovery with WAL-G on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Kubernetes, Backup, WAL-G, Disaster Recovery

Description: Learn how to implement PostgreSQL point-in-time recovery with WAL-G on Kubernetes, enabling precise recovery to any moment in time through continuous WAL archiving and automated backup management.

---

Point-in-time recovery (PITR) allows you to restore a PostgreSQL database to any specific moment in time, protecting against data corruption, accidental deletions, and application bugs. WAL-G provides efficient WAL archiving and backup management for PostgreSQL on Kubernetes, enabling production-grade PITR capabilities with minimal operational overhead.

## Understanding Point-in-Time Recovery

PITR combines two elements:

- Base backups: Full snapshots of the database taken periodically
- WAL archives: Continuous stream of transaction logs (Write-Ahead Logs)

By replaying WAL logs from a base backup forward to a specific timestamp, you can recover to any point in time between backups.

## Installing WAL-G

WAL-G is a backup tool that handles both base backups and continuous WAL archiving:

```bash
# Download WAL-G binary
wget https://github.com/wal-g/wal-g/releases/download/v2.0.1/wal-g-pg-ubuntu-20.04-amd64.tar.gz
tar -xzf wal-g-pg-ubuntu-20.04-amd64.tar.gz
```

For Kubernetes, create a custom PostgreSQL image with WAL-G:

```dockerfile
FROM postgres:16

# Install WAL-G
RUN apt-get update && \
    apt-get install -y wget && \
    wget https://github.com/wal-g/wal-g/releases/download/v2.0.1/wal-g-pg-ubuntu-20.04-amd64.tar.gz && \
    tar -xzf wal-g-pg-ubuntu-20.04-amd64.tar.gz && \
    mv wal-g-pg-ubuntu-20.04-amd64 /usr/local/bin/wal-g && \
    chmod +x /usr/local/bin/wal-g && \
    rm wal-g-pg-ubuntu-20.04-amd64.tar.gz

# Install AWS CLI for S3 access
RUN apt-get install -y awscli
```

Build and push the image:

```bash
docker build -t myregistry/postgres-walg:16 .
docker push myregistry/postgres-walg:16
```

## Configuring PostgreSQL for WAL Archiving

Configure PostgreSQL to archive WAL files:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-walg-config
  namespace: database
data:
  postgresql.conf: |
    # WAL configuration for PITR
    wal_level = replica
    archive_mode = on
    archive_command = 'wal-g wal-push %p'
    archive_timeout = 300  # Archive WAL every 5 minutes

    # Performance settings
    max_wal_senders = 3
    max_replication_slots = 3
    shared_buffers = 256MB
    max_connections = 200
    checkpoint_timeout = 15min
    checkpoint_completion_target = 0.9

  walg-env.sh: |
    export WALG_S3_PREFIX=s3://postgres-backups/wal-archive
    export AWS_REGION=us-east-1
    export PGDATA=/var/lib/postgresql/data/pgdata
    export PGHOST=/var/run/postgresql
```

## Deploying PostgreSQL with WAL-G

Deploy PostgreSQL StatefulSet with WAL-G:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-walg
  namespace: database
spec:
  serviceName: postgres-walg
  replicas: 1
  selector:
    matchLabels:
      app: postgres-walg
  template:
    metadata:
      labels:
        app: postgres-walg
    spec:
      containers:
      - name: postgres
        image: myregistry/postgres-walg:16
        ports:
        - containerPort: 5432
          name: postgres
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
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
        - name: WALG_S3_PREFIX
          value: s3://postgres-backups/wal-archive
        - name: AWS_REGION
          value: us-east-1
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
        - name: config
          mountPath: /etc/postgresql
        command:
        - bash
        - -c
        - |
          # Source WAL-G environment
          source /etc/postgresql/walg-env.sh

          # Start PostgreSQL
          postgres -c config_file=/etc/postgresql/postgresql.conf
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: config
        configMap:
          name: postgres-walg-config
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

Create AWS credentials secret:

```bash
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIA... \
  --from-literal=secret-access-key=secret... \
  -n database
```

## Creating Base Backups

Schedule regular base backups using a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: database
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: myregistry/postgres-walg:16
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
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
            - name: WALG_S3_PREFIX
              value: s3://postgres-backups/wal-archive
            - name: AWS_REGION
              value: us-east-1
            command:
            - bash
            - -c
            - |
              echo "Starting base backup..."
              wal-g backup-push /var/lib/postgresql/data/pgdata

              echo "Backup completed. Listing backups:"
              wal-g backup-list

              # Delete backups older than 30 days
              wal-g delete retain 30 --confirm
            volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
          volumes:
          - name: data
            persistentVolumeClaim:
              claimName: data-postgres-walg-0
          restartPolicy: OnFailure
```

## Manual Base Backup

Create a backup manually:

```bash
kubectl exec -it postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && wal-g backup-push $PGDATA'
```

List available backups:

```bash
kubectl exec -it postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && wal-g backup-list'
```

## Performing Point-in-Time Recovery

To recover to a specific point in time:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres-restored
  namespace: database
spec:
  serviceName: postgres-restored
  replicas: 1
  selector:
    matchLabels:
      app: postgres-restored
  template:
    metadata:
      labels:
        app: postgres-restored
    spec:
      initContainers:
      - name: restore
        image: myregistry/postgres-walg:16
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
        - name: WALG_S3_PREFIX
          value: s3://postgres-backups/wal-archive
        - name: AWS_REGION
          value: us-east-1
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        command:
        - bash
        - -c
        - |
          if [ -d "$PGDATA" ] && [ "$(ls -A $PGDATA)" ]; then
            echo "Data directory exists, skipping restore"
            exit 0
          fi

          echo "Restoring from backup..."
          mkdir -p $PGDATA
          wal-g backup-fetch $PGDATA LATEST

          # Configure recovery
          cat > $PGDATA/recovery.signal <<EOF
          # recovery.signal
EOF

          cat > $PGDATA/postgresql.auto.conf <<EOF
          restore_command = 'wal-g wal-fetch %f %p'
          recovery_target_time = '2026-02-09 12:00:00'
          recovery_target_action = 'promote'
EOF

          echo "Restore configuration complete"
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
      containers:
      - name: postgres
        image: myregistry/postgres-walg:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
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
        - name: WALG_S3_PREFIX
          value: s3://postgres-backups/wal-archive
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 50Gi
```

## Recovery to Latest State

To recover to the most recent state:

```bash
cat > postgresql.auto.conf <<EOF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target = 'latest'
recovery_target_action = 'promote'
EOF
```

## Recovery to Specific Transaction ID

For precise recovery to a transaction:

```bash
# Get transaction ID
kubectl exec postgres-walg-0 -n database -- \
  psql -U postgres -c "SELECT txid_current();"

# Configure recovery
cat > postgresql.auto.conf <<EOF
restore_command = 'wal-g wal-fetch %f %p'
recovery_target_xid = '12345678'
recovery_target_action = 'promote'
EOF
```

## Monitoring WAL Archiving

Check WAL archiving status:

```bash
# Check archive status
kubectl exec postgres-walg-0 -n database -- \
  psql -U postgres -c "SELECT * FROM pg_stat_archiver;"

# Check WAL archive location
kubectl exec postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && aws s3 ls $WALG_S3_PREFIX/wal_005/'
```

Create monitoring alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: postgres-wal-alerts
  namespace: database
spec:
  groups:
  - name: postgres.wal
    interval: 30s
    rules:
    - alert: PostgreSQLWALArchivingFailing
      expr: |
        pg_stat_archiver_failed_count > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "PostgreSQL WAL archiving is failing"

    - alert: PostgreSQLWALArchiveLag
      expr: |
        pg_stat_archiver_age_seconds > 600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "PostgreSQL WAL archive lag is high"
```

## Testing PITR

Regularly test your PITR setup:

```bash
#!/bin/bash
# test-pitr.sh

echo "Creating test data..."
kubectl exec postgres-walg-0 -n database -- \
  psql -U postgres -c "
    CREATE TABLE IF NOT EXISTS pitr_test (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      data TEXT
    );
    INSERT INTO pitr_test (data) VALUES ('Before recovery point');
  "

# Record timestamp
RECOVERY_TIME=$(date -u +"%Y-%m-%d %H:%M:%S")
sleep 5

echo "Creating data after recovery point..."
kubectl exec postgres-walg-0 -n database -- \
  psql -U postgres -c "
    INSERT INTO pitr_test (data) VALUES ('After recovery point - should not exist');
  "

echo "Recovery timestamp: $RECOVERY_TIME"
echo "Update postgresql.auto.conf with this timestamp and deploy postgres-restored"
```

## Backup Retention Policies

Configure retention policies:

```bash
# Delete backups older than 30 days
kubectl exec postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && wal-g delete retain 30 --confirm'

# Keep only last 7 full backups
kubectl exec postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && wal-g delete retain FULL 7 --confirm'

# Delete everything except last 3 backups
kubectl exec postgres-walg-0 -n database -- \
  bash -c 'source /etc/postgresql/walg-env.sh && wal-g delete everything RETAIN 3 --confirm'
```

## Best Practices

1. **Test recovery regularly**: Schedule monthly PITR drills
2. **Monitor archive lag**: Keep WAL archive lag under 5 minutes
3. **Automate base backups**: Daily full backups are standard
4. **Set archive timeout**: Force WAL archiving every 5 minutes
5. **Verify backups**: Ensure backups complete successfully
6. **Document procedures**: Maintain recovery runbooks
7. **Secure backups**: Encrypt S3 bucket and use IAM roles
8. **Monitor storage**: Track S3 usage and costs

## Conclusion

WAL-G provides production-grade point-in-time recovery for PostgreSQL on Kubernetes through continuous WAL archiving and automated backup management. By combining base backups with continuous WAL archiving, you can recover your database to any specific moment in time, protecting against data corruption and accidental deletions.

Implement automated base backups, configure continuous WAL archiving, and regularly test your recovery procedures. With proper PITR setup, you can confidently recover from any data disaster with minimal data loss.

For more backup strategies, see https://oneuptime.com/blog/post/2026-01-21-postgresql-pg-dump-backup/view for alternative backup approaches.
