# How to Implement Application-Consistent Backups with Velero Pre-Backup Hooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Application Consistency, Hook

Description: Master application-consistent backups using Velero pre-backup hooks for databases and stateful applications. Complete guide covering consistency strategies and implementation patterns.

---

Application-consistent backups capture applications in a consistent state, ensuring data integrity during restoration. Unlike crash-consistent backups that simply snapshot storage, application-consistent backups use hooks to quiesce applications, flush buffers, and create consistent snapshots. This approach is critical for databases, message queues, and other stateful applications where incomplete transactions or unflushed data could cause corruption during restore operations.

## Understanding Application Consistency

Application consistency means capturing all data in a state where the application can restart without corruption or data loss. For databases, this requires completing in-flight transactions and flushing dirty buffers to disk. For message queues, it means ensuring messages are persisted and queue state is recorded. Without application consistency, restored applications may require recovery procedures or exhibit data inconsistencies.

Velero pre-backup hooks execute commands inside containers before backup, allowing applications to prepare for consistent snapshots. Post-backup hooks resume normal operations, ensuring minimal disruption to running services.

## Implementing PostgreSQL Consistent Backups

Configure pre-backup hooks for PostgreSQL:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
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
      annotations:
        # Flush dirty buffers before the snapshot
        pre.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "psql -U postgres -v ON_ERROR_STOP=1 -c \"CHECKPOINT;\" -c \"SELECT pg_switch_wal();\" &&
          echo 'Snapshot checkpoint completed at $(date)' > /var/lib/postgresql/data/backup.log"]
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/timeout: 5m
        pre.hook.backup.velero.io/on-error: Fail

        # Record snapshot completion
        post.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "echo 'Snapshot completed at $(date)' >> /var/lib/postgresql/data/backup.log"]
        post.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/timeout: 2m
        post.hook.backup.velero.io/on-error: Continue
    spec:
      containers:
      - name: postgres
        image: postgres:15
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: postgres-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

This configuration forces PostgreSQL to checkpoint before Velero snapshots the volume. For PostgreSQL 15 and later, the older `pg_start_backup()` and `pg_stop_backup()` functions have been renamed and the non-exclusive backup API requires a continuous database connection plus the returned backup label files, so use PostgreSQL-native tooling such as `pg_basebackup` or pgBackRest for full physical base backups.

## Creating MySQL Application-Consistent Backups

Implement hooks for MySQL consistency:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: production
spec:
  serviceName: mysql
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
      annotations:
        # Flush and lock tables
        pre.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "nohup mysql -u root -p$MYSQL_ROOT_PASSWORD -e 'FLUSH TABLES WITH READ LOCK; DO SLEEP(86400);' >/tmp/mysql-backup-lock.log 2>&1 &
          echo $! > /tmp/mysql-backup-lock.pid &&
          sleep 2"]
        pre.hook.backup.velero.io/container: mysql
        pre.hook.backup.velero.io/timeout: 3m

        # Unlock tables
        post.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "if [ -f /tmp/mysql-backup-lock.pid ]; then kill $(cat /tmp/mysql-backup-lock.pid) || true; fi &&
          rm -f /tmp/mysql-backup-lock.pid /tmp/mysql-backup-lock.log"]
        post.hook.backup.velero.io/container: mysql
        post.hook.backup.velero.io/timeout: 1m
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: root-password
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
  volumeClaimTemplates:
  - metadata:
      name: mysql-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Implementing MongoDB Consistent Snapshots

Configure MongoDB for consistent backups:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: production
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
      annotations:
        # Sync and lock database
        pre.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "mongosh admin --eval 'db.fsyncLock()' &&
          echo 'MongoDB locked for backup' > /tmp/mongo-backup.log"]
        pre.hook.backup.velero.io/container: mongodb
        pre.hook.backup.velero.io/timeout: 5m

        # Unlock database
        post.hook.backup.velero.io/command: >-
          ["/bin/bash", "-c",
          "mongosh admin --eval 'db.fsyncUnlock()' &&
          echo 'MongoDB unlocked' >> /tmp/mongo-backup.log"]
        post.hook.backup.velero.io/container: mongodb
        post.hook.backup.velero.io/timeout: 1m
    spec:
      containers:
      - name: mongodb
        image: mongo:7
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongodb-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

## Implementing Backup Hooks at Backup Level

Define hooks centrally in backup resources:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: consistent-app-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  hooks:
    resources:
    # PostgreSQL hook
    - name: postgres-consistency
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: postgres
      pre:
      - exec:
          container: postgres
          command:
          - /bin/bash
          - -c
          - |
            echo "Starting PostgreSQL backup preparation..."
            psql -U postgres -v ON_ERROR_STOP=1 -c "CHECKPOINT;" -c "SELECT pg_switch_wal();"
            echo "PostgreSQL ready for backup"
          onError: Fail
          timeout: 5m
      post:
      - exec:
          container: postgres
          command:
          - /bin/bash
          - -c
          - |
            echo "Completing PostgreSQL backup hook..."
            echo "PostgreSQL backup complete"
          onError: Continue
          timeout: 2m

    # MySQL hook
    - name: mysql-consistency
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: mysql
      pre:
      - exec:
          container: mysql
          command:
          - /bin/bash
          - -c
          - |
            echo "Flushing MySQL tables..."
            nohup mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH TABLES WITH READ LOCK; DO SLEEP(86400);" >/tmp/mysql-backup-lock.log 2>&1 &
            echo $! > /tmp/mysql-backup-lock.pid
            sleep 2
          onError: Fail
          timeout: 3m
      post:
      - exec:
          container: mysql
          command:
          - /bin/bash
          - -c
          - |
            echo "Unlocking MySQL tables..."
            if [ -f /tmp/mysql-backup-lock.pid ]; then kill $(cat /tmp/mysql-backup-lock.pid) || true; fi
            rm -f /tmp/mysql-backup-lock.pid /tmp/mysql-backup-lock.log
          onError: Continue
          timeout: 1m

    # MongoDB hook
    - name: mongodb-consistency
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: mongodb
      pre:
      - exec:
          container: mongodb
          command:
          - /bin/bash
          - -c
          - |
            echo "Locking MongoDB..."
            mongosh admin --eval "db.fsyncLock()"
          onError: Fail
          timeout: 5m
      post:
      - exec:
          container: mongodb
          command:
          - /bin/bash
          - -c
          - |
            echo "Unlocking MongoDB..."
            mongosh admin --eval "db.fsyncUnlock()"
          onError: Continue
          timeout: 1m
```

This centralized configuration manages hooks for multiple applications.

## Creating Reusable Hook Scripts

Store hook logic in ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-consistency-hooks
  namespace: production
data:
  postgres-pre-backup.sh: |
    #!/bin/bash
    set -e

    echo "$(date): Starting PostgreSQL backup preparation"

    # Flush dirty buffers before the volume snapshot
    psql -U postgres -v ON_ERROR_STOP=1 -c "CHECKPOINT;" -c "SELECT pg_switch_wal();"

    echo "$(date): PostgreSQL ready for backup"

  postgres-post-backup.sh: |
    #!/bin/bash

    echo "$(date): Finalizing PostgreSQL backup"

    echo "$(date): Backup finalized successfully"

  mysql-pre-backup.sh: |
    #!/bin/bash
    set -e

    echo "$(date): Preparing MySQL for backup"

    # Flush all tables and keep the client session open so the global read lock remains active
    nohup mysql -u root -p$MYSQL_ROOT_PASSWORD -e "FLUSH TABLES WITH READ LOCK; DO SLEEP(86400);" >/tmp/mysql-backup-lock.log 2>&1 &
    echo $! > /tmp/mysql-backup-lock.pid

    # Create backup marker
    echo "$(date): MySQL locked" > /tmp/mysql-backup-marker

    # Wait for flush to complete
    sleep 2

    echo "$(date): MySQL ready for backup"

  mysql-post-backup.sh: |
    #!/bin/bash

    echo "$(date): Unlocking MySQL"

    if [ -f /tmp/mysql-backup-lock.pid ]; then
      kill "$(cat /tmp/mysql-backup-lock.pid)" || true
    fi

    rm -f /tmp/mysql-backup-marker /tmp/mysql-backup-lock.pid /tmp/mysql-backup-lock.log

    echo "$(date): MySQL backup complete"

  mongodb-pre-backup.sh: |
    #!/bin/bash
    set -e

    echo "$(date): Preparing MongoDB for backup"

    # Sync and lock
    mongosh admin --eval "db.fsyncLock()"

    # Verify lock
    LOCK_STATUS=$(mongosh admin --quiet --eval "db.currentOp().fsyncLock")

    if [ "$LOCK_STATUS" = "true" ]; then
      echo "$(date): MongoDB locked successfully"
      exit 0
    else
      echo "$(date): Failed to lock MongoDB"
      exit 1
    fi

  mongodb-post-backup.sh: |
    #!/bin/bash

    echo "$(date): Unlocking MongoDB"

    mongosh admin --eval "db.fsyncUnlock()"

    echo "$(date): MongoDB backup complete"
```

Mount these scripts in pods:

```yaml
volumeMounts:
- name: backup-hooks
  mountPath: /backup-hooks
volumes:
- name: backup-hooks
  configMap:
    name: backup-consistency-hooks
    defaultMode: 0755
```

## Monitoring Hook Execution

Track hook performance and failures:

```bash
# View backup logs including hook execution

velero backup logs consistent-app-backup

# Check for hook failures
velero backup describe consistent-app-backup | grep -A 10 "Hooks"

# Monitor hook execution time
kubectl logs -n velero -l name=velero | grep -E "hook|executing"
```

Create alerts for backup failures that can include hook errors:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-consistency-alerts
  namespace: velero
spec:
  groups:
  - name: backup-consistency
    interval: 30s
    rules:
    - alert: VeleroBackupFailed
      expr: |
        increase(velero_backup_failure_total[10m]) > 0
      labels:
        severity: critical
      annotations:
        summary: "Velero backup failed"
        description: "A Velero backup has failed; check backup details for hook errors"

    - alert: BackupHookTimeout
      expr: |
        velero_backup_duration_seconds > 1800
      labels:
        severity: warning
      annotations:
        summary: "Backup taking longer than expected"
        description: "Backup has been running for {{ $value }} seconds"
```

## Testing Application-Consistent Backups

Validate consistency after restore:

```bash
# Create consistent backup
velero backup create test-consistency \
  --include-namespaces production \
  --wait

# Restore to test namespace
velero restore create --from-backup test-consistency \
  --namespace-mappings production:production-test \
  --wait

# Verify database integrity
kubectl exec -n production-test statefulset/postgres -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"

# Check for corruption
kubectl exec -n production-test statefulset/postgres -- \
  pg_dump -U postgres -d mydb > /tmp/test-dump.sql

# Compare record counts
ORIGINAL_COUNT=$(kubectl exec -n production statefulset/postgres -- \
  psql -U postgres -d mydb -t -c "SELECT COUNT(*) FROM users;")

RESTORED_COUNT=$(kubectl exec -n production-test statefulset/postgres -- \
  psql -U postgres -d mydb -t -c "SELECT COUNT(*) FROM users;")

echo "Original: $ORIGINAL_COUNT, Restored: $RESTORED_COUNT"
```

## Implementing Retry Logic in Hooks

Add retry capabilities to hooks:

```bash
#!/bin/bash
# postgres-pre-backup-with-retry.sh

MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i of $MAX_RETRIES"

  if psql -U postgres -v ON_ERROR_STOP=1 -c "CHECKPOINT;" -c "SELECT pg_switch_wal();"; then
    echo "Checkpoint completed successfully"
    exit 0
  fi

  echo "Failed to checkpoint database, retrying in $RETRY_DELAY seconds..."
  sleep $RETRY_DELAY
done

echo "Failed to checkpoint database after $MAX_RETRIES attempts"
exit 1
```

## Conclusion

Application-consistent backups using Velero pre-backup hooks help preserve data integrity for stateful applications and databases. Implement hooks that quiesce applications, flush buffers, and create consistent snapshots before backup operations begin. Use post-backup hooks to resume normal operations and minimize application disruption. Store reusable hook scripts in ConfigMaps for maintainability, monitor hook execution for failures and performance issues, and regularly test restored applications to validate consistency. Well-designed consistency hooks transform Velero from a simple resource backup tool into a more comprehensive disaster recovery solution that protects your most critical stateful workloads.
