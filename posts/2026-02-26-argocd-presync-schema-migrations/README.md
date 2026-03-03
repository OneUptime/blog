# How to Run Schema Migrations as PreSync Jobs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Database, Schema Migration

Description: Learn how to configure ArgoCD PreSync Jobs for database schema migrations, including migration tools, error handling, timeout configuration, and rollback strategies.

---

Running schema migrations as PreSync jobs in ArgoCD ensures your database schema is updated before new application code starts running. This pattern prevents the dreaded scenario where your application tries to access columns or tables that do not exist yet. This post dives deep into the configuration details of PreSync migration jobs.

## Why PreSync for Schema Migrations

ArgoCD defines several hook phases:

- **PreSync** - Runs before any resources are synced
- **Sync** - Runs during the main sync
- **PostSync** - Runs after all resources are synced
- **SyncFail** - Runs if the sync fails

Schema migrations must run in PreSync because the application pods created during Sync expect the new schema to already exist.

```mermaid
graph LR
    A[PreSync: Schema Migration] --> B[Sync: Deploy App Pods]
    B --> C[PostSync: Data Backfill]
    A -.->|If fails| D[SyncFail: Alert Team]
```

## Complete PreSync Job Configuration

Here is a production-ready PreSync migration job with all the important settings:

```yaml
# migrations/presync-migrate.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: schema-migration-v42
  namespace: production
  annotations:
    # Run before any other sync operations
    argocd.argoproj.io/hook: PreSync
    # Delete old job before creating new one
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    # Run early in the sync wave order
    argocd.argoproj.io/sync-wave: "-5"
  labels:
    app: schema-migration
    version: v42
spec:
  # Job-level timeout
  activeDeadlineSeconds: 600  # 10 minutes max
  # Retry configuration
  backoffLimit: 2  # Retry twice on failure
  # Do not keep completed jobs around
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app: schema-migration
        sidecar.istio.io/inject: "false"  # Disable Istio sidecar
    spec:
      # Use a service account with database access
      serviceAccountName: migration-runner
      # Init container to wait for database availability
      initContainers:
        - name: wait-for-db
          image: postgres:16
          command:
            - /bin/sh
            - -c
            - |
              echo "Waiting for database to be ready..."
              until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
                echo "Database not ready yet, waiting..."
                sleep 2
              done
              echo "Database is ready"
          env:
            - name: DB_HOST
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: host
            - name: DB_PORT
              valueFrom:
                configMapKeyRef:
                  name: db-config
                  key: port
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
      containers:
        - name: migrate
          # IMPORTANT: Use the exact same image as the application
          image: registry.example.com/myapp:v2.3.0
          command:
            - /bin/sh
            - -c
            - |
              set -e

              echo "=== Schema Migration Start ==="
              echo "Timestamp: $(date -u)"
              echo "Image: registry.example.com/myapp:v2.3.0"

              # Run the migration
              echo "Applying pending migrations..."
              ./migrate up

              # Verify the migration
              echo "Verifying schema version..."
              CURRENT=$(./migrate version)
              echo "Current schema version: $CURRENT"

              echo "=== Schema Migration Complete ==="
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
            - name: MIGRATION_DIR
              value: /app/migrations
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 1
              memory: 512Mi
      restartPolicy: Never
      # Anti-affinity to avoid running on stressed nodes
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              preference:
                matchExpressions:
                  - key: node-role.kubernetes.io/worker
                    operator: Exists
```

## Managing Migration Files in Git

Store migration files alongside your application code in the Git repository:

```text
my-app/
  migrations/
    001_create_users_table.sql
    002_add_email_to_users.sql
    003_create_orders_table.sql
    004_add_index_on_email.sql
  deployment.yaml
  service.yaml
  hooks/
    presync-migrate.yaml
```

Use a ConfigMap to mount migration files if they are separate from the app image:

```yaml
# migrations/migration-files.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-files
  namespace: production
data:
  004_add_index_on_email.sql: |
    -- Migration: 004_add_index_on_email
    -- Date: 2026-02-26
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email
    ON users (email);
  004_add_index_on_email_down.sql: |
    -- Rollback: 004_add_index_on_email
    DROP INDEX IF EXISTS idx_users_email;
```

## Using golang-migrate

golang-migrate is a popular database migration tool. Here is how to use it as a PreSync job:

```yaml
containers:
  - name: migrate
    image: migrate/migrate:latest
    command:
      - /bin/sh
      - -c
      - |
        # Run migrations from mounted files
        migrate \
          -path /migrations \
          -database "$DATABASE_URL" \
          up

        # Show current version
        migrate \
          -path /migrations \
          -database "$DATABASE_URL" \
          version
    env:
      - name: DATABASE_URL
        value: "postgres://user:password@postgres:5432/mydb?sslmode=disable"
    volumeMounts:
      - name: migrations
        mountPath: /migrations
volumes:
  - name: migrations
    configMap:
      name: migration-files
```

## Using Flyway

```yaml
containers:
  - name: flyway
    image: flyway/flyway:10
    args:
      - -url=jdbc:postgresql://postgres:5432/mydb
      - -user=$(DB_USER)
      - -password=$(DB_PASSWORD)
      - -locations=filesystem:/flyway/sql
      - -outOfOrder=true
      - migrate
    env:
      - name: DB_USER
        valueFrom:
          secretKeyRef:
            name: db-credentials
            key: username
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: db-credentials
            key: password
    volumeMounts:
      - name: sql-migrations
        mountPath: /flyway/sql
volumes:
  - name: sql-migrations
    configMap:
      name: flyway-migrations
```

## Handling Long-Running Migrations

For large tables, migrations can take a long time. Adjust timeouts accordingly:

```yaml
spec:
  activeDeadlineSeconds: 3600  # 1 hour for large migrations
  backoffLimit: 0  # Don't retry long migrations automatically
  template:
    spec:
      containers:
        - name: migrate
          command:
            - /bin/sh
            - -c
            - |
              # Set statement timeout for safety
              export PGOPTIONS="-c statement_timeout=3500s"

              # For large table migrations, use batched approach
              python manage.py migrate --noinput

              echo "Long migration complete"
```

## Pre-Migration Backup Hook

Run a backup before the migration as a safety net:

```yaml
# hooks/pre-migration-backup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-migration-backup
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-10"  # Run before migration
spec:
  template:
    spec:
      containers:
        - name: backup
          image: postgres:16
          command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/backups/pre-migration-${TIMESTAMP}.sql"

              echo "Creating pre-migration backup..."
              PGPASSWORD=$DB_PASSWORD pg_dump \
                -h $DB_HOST \
                -U $DB_USER \
                -d $DB_NAME \
                --format=custom \
                --file="$BACKUP_FILE"

              echo "Backup created: $BACKUP_FILE"
              ls -lh "$BACKUP_FILE"
          env:
            - name: DB_HOST
              value: postgres
            - name: DB_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            - name: DB_NAME
              value: mydb
          volumeMounts:
            - name: backup-storage
              mountPath: /backups
      volumes:
        - name: backup-storage
          persistentVolumeClaim:
            claimName: migration-backups
      restartPolicy: Never
```

## SyncFail Hook for Migration Failures

Handle migration failures with a SyncFail hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-failure-handler
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: handler
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Send alert about failed migration
              curl -X POST "$SLACK_WEBHOOK" \
                -H "Content-Type: application/json" \
                -d '{"text": "Database migration failed! Manual intervention required."}'

              echo "Failure notification sent"
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-config
                  key: webhook-url
      restartPolicy: Never
```

## Migration Monitoring

Use [OneUptime](https://oneuptime.com) to monitor migration job durations and failure rates to catch performance regressions in your schema change process.

## Summary

Running schema migrations as ArgoCD PreSync jobs is the standard pattern for ensuring database schema changes happen before application code updates. Use sync waves to order multiple migrations, init containers to verify database availability, appropriate timeouts for long-running migrations, and pre-migration backups as a safety net. Always use the same image version for the migration job and the application deployment to ensure compatibility. When migrations fail, ArgoCD halts the sync, keeping the previous application version running while you fix the issue.
