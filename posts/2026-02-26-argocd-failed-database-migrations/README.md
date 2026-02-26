# How to Handle Failed Database Migrations in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Database, Troubleshooting

Description: Learn how to diagnose, recover from, and prevent failed database migrations in ArgoCD deployments, including rollback strategies, partial migration recovery, and debugging techniques.

---

Failed database migrations are one of the most stressful incidents in production deployments. When a migration job fails in ArgoCD, the sync halts, leaving your application in an uncertain state. This guide covers how to diagnose, recover from, and prevent database migration failures in ArgoCD workflows.

## What Happens When a Migration Fails

When a PreSync migration job fails, ArgoCD stops the sync process:

```mermaid
graph TD
    A[ArgoCD Sync Triggered] --> B[PreSync: Migration Job Starts]
    B --> C{Migration Succeeds?}
    C -->|Yes| D[Sync: Deploy New App Version]
    C -->|No| E[Sync Halted]
    E --> F[App Stays on Old Version]
    E --> G[ArgoCD Shows Error Status]
    G --> H[Manual Intervention Required]
```

The good news is that your application continues running the previous version. The bad news is that your database might be in a partially migrated state.

## Diagnosing Migration Failures

### Step 1: Check the Job Status

```bash
# Find the failed migration job
kubectl get jobs -n production -l app=schema-migration

# Check job events
kubectl describe job schema-migration-v42 -n production

# Get pod logs
kubectl logs -n production -l job-name=schema-migration-v42
```

### Step 2: Check ArgoCD Sync Status

```bash
# View the sync operation details
argocd app get my-app --show-operation

# Check the sync result
argocd app get my-app -o json | jq '.status.operationState'
```

### Step 3: Check Database State

Connect to the database and check the current migration state:

```bash
# Port-forward to the database
kubectl port-forward svc/postgres -n database 5432:5432

# Check migration table
psql -h localhost -U app -d mydb -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;"

# Check for dirty/failed migration state
psql -h localhost -U app -d mydb -c "SELECT * FROM schema_migrations WHERE dirty = true;"
```

## Common Migration Failure Scenarios

### 1. Timeout Exceeded

The migration took longer than the Job's `activeDeadlineSeconds`:

```bash
# Symptoms in pod events:
# "DeadlineExceeded: Job was active longer than specified deadline"

# Fix: Increase the deadline
spec:
  activeDeadlineSeconds: 1800  # 30 minutes
```

### 2. Schema Conflict

The migration assumes a schema state that does not match reality:

```sql
-- Migration tries to add a column that already exists
ALTER TABLE users ADD COLUMN email VARCHAR(255);
-- ERROR: column "email" of relation "users" already exists
```

Fix with idempotent migrations:

```sql
-- Use IF NOT EXISTS for safety
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Or check before altering
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'email'
    ) THEN
        ALTER TABLE users ADD COLUMN email VARCHAR(255);
    END IF;
END$$;
```

### 3. Lock Contention

The migration is blocked waiting for a table lock:

```sql
-- This happens when:
-- ALTER TABLE users ADD COLUMN ... (needs ACCESS EXCLUSIVE lock)
-- while there are long-running queries on the users table
```

Fix by setting a lock timeout:

```yaml
containers:
  - name: migrate
    command:
      - /bin/sh
      - -c
      - |
        # Set lock timeout to prevent indefinite waiting
        export PGOPTIONS="-c lock_timeout=30s -c statement_timeout=300s"
        ./migrate up
```

### 4. Out of Memory

The migration job runs out of memory:

```yaml
# Increase memory limits for data-heavy migrations
resources:
  limits:
    memory: 2Gi  # Increased from 512Mi
```

### 5. Dirty Migration State

The migration tool marks the database as "dirty" after a partial failure:

```bash
# For golang-migrate, force a specific version
migrate -path ./migrations -database "$DATABASE_URL" force 41

# Then re-run
migrate -path ./migrations -database "$DATABASE_URL" up
```

## Recovery Procedures

### Automatic Recovery with SyncFail Hook

Set up a SyncFail hook to handle common recovery scenarios:

```yaml
# hooks/migration-recovery.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migration-recovery
  annotations:
    argocd.argoproj.io/hook: SyncFail
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: recover
          image: registry.example.com/myapp:v2.3.0
          command:
            - /bin/sh
            - -c
            - |
              echo "=== Migration Recovery ==="

              # Check current migration state
              CURRENT=$(./migrate version 2>&1)
              DIRTY=$(./migrate version 2>&1 | grep -c "dirty")

              echo "Current version: $CURRENT"
              echo "Dirty state: $DIRTY"

              if [ "$DIRTY" -gt "0" ]; then
                # Extract the version number from dirty state
                VERSION=$(echo "$CURRENT" | grep -oP '\d+')
                echo "Forcing clean state at version $VERSION..."
                ./migrate force $VERSION
                echo "State cleaned. Manual re-run needed."
              fi

              # Log the database state for debugging
              PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME \
                -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

              echo "=== Recovery Complete ==="
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
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
      restartPolicy: Never
```

### Manual Recovery Steps

For complex failures, follow this manual recovery process:

```bash
# Step 1: Stop ArgoCD from retrying
argocd app set my-app --sync-policy none

# Step 2: Connect to the database and assess damage
kubectl port-forward svc/postgres -n database 5432:5432 &
psql -h localhost -U app -d mydb

# Step 3: Check what was applied
SELECT * FROM schema_migrations WHERE version >= 42;

# Step 4: Manually fix the partial migration
# If migration 42 partially applied, complete it manually or roll it back:

# Option A: Complete the remaining statements
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status VARCHAR(50);

# Option B: Roll back what was applied
DROP TABLE IF EXISTS new_table_that_was_partially_created;

# Step 5: Fix the migration version tracking
UPDATE schema_migrations SET dirty = false WHERE version = 42;
-- OR: DELETE FROM schema_migrations WHERE version = 42;

# Step 6: Fix the migration script in Git and push
# Step 7: Re-enable ArgoCD sync
argocd app set my-app --sync-policy automated
argocd app sync my-app
```

## Preventing Migration Failures

### 1. Write Idempotent Migrations

```sql
-- Bad: Will fail if run twice
CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT);

-- Good: Idempotent
CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name TEXT);
```

### 2. Pre-Migration Validation

Add a validation step before running migrations:

```yaml
initContainers:
  - name: validate
    image: registry.example.com/myapp:v2.3.0
    command:
      - /bin/sh
      - -c
      - |
        # Check database connectivity
        echo "Checking database connection..."
        pg_isready -h $DB_HOST -p 5432 -U $DB_USER || exit 1

        # Check current migration version
        CURRENT=$(./migrate version 2>&1)
        echo "Current migration version: $CURRENT"

        # Check for dirty state
        if echo "$CURRENT" | grep -q "dirty"; then
          echo "ERROR: Database is in dirty migration state!"
          echo "Manual intervention required before proceeding"
          exit 1
        fi

        # Dry-run the migration if supported
        echo "Validation passed"
```

### 3. Test Migrations Against Production Schema Copies

```yaml
# hooks/test-migration.yaml - runs before the real migration
apiVersion: batch/v1
kind: Job
metadata:
  name: test-migration
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
    argocd.argoproj.io/sync-wave: "-10"
spec:
  template:
    spec:
      containers:
        - name: test
          image: registry.example.com/myapp:v2.3.0
          command:
            - /bin/sh
            - -c
            - |
              # Create a test database from schema dump
              PGPASSWORD=$DB_PASSWORD createdb -h postgres -U app test_migration
              PGPASSWORD=$DB_PASSWORD pg_dump -h postgres -U app mydb --schema-only | \
                PGPASSWORD=$DB_PASSWORD psql -h postgres -U app test_migration

              # Run migration against test database
              DATABASE_URL="postgres://app:$DB_PASSWORD@postgres:5432/test_migration?sslmode=disable" \
                ./migrate up

              echo "Test migration passed"

              # Clean up
              PGPASSWORD=$DB_PASSWORD dropdb -h postgres -U app test_migration
      restartPolicy: Never
```

### 4. Pre-Migration Backup

Always take a backup before migrating, as covered in the [ArgoCD PreSync schema migrations](https://oneuptime.com/blog/post/2026-02-26-argocd-presync-schema-migrations/view) post.

## Alerting on Migration Failures

Configure ArgoCD notifications for immediate alerts:

```yaml
# argocd-notifications-cm
data:
  trigger.on-presync-failed: |
    - when: app.status.operationState.phase == 'Failed'
      send: [migration-failed-alert]
  template.migration-failed-alert: |
    message: |
      Database migration FAILED for {{.app.metadata.name}}!
      Error: {{.app.status.operationState.message}}
      The application is still running the previous version.
      Manual investigation required.
```

Use [OneUptime](https://oneuptime.com) for comprehensive migration monitoring and alerting.

## Summary

Failed database migrations in ArgoCD require a calm, methodical recovery approach. Diagnose by checking Job logs, ArgoCD sync status, and database migration state. Recover using SyncFail hooks for automatic cleanup or manual intervention for complex failures. Prevent failures by writing idempotent migrations, adding validation steps, testing against schema copies, and always taking pre-migration backups. The GitOps model ensures every fix is tracked in version control, making it easy to understand what happened and prevent similar failures in the future.
