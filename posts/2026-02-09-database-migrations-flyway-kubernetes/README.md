# How to Implement Database Schema Migrations as Kubernetes Jobs with Flyway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Flyway, Database Migrations

Description: Automate database schema migrations in Kubernetes using Flyway Jobs for version-controlled, repeatable database changes that run before application deployment.

---

Database schema migrations need to run reliably before deploying application updates. Kubernetes Jobs provide the perfect mechanism for executing migrations as part of your deployment pipeline. Flyway handles migration versioning, validation, and execution with support for rollbacks and repeatable migrations. This guide shows you how to integrate Flyway migrations into your Kubernetes deployment workflow.

## Why Use Jobs for Migrations

Kubernetes Jobs run to completion once, making them ideal for migrations. They execute before your application pods start, ensuring the schema matches what your code expects. If a migration fails, the Job fails, preventing broken application deployments.

Jobs also provide retry logic, logging, and status tracking. You can monitor migration progress through Kubernetes events and integrate with CI/CD pipelines for automated deployments.

## Setting Up Flyway Migrations

Create a directory structure for your migrations:

```bash
migrations/
├── V1__initial_schema.sql
├── V2__add_users_table.sql
├── V3__add_email_index.sql
└── R__refresh_materialized_views.sql
```

Version migrations (V prefix) run once in order. Repeatable migrations (R prefix) run whenever their checksum changes.

Example migration files:

```sql
-- V1__initial_schema.sql
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- V2__add_users_table.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_company ON users(company_id);

-- V3__add_email_index.sql
CREATE INDEX idx_users_email ON users(email);

-- R__refresh_materialized_views.sql
CREATE OR REPLACE VIEW active_users AS
SELECT u.id, u.email, u.name, c.name AS company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.created_at > CURRENT_DATE - INTERVAL '90 days';
```

## Creating a Flyway Container Image

Build a custom image with Flyway and your migrations:

```dockerfile
# Dockerfile
FROM flyway/flyway:9.22

# Copy migration files
COPY migrations /flyway/sql

# Set default configuration
ENV FLYWAY_URL=jdbc:postgresql://postgres:5432/myapp
ENV FLYWAY_USER=postgres
ENV FLYWAY_PASSWORD=
ENV FLYWAY_SCHEMAS=public
ENV FLYWAY_BASELINE_ON_MIGRATE=true

# Run migrations by default
CMD ["migrate"]
```

Build and push the image:

```bash
docker build -t your-registry/myapp-migrations:latest .
docker push your-registry/myapp-migrations:latest
```

## Creating a Migration Job

Define a Kubernetes Job for running migrations:

```yaml
# migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  namespace: production
  labels:
    app: myapp
    component: migration
spec:
  # Don't restart on failure - investigate issues first
  backoffLimit: 3
  completions: 1
  parallelism: 1

  template:
    metadata:
      labels:
        app: myapp
        component: migration
    spec:
      restartPolicy: OnFailure

      # Use init container to wait for database
      initContainers:
      - name: wait-for-db
        image: postgres:15
        command:
        - sh
        - -c
        - |
          until pg_isready -h postgres -p 5432 -U postgres; do
            echo "Waiting for database..."
            sleep 2
          done
          echo "Database is ready"

      containers:
      - name: flyway
        image: your-registry/myapp-migrations:latest
        env:
        - name: FLYWAY_URL
          value: "jdbc:postgresql://postgres.database.svc.cluster.local:5432/myapp"
        - name: FLYWAY_USER
          value: postgres
        - name: FLYWAY_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: password
        - name: FLYWAY_SCHEMAS
          value: public
        - name: FLYWAY_BASELINE_ON_MIGRATE
          value: "true"
        - name: FLYWAY_OUT_OF_ORDER
          value: "false"
        - name: FLYWAY_VALIDATE_ON_MIGRATE
          value: "true"

        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Run the migration:

```bash
kubectl apply -f migration-job.yaml

# Watch job progress
kubectl get job db-migration -n production -w

# View logs
kubectl logs -f job/db-migration -n production

# Check job status
kubectl describe job db-migration -n production
```

## Integrating with Application Deployment

Use Helm hooks to run migrations before application deployment:

```yaml
# templates/migration-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: {{ .Release.Name }}-migration-{{ .Release.Revision }}
  namespace: {{ .Release.Namespace }}
  labels:
    app: {{ .Chart.Name }}
    release: {{ .Release.Name }}
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "0"
    "helm.sh/hook-delete-policy": before-hook-creation
spec:
  backoffLimit: 3
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
        component: migration
    spec:
      restartPolicy: OnFailure
      containers:
      - name: flyway
        image: {{ .Values.migration.image }}:{{ .Values.migration.tag }}
        env:
        - name: FLYWAY_URL
          value: {{ .Values.database.url }}
        - name: FLYWAY_USER
          value: {{ .Values.database.user }}
        - name: FLYWAY_PASSWORD
          valueFrom:
            secretKeyRef:
              name: {{ .Values.database.secretName }}
              key: password
```

Deploy with Helm:

```bash
helm upgrade --install myapp ./myapp-chart \
  --set database.url=jdbc:postgresql://postgres:5432/myapp \
  --set database.user=postgres \
  --set migration.image=your-registry/myapp-migrations \
  --set migration.tag=v1.2.3 \
  --wait
```

## Handling Migration Failures

When migrations fail, investigate and fix:

```bash
# View detailed logs
kubectl logs job/db-migration -n production

# Connect to database to check state
kubectl exec -it postgres-0 -n database -- \
  psql -U postgres myapp -c "SELECT * FROM flyway_schema_history;"

# Check for locks
kubectl exec -it postgres-0 -n database -- \
  psql -U postgres myapp -c "SELECT * FROM pg_locks WHERE locktype = 'advisory';"
```

Fix failed migrations and rerun:

```bash
# Delete failed job
kubectl delete job db-migration -n production

# Update migration files if needed
# Rebuild image with fix
docker build -t your-registry/myapp-migrations:v1.2.4 .
docker push your-registry/myapp-migrations:v1.2.4

# Update job with new image
# Rerun migration
kubectl apply -f migration-job.yaml
```

## Implementing Rollback Strategies

Flyway supports rollback through undo migrations (Teams edition) or by running previous versions. For community edition, implement manual rollbacks:

```sql
-- V4__add_status_column.sql
ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
CREATE INDEX idx_users_status ON users(status);

-- U4__rollback_status_column.sql (manual rollback script)
DROP INDEX IF EXISTS idx_users_status;
ALTER TABLE users DROP COLUMN IF EXISTS status;
```

Create a rollback job:

```yaml
# rollback-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-rollback
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: rollback
        image: postgres:15
        command:
        - psql
        - $(DATABASE_URL)
        - -f
        - /scripts/U4__rollback_status_column.sql
        env:
        - name: DATABASE_URL
          value: "postgresql://postgres:password@postgres:5432/myapp"
        volumeMounts:
        - name: rollback-scripts
          mountPath: /scripts
      volumes:
      - name: rollback-scripts
        configMap:
          name: rollback-scripts
      restartPolicy: OnFailure
```

## Running Migrations in CI/CD

Integrate migrations into GitLab CI:

```yaml
# .gitlab-ci.yml
stages:
  - build
  - migrate
  - deploy

build-migration-image:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE/migrations:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE/migrations:$CI_COMMIT_SHA

run-migrations:
  stage: migrate
  image: bitnami/kubectl:latest
  script:
    - kubectl create job db-migration-$CI_COMMIT_SHORT_SHA
        --from=cronjob/migration-template
        --namespace=production
    - kubectl wait --for=condition=complete --timeout=300s
        job/db-migration-$CI_COMMIT_SHORT_SHA -n production
    - kubectl logs job/db-migration-$CI_COMMIT_SHORT_SHA -n production
  only:
    - master

deploy-application:
  stage: deploy
  needs: [run-migrations]
  script:
    - helm upgrade myapp ./chart --set image.tag=$CI_COMMIT_SHA
```

## Validating Migrations Before Running

Add validation checks:

```yaml
# validation-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-validate
spec:
  template:
    spec:
      containers:
      - name: flyway
        image: your-registry/myapp-migrations:latest
        command: ["flyway", "validate"]
        env:
        - name: FLYWAY_URL
          value: "jdbc:postgresql://postgres:5432/myapp"
        # ... other env vars
      restartPolicy: Never
```

Run validation before migrations:

```bash
# Validate migrations
kubectl apply -f validation-job.yaml
kubectl wait --for=condition=complete job/db-migration-validate

# If validation passes, run migration
kubectl apply -f migration-job.yaml
```

## Monitoring Migration Status

Create a ServiceMonitor for migration metrics:

```yaml
# migration-metrics.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: migration-exporter
data:
  exporter.py: |
    import psycopg2
    from prometheus_client import start_http_server, Gauge
    import time

    # Define metrics
    migration_count = Gauge('flyway_migrations_total', 'Total migrations run')
    last_migration_time = Gauge('flyway_last_migration_timestamp', 'Timestamp of last migration')
    failed_migrations = Gauge('flyway_failed_migrations', 'Number of failed migrations')

    def collect_metrics():
        conn = psycopg2.connect("postgresql://postgres:password@postgres:5432/myapp")
        cur = conn.cursor()

        # Count successful migrations
        cur.execute("SELECT COUNT(*) FROM flyway_schema_history WHERE success = true")
        migration_count.set(cur.fetchone()[0])

        # Get last migration time
        cur.execute("SELECT MAX(installed_on) FROM flyway_schema_history")
        last_time = cur.fetchone()[0]
        if last_time:
            last_migration_time.set(last_time.timestamp())

        # Count failures
        cur.execute("SELECT COUNT(*) FROM flyway_schema_history WHERE success = false")
        failed_migrations.set(cur.fetchone()[0])

        conn.close()

    if __name__ == '__main__':
        start_http_server(8000)
        while True:
            collect_metrics()
            time.sleep(60)
```

## Best Practices for Production

Follow these guidelines:

1. **Test migrations in staging first** - Never run untested migrations in production
2. **Keep migrations small** - Easier to debug and rollback
3. **Use transactions** - Ensure all-or-nothing execution
4. **Avoid data migrations in schema changes** - Separate concerns
5. **Backup before migrations** - Create restore points
6. **Monitor execution time** - Set timeouts appropriately
7. **Version images properly** - Tag with migration version
8. **Document breaking changes** - Help team coordinate deployments

Create backup job before migrations:

```yaml
# pre-migration-backup.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pre-migration-backup
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-weight": "-1"
spec:
  template:
    spec:
      containers:
      - name: backup
        image: postgres:15
        command:
        - pg_dump
        - -h
        - postgres
        - -U
        - postgres
        - -F
        - c
        - -f
        - /backups/pre-migration-$(date +%Y%m%d-%H%M%S).dump
        - myapp
        volumeMounts:
        - name: backups
          mountPath: /backups
      volumes:
      - name: backups
        persistentVolumeClaim:
          claimName: database-backups
      restartPolicy: OnFailure
```

## Conclusion

Kubernetes Jobs with Flyway provide a robust solution for database migrations. By running migrations as Jobs before application deployment, you ensure schema and code stay synchronized. Integration with Helm hooks automates the migration process, while proper error handling and rollback strategies protect against failures. Monitor migration status, test thoroughly in staging, and maintain version control for all migration scripts. This approach creates a reliable, repeatable database change management process that scales with your application.
