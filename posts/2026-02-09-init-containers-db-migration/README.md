# How to Configure Init Containers for Database Schema Migration Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Init Containers, Database Migrations, Schema Management, DevOps

Description: Learn how to use Kubernetes init containers to run database schema migrations safely before application deployment, ensuring schema compatibility and zero-downtime updates.

---

Database schema migrations are a critical part of application deployments. Running migrations at the wrong time or in the wrong order can cause application failures, data corruption, or downtime. Init containers provide a reliable way to run migrations before your application starts.

By running migrations in an init container, you ensure that the database schema is up to date before any application pods begin serving traffic. This prevents version mismatches and ensures smooth deployments.

## Understanding Migration Challenges in Kubernetes

When you deploy a new version of your application, multiple pods start simultaneously. Without coordination, each pod might try to run migrations at the same time, causing conflicts, duplicate execution, or partial failures.

Init containers help solve this by running migrations before the main container starts. Combined with proper migration tooling that handles concurrency and locks, init containers provide a safe migration execution environment.

## Basic Migration Init Container

Here's a simple example using Flyway for Java applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      initContainers:
      - name: db-migration
        image: flyway/flyway:10
        command:
        - flyway
        - -url=jdbc:postgresql://postgres:5432/mydb
        - -user=postgres
        - -password=$(DB_PASSWORD)
        - migrate
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        volumeMounts:
        - name: migrations
          mountPath: /flyway/sql

      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080

      volumes:
      - name: migrations
        configMap:
          name: db-migrations
```

## Python/Django Migration Init Container

For Python applications using Django or Alembic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: django-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: django-app
  template:
    metadata:
      labels:
        app: django-app
    spec:
      initContainers:
      - name: django-migrate
        image: django-app:latest
        command:
        - python
        - manage.py
        - migrate
        - --noinput
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: DJANGO_SETTINGS_MODULE
          value: "myapp.settings.production"

      - name: django-collectstatic
        image: django-app:latest
        command:
        - python
        - manage.py
        - collectstatic
        - --noinput
        volumeMounts:
        - name: static
          mountPath: /app/static

      containers:
      - name: app
        image: django-app:latest
        command: ["gunicorn"]
        args: ["myapp.wsgi:application", "--bind", "0.0.0.0:8000"]
        ports:
        - containerPort: 8000
        volumeMounts:
        - name: static
          mountPath: /app/static

      volumes:
      - name: static
        emptyDir: {}
```

## Node.js/TypeORM Migration Init Container

For Node.js applications with TypeORM:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nodejs-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nodejs-app
  template:
    metadata:
      labels:
        app: nodejs-app
    spec:
      initContainers:
      - name: typeorm-migrate
        image: nodejs-app:latest
        command:
        - npm
        - run
        - migration:run
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: NODE_ENV
          value: "production"

      containers:
      - name: app
        image: nodejs-app:latest
        ports:
        - containerPort: 3000
```

## Advanced Migration with Locking

Create a custom migration script that handles locking:

```bash
#!/bin/bash
# migration-runner.sh

set -e

LOCK_TABLE="schema_migrations_lock"
LOCK_ID="migration-$(date +%s)-$$"
MAX_LOCK_WAIT=300  # 5 minutes

# Database connection
export PGPASSWORD="$DB_PASSWORD"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-myapp}"
DB_USER="${DB_USER:-postgres}"

psql_exec() {
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "$1"
}

# Create lock table if it doesn't exist
create_lock_table() {
    psql_exec "
        CREATE TABLE IF NOT EXISTS $LOCK_TABLE (
            id SERIAL PRIMARY KEY,
            lock_id VARCHAR(255) UNIQUE NOT NULL,
            acquired_at TIMESTAMP DEFAULT NOW(),
            released_at TIMESTAMP
        );
    "
}

# Acquire migration lock
acquire_lock() {
    local wait_time=0

    while [ $wait_time -lt $MAX_LOCK_WAIT ]; do
        # Try to acquire lock
        if psql_exec "
            INSERT INTO $LOCK_TABLE (lock_id)
            SELECT '$LOCK_ID'
            WHERE NOT EXISTS (
                SELECT 1 FROM $LOCK_TABLE
                WHERE released_at IS NULL
            );
        " | grep -q "INSERT 0 1"; then
            echo "Acquired migration lock: $LOCK_ID"
            return 0
        fi

        echo "Waiting for migration lock... ($wait_time/$MAX_LOCK_WAIT seconds)"
        sleep 5
        wait_time=$((wait_time + 5))
    done

    echo "Failed to acquire migration lock after $MAX_LOCK_WAIT seconds"
    return 1
}

# Release migration lock
release_lock() {
    psql_exec "
        UPDATE $LOCK_TABLE
        SET released_at = NOW()
        WHERE lock_id = '$LOCK_ID';
    "
    echo "Released migration lock: $LOCK_ID"
}

# Cleanup stale locks (older than 1 hour)
cleanup_stale_locks() {
    psql_exec "
        UPDATE $LOCK_TABLE
        SET released_at = NOW()
        WHERE released_at IS NULL
        AND acquired_at < NOW() - INTERVAL '1 hour';
    "
}

# Run migrations
run_migrations() {
    echo "Running database migrations..."

    case "$MIGRATION_TOOL" in
        flyway)
            flyway migrate
            ;;
        liquibase)
            liquibase update
            ;;
        alembic)
            alembic upgrade head
            ;;
        typeorm)
            npm run migration:run
            ;;
        *)
            echo "Unknown migration tool: $MIGRATION_TOOL"
            return 1
            ;;
    esac

    echo "Migrations completed successfully"
}

# Main execution
main() {
    echo "Starting database migration process..."

    create_lock_table
    cleanup_stale_locks

    if acquire_lock; then
        # Ensure lock is released on exit
        trap release_lock EXIT

        run_migrations

        echo "Migration process completed"
        return 0
    else
        echo "Failed to acquire lock"
        return 1
    fi
}

main
```

Use this script in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-scripts
data:
  migration-runner.sh: |
    # (script content from above)
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-migrations
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
      - name: run-migrations
        image: postgres:16-alpine
        command: ["/bin/sh", "/scripts/migration-runner.sh"]
        env:
        - name: DB_HOST
          value: "postgres"
        - name: DB_PORT
          value: "5432"
        - name: DB_NAME
          value: "myapp"
        - name: DB_USER
          value: "postgres"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: password
        - name: MIGRATION_TOOL
          value: "flyway"
        volumeMounts:
        - name: scripts
          mountPath: /scripts
        - name: migrations
          mountPath: /flyway/sql

      containers:
      - name: app
        image: myapp:latest

      volumes:
      - name: scripts
        configMap:
          name: migration-scripts
          defaultMode: 0755
      - name: migrations
        configMap:
          name: db-migrations
```

## Go Migration with Goose

For Go applications using Goose:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: goose-migrations
data:
  001_initial_schema.sql: |
    -- +goose Up
    CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- +goose Down
    DROP TABLE users;

  002_add_users_table.sql: |
    -- +goose Up
    ALTER TABLE users ADD COLUMN name VARCHAR(255);

    -- +goose Down
    ALTER TABLE users DROP COLUMN name;
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-app
  template:
    metadata:
      labels:
        app: go-app
    spec:
      initContainers:
      - name: goose-migrate
        image: go-app:latest
        command:
        - goose
        - -dir
        - /migrations
        - postgres
        - $(DATABASE_URL)
        - up
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        volumeMounts:
        - name: migrations
          mountPath: /migrations

      containers:
      - name: app
        image: go-app:latest

      volumes:
      - name: migrations
        configMap:
          name: goose-migrations
```

## Handling Migration Failures

Add retry logic and failure handling:

```yaml
initContainers:
- name: db-migration
  image: myapp:latest
  command:
  - /bin/sh
  - -c
  - |
    MAX_RETRIES=3
    RETRY_COUNT=0

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
      echo "Running migrations (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."

      if npm run migration:run; then
        echo "Migrations completed successfully"
        exit 0
      fi

      RETRY_COUNT=$((RETRY_COUNT + 1))

      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "Migration failed, retrying in 10 seconds..."
        sleep 10
      fi
    done

    echo "Migrations failed after $MAX_RETRIES attempts"
    exit 1
```

## Separate Migration Job vs Init Container

For very long migrations, consider using a Kubernetes Job instead:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-{{ .Release.Revision }}
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "5"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: myapp:latest
        command: ["npm", "run", "migration:run"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
  backoffLimit: 3
```

Init containers provide a robust mechanism for running database migrations in Kubernetes. By ensuring migrations complete before application pods start, you eliminate race conditions and maintain schema consistency across your deployment.
