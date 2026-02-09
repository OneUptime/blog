# How to Configure Velero Backup Hooks for Pre and Post Backup Command Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Hooks, Automation

Description: Master Velero backup hooks to execute custom commands before and after backups. Learn how to implement application-consistent backups, database dumps, and cleanup operations.

---

Backup hooks allow you to execute custom commands inside containers before and after Velero takes backups. These hooks are essential for creating application-consistent backups, especially for stateful applications like databases that require quiescing or snapshots. Pre-backup hooks can flush caches, freeze filesystem operations, or dump database states, while post-backup hooks can resume operations and perform cleanup tasks.

## Understanding Backup Hook Execution

Velero executes backup hooks by running commands inside running pod containers. Pre-backup hooks run before Velero begins backing up pod resources, allowing you to prepare applications for consistent snapshots. Post-backup hooks execute after the backup completes, whether successful or failed, enabling cleanup and resumption of normal operations.

Hooks support both successful and error handling paths, ensuring your applications return to normal operation even if backup fails. This resilience prevents hooks from leaving applications in degraded states.

## Creating Basic Pre-Backup Hooks

Define pre-backup hooks directly in pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mysql-deployment
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
      annotations:
        # Pre-backup hook to flush MySQL tables
        pre.hook.backup.velero.io/command: '["/bin/bash", "-c", "mysql -u root -p$MYSQL_ROOT_PASSWORD -e \"FLUSH TABLES WITH READ LOCK;\""]'
        pre.hook.backup.velero.io/container: mysql
        # Post-backup hook to unlock tables
        post.hook.backup.velero.io/command: '["/bin/bash", "-c", "mysql -u root -p$MYSQL_ROOT_PASSWORD -e \"UNLOCK TABLES;\""]'
        post.hook.backup.velero.io/container: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mysql-secret
              key: password
        volumeMounts:
        - name: mysql-data
          mountPath: /var/lib/mysql
      volumes:
      - name: mysql-data
        persistentVolumeClaim:
          claimName: mysql-pvc
```

When Velero backs up this deployment, it executes the pre-hook to lock tables before backup and the post-hook to unlock them afterward.

## Implementing Database Dump Hooks

Create consistent database backups using dump commands:

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
        # Dump database before backup
        pre.hook.backup.velero.io/command: '["/bin/bash", "-c", "pg_dumpall -U postgres > /backup/dump.sql"]'
        pre.hook.backup.velero.io/container: postgres
        pre.hook.backup.velero.io/timeout: 30m
        # Compress dump file
        post.hook.backup.velero.io/command: '["/bin/bash", "-c", "gzip /backup/dump.sql"]'
        post.hook.backup.velero.io/container: postgres
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
        - name: backup-volume
          mountPath: /backup
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: backup-volume
        persistentVolumeClaim:
          claimName: postgres-backup-pvc
```

The pre-hook dumps the entire database to a file, which Velero then includes in the backup.

## Configuring Hooks in Backup Resources

Define hooks at the backup level for more flexibility:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: database-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  hooks:
    resources:
    - name: postgres-backup-hook
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
            echo "Starting database backup preparation..."
            # Stop writes temporarily
            psql -U postgres -c "SELECT pg_start_backup('velero_backup', true);"
            # Wait for checkpoint
            sleep 5
            echo "Database ready for backup"
          onError: Fail
          timeout: 5m
      post:
      - exec:
          container: postgres
          command:
          - /bin/bash
          - -c
          - |
            echo "Completing database backup..."
            psql -U postgres -c "SELECT pg_stop_backup();"
            echo "Database backup complete"
          onError: Continue
          timeout: 2m
```

This approach centralizes hook configuration and makes it easier to manage across multiple resources.

## Implementing Multi-Container Hooks

Execute hooks across multiple containers in a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-sidecar
  namespace: production
  annotations:
    # Hook for main application container
    pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "killall -SIGUSR1 myapp"]'
    pre.hook.backup.velero.io/container: app
    # Hook for sidecar container
    pre.hook.backup.velero.io/command-sidecar: '["/bin/sh", "-c", "/sidecar/flush-logs.sh"]'
    pre.hook.backup.velero.io/container-sidecar: log-shipper
spec:
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: data
      mountPath: /data
  - name: log-shipper
    image: fluentd:latest
    volumeMounts:
    - name: logs
      mountPath: /logs
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: app-data
  - name: logs
    emptyDir: {}
```

## Error Handling in Hooks

Configure how Velero handles hook failures:

```yaml
apiVersion: velero.io/v1
kind: Backup
metadata:
  name: resilient-backup
  namespace: velero
spec:
  includedNamespaces:
  - production
  hooks:
    resources:
    - name: database-hook
      includedNamespaces:
      - production
      labelSelector:
        matchLabels:
          app: database
      pre:
      - exec:
          container: db
          command:
          - /scripts/prepare-backup.sh
          # Fail backup if hook fails
          onError: Fail
          timeout: 10m
      post:
      - exec:
          container: db
          command:
          - /scripts/cleanup.sh
          # Continue backup even if cleanup fails
          onError: Continue
          timeout: 5m
```

Use `onError: Fail` for critical pre-hooks and `onError: Continue` for best-effort post-hooks.

## Creating Reusable Hook Scripts

Store hook scripts in ConfigMaps for reusability:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-hooks
  namespace: production
data:
  postgres-pre-backup.sh: |
    #!/bin/bash
    set -e
    echo "$(date): Starting PostgreSQL backup preparation"

    # Check if database is ready
    until pg_isready -U postgres; do
      echo "Waiting for PostgreSQL..."
      sleep 2
    done

    # Start backup mode
    psql -U postgres -c "SELECT pg_start_backup('velero_backup', true);"

    # Create a backup label
    echo "BACKUP_START_TIME=$(date -u +%Y%m%d_%H%M%S)" > /var/lib/postgresql/data/backup_label

    echo "$(date): Database ready for backup"

  postgres-post-backup.sh: |
    #!/bin/bash
    echo "$(date): Finalizing PostgreSQL backup"

    # Stop backup mode
    psql -U postgres -c "SELECT pg_stop_backup();"

    # Remove backup label
    rm -f /var/lib/postgresql/data/backup_label

    # Log completion
    echo "$(date): Backup finalized successfully"
```

Mount the ConfigMap and reference scripts in hooks:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  template:
    metadata:
      annotations:
        pre.hook.backup.velero.io/command: '["/bin/bash", "/hooks/postgres-pre-backup.sh"]'
        pre.hook.backup.velero.io/container: postgres
        post.hook.backup.velero.io/command: '["/bin/bash", "/hooks/postgres-post-backup.sh"]'
        post.hook.backup.velero.io/container: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        - name: backup-hooks
          mountPath: /hooks
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: backup-hooks
        configMap:
          name: backup-hooks
          defaultMode: 0755
```

## Implementing Application-Consistent Redis Backups

Configure hooks for Redis to create consistent backups:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: production
spec:
  template:
    metadata:
      annotations:
        # Trigger BGSAVE before backup
        pre.hook.backup.velero.io/command: '["/bin/sh", "-c", "redis-cli BGSAVE && while [ $(redis-cli LASTSAVE) -eq $(redis-cli LASTSAVE) ]; do sleep 1; done"]'
        pre.hook.backup.velero.io/container: redis
        pre.hook.backup.velero.io/timeout: 15m
    spec:
      containers:
      - name: redis
        image: redis:7
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
```

This hook triggers a background save and waits for it to complete before backup.

## Monitoring Hook Execution

Track hook execution through Velero logs and metrics:

```bash
# View backup logs including hook execution
velero backup logs database-backup

# Check for hook failures
velero backup describe database-backup | grep -A 10 "Hooks:"

# Monitor hook execution time
kubectl logs -n velero -l name=velero | grep "hook"
```

Create alerts for hook failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: velero-hook-alerts
  namespace: velero
spec:
  groups:
  - name: backup-hooks
    interval: 30s
    rules:
    - alert: VeleroHookFailed
      expr: |
        increase(velero_backup_failure_total[10m]) > 0
      labels:
        severity: warning
      annotations:
        summary: "Velero backup hook failed"
        description: "Backup hook execution has failed"
```

## Testing Hooks Before Production

Test hook execution without performing full backups:

```bash
# Create test pod with hooks
kubectl apply -f test-pod-with-hooks.yaml

# Manually execute hook commands
kubectl exec test-pod -n production -- /bin/bash /hooks/postgres-pre-backup.sh

# Verify hook behavior
kubectl logs test-pod -n production

# Create a test backup targeting only the test pod
velero backup create hook-test \
  --include-resources pods \
  --selector app=test \
  --wait

# Review hook execution in backup logs
velero backup logs hook-test
```

## Advanced Hook Patterns

**Conditional hook execution:**

```yaml
pre.hook.backup.velero.io/command: '["/bin/bash", "-c", "if [ -f /data/needs-backup ]; then /scripts/prepare.sh; fi"]'
```

**Hooks with retries:**

```yaml
pre.hook.backup.velero.io/command: |
  ["/bin/bash", "-c", "
    for i in {1..3}; do
      if /scripts/prepare.sh; then
        exit 0
      fi
      echo 'Attempt $i failed, retrying...'
      sleep 5
    done
    exit 1
  "]
```

**Parallel hook execution:**

```yaml
hooks:
  resources:
  - name: app1-hook
    labelSelector:
      matchLabels:
        app: app1
    pre:
    - exec:
        command: ["/scripts/prepare.sh"]
  - name: app2-hook
    labelSelector:
      matchLabels:
        app: app2
    pre:
    - exec:
        command: ["/scripts/prepare.sh"]
```

Velero executes hooks for different resources in parallel.

## Conclusion

Velero backup hooks provide powerful capabilities for creating application-consistent backups through custom command execution. Implement pre-hooks to quiesce applications and create consistent snapshots, use post-hooks for cleanup and resumption of operations, and handle errors appropriately to maintain application availability. Store reusable hook scripts in ConfigMaps, test thoroughly before production deployment, and monitor hook execution to ensure backup consistency. Well-designed hooks transform basic resource backups into production-grade disaster recovery solutions that protect your stateful applications.
