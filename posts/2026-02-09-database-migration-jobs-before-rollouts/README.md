# How to Run Database Migration Jobs Before Deployment Rollouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Database, Migrations, Deployment

Description: Learn how to safely run database migration jobs before application deployments using Kubernetes init containers, Helm hooks, and deployment strategies to ensure zero-downtime updates.

---

Database migrations need to complete before deploying new application code that depends on schema changes. Running migrations after deployment causes errors when new code tries to use tables or columns that don't exist yet. Running them too early risks incompatibility with running application instances.

Kubernetes provides several patterns for running pre-deployment migration jobs: init containers that block pod startup, Helm hooks that run before release installation, and custom controllers that orchestrate migration and deployment sequences. The right choice depends on your deployment tool and rollout strategy.

## Using Init Containers for Migrations

The simplest approach runs migrations in an init container before the main application starts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
      - name: db-migrate
        image: myapp:latest
        command:
        - /bin/bash
        - -c
        - |
          echo "Running database migrations..."
          ./manage.py migrate --noinput
          echo "Migrations complete"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
```

This ensures migrations run before the application starts, but has a problem: every pod runs the migration. With 3 replicas, you get 3 concurrent migration attempts, which can cause conflicts.

## Using a Pre-Migration Job

Run migrations as a separate Job before the Deployment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-20260209
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: migrate
        image: myapp:v2.0
        command:
        - /bin/bash
        - -c
        - |
          echo "Starting database migration..."

          # Run migrations
          ./manage.py migrate --noinput

          # Verify migrations applied
          ./manage.py showmigrations

          echo "Migration complete"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
      backoffLimit: 3
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
      - name: wait-for-migration
        image: bitnami/kubectl:latest
        command:
        - kubectl
        - wait
        - --for=condition=complete
        - --timeout=300s
        - job/db-migrate-20260209
      containers:
      - name: app
        image: myapp:v2.0
        ports:
        - containerPort: 8000
```

The Deployment waits for the migration Job to complete before starting application pods.

## Using Helm Hooks

Helm provides pre-install and pre-upgrade hooks for migrations:

```yaml
# templates/db-migrate-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-db-migrate
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-5"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: migrate
        image: {{ .Values.image.repository }}:{{ .Values.image.tag }}
        command: ["./migrate.sh"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ .Release.Name }}-db
              key: url
```

This job runs automatically before Helm installs or upgrades the release. The hook-weight ensures it runs before other resources. The delete-policy cleans up old migration jobs.

## Database Migration Script with Safety Checks

Implement robust migration logic:

```python
#!/usr/bin/env python3
# migrate.py
import sys
import os
import time
import psycopg2
from psycopg2 import sql

def get_db_connection():
    """Create database connection"""
    return psycopg2.connect(os.getenv('DATABASE_URL'))

def acquire_migration_lock(conn):
    """Acquire advisory lock to prevent concurrent migrations"""
    cursor = conn.cursor()
    lock_id = 123456  # Unique ID for migration lock

    print("Acquiring migration lock...")
    cursor.execute("SELECT pg_try_advisory_lock(%s)", (lock_id,))
    acquired = cursor.fetchone()[0]

    if not acquired:
        print("Another migration is running, waiting...")
        cursor.execute("SELECT pg_advisory_lock(%s)", (lock_id,))
        print("Lock acquired")

    return lock_id

def release_migration_lock(conn, lock_id):
    """Release advisory lock"""
    cursor = conn.cursor()
    cursor.execute("SELECT pg_advisory_unlock(%s)", (lock_id,))
    print("Lock released")

def run_migrations(conn):
    """Run actual database migrations"""
    cursor = conn.cursor()

    # Example migrations
    migrations = [
        """
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
        """,
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP
        """
    ]

    for i, migration in enumerate(migrations):
        print(f"Running migration {i+1}/{len(migrations)}...")
        try:
            cursor.execute(migration)
            conn.commit()
            print(f"Migration {i+1} complete")
        except Exception as e:
            print(f"Migration {i+1} failed: {e}")
            conn.rollback()
            raise

def verify_migrations(conn):
    """Verify database schema is correct"""
    cursor = conn.cursor()

    # Check that expected tables exist
    cursor.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'users'
    """)

    if not cursor.fetchone():
        raise Exception("Expected table 'users' not found")

    print("Schema verification passed")

def main():
    try:
        print("Connecting to database...")
        conn = get_db_connection()

        lock_id = acquire_migration_lock(conn)

        try:
            run_migrations(conn)
            verify_migrations(conn)
            print("All migrations completed successfully")

        finally:
            release_migration_lock(conn, lock_id)

        conn.close()
        sys.exit(0)

    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Backward-Compatible Migrations

Ensure migrations work with old and new code:

```sql
-- BAD: Breaking change
ALTER TABLE users DROP COLUMN old_email;

-- GOOD: Multiple-step migration
-- Step 1: Add new column (deploy with old code still running)
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Step 2: Backfill data (run as background job)
UPDATE users SET email = old_email WHERE email IS NULL;

-- Step 3: Make NOT NULL (after backfill completes)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Step 4: Drop old column (in next release, after new code deployed)
-- ALTER TABLE users DROP COLUMN old_email;
```

## Using Liquibase or Flyway

Integrate migration tools:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: flyway-migrate
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: flyway
        image: flyway/flyway:latest
        args:
        - migrate
        env:
        - name: FLYWAY_URL
          value: "jdbc:postgresql://postgres:5432/mydb"
        - name: FLYWAY_USER
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: username
        - name: FLYWAY_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: FLYWAY_LOCATIONS
          value: "filesystem:/flyway/sql"
        volumeMounts:
        - name: migrations
          mountPath: /flyway/sql
      volumes:
      - name: migrations
        configMap:
          name: db-migrations
```

## Rolling Deployment Strategy

Coordinate migrations with rolling updates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero downtime
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
      - name: wait-migration
        image: busybox
        command:
        - sh
        - -c
        - |
          # Wait for migration job to complete
          while ! test -f /shared/migration-complete; do
            echo "Waiting for migration..."
            sleep 5
          done
        volumeMounts:
        - name: shared
          mountPath: /shared
      containers:
      - name: app
        image: myapp:v2.0
      volumes:
      - name: shared
        emptyDir: {}
```

## Monitoring Migration Progress

Track migration job execution:

```bash
# Check migration job status
kubectl get job db-migrate-20260209

# View migration logs
kubectl logs job/db-migrate-20260209

# Watch for completion
kubectl wait --for=condition=complete --timeout=300s job/db-migrate-20260209

# Check if deployment is waiting
kubectl get pods -l app=myapp -o wide
```

Database migrations are critical path operations that must complete successfully before application rollouts. Use dedicated Jobs with proper locking, implement backward-compatible schema changes, and integrate migrations into your deployment workflow for safe, reliable updates.
