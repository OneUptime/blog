# How to Deploy Init Containers for Database Migration in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Init Containers, Database Migration, Flyway, Liquibase, Kustomization

Description: Learn how to use Kubernetes init containers to run database migrations automatically before application startup in Flux CD managed deployments.

---

## Introduction

Database schema migrations are a common challenge in zero-downtime deployments. The application code must not start until the database schema it depends on has been applied. In Kubernetes, init containers provide a clean mechanism for this: they run to completion before the main application container starts, and if they fail, the pod does not proceed.

When managed by Flux CD, init container based migrations become fully automated and Git-driven. Every time you deploy a new application version, the init container runs your migration tool (Flyway, Liquibase, golang-migrate, etc.) against your database before the application starts serving traffic. Flux's health checks ensure the pod is fully ready (all init containers complete + main container ready) before marking the deployment successful.

In this guide you will configure a Kubernetes Deployment with a Flyway init container for database migration, wire it up with Flux CD, and ensure migrations run before the application receives traffic on every deploy.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- `kubectl` and `flux` CLI tools installed
- A PostgreSQL (or compatible) database accessible from the cluster
- A Docker image containing your migration tool (e.g., `flyway/flyway` or `liquibase/liquibase`)
- Basic understanding of Kubernetes init containers

## Step 1: Create Migration SQL Files

Store your migration files in the application repository, embedded in a ConfigMap.

```yaml
# apps/backend/migrations-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: db-migrations
  namespace: app
data:
  # Flyway naming convention: V{version}__{description}.sql
  V1__create_users_table.sql: |
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       VARCHAR(255) UNIQUE NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_users_email ON users(email);

  V2__create_orders_table.sql: |
    CREATE TABLE IF NOT EXISTS orders (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id),
      status      VARCHAR(50) NOT NULL DEFAULT 'pending',
      total       DECIMAL(10, 2) NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_orders_user_id ON orders(user_id);
    CREATE INDEX idx_orders_status ON orders(status);

  V3__add_audit_columns.sql: |
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

    ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
```

## Step 2: Create Database Credentials Secret

```yaml
# apps/backend/db-secret.yaml
# In production, use SOPS encryption or External Secrets Operator
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: app
type: Opaque
stringData:
  # Connection URL used by Flyway
  FLYWAY_URL: "jdbc:postgresql://postgresql.infrastructure.svc.cluster.local:5432/appdb"
  FLYWAY_USER: "appuser"
  FLYWAY_PASSWORD: "changeme-use-sops-in-production"
```

## Step 3: Create the Deployment with Init Container

```yaml
# apps/backend/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: app
  annotations:
    # Flux will update this annotation on each reconciliation
    fluxcd.io/automated: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      # Init containers run to completion before main containers start
      initContainers:
        - name: flyway-migration
          image: flyway/flyway:10-alpine
          # Flyway will apply all pending migrations and exit 0 on success
          command:
            - flyway
            - migrate
          env:
            - name: FLYWAY_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: FLYWAY_URL
            - name: FLYWAY_USER
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: FLYWAY_USER
            - name: FLYWAY_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: FLYWAY_PASSWORD
            # Baseline on migrate handles pre-existing databases
            - name: FLYWAY_BASELINE_ON_MIGRATE
              value: "true"
          volumeMounts:
            - name: migrations
              mountPath: /flyway/sql
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi

      # Main application container starts only after migration succeeds
      containers:
        - name: backend-api
          image: myregistry/backend-api:v2.5.0
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: FLYWAY_URL
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi

      volumes:
        - name: migrations
          configMap:
            name: db-migrations
```

## Step 4: Use Liquibase as an Alternative Migration Tool

If you prefer Liquibase, here is the equivalent init container configuration.

```yaml
# Liquibase init container (replace the flyway initContainer above)
initContainers:
  - name: liquibase-migration
    image: liquibase/liquibase:4.26
    command:
      - liquibase
      - --changelog-file=/liquibase/changelog/db.changelog-master.yaml
      - --url=$(DATABASE_URL)
      - --username=$(DB_USER)
      - --password=$(DB_PASSWORD)
      - update
    env:
      - name: DATABASE_URL
        value: "jdbc:postgresql://postgresql.infrastructure.svc.cluster.local:5432/appdb"
      - name: DB_USER
        valueFrom:
          secretKeyRef:
            name: db-credentials
            key: FLYWAY_USER
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: db-credentials
            key: FLYWAY_PASSWORD
    volumeMounts:
      - name: liquibase-changelog
        mountPath: /liquibase/changelog
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/apps/backend-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend-api
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: app-repo
  path: ./apps/backend
  prune: true
  # Wait ensures init container + readiness probe must pass
  wait: true
  timeout: 10m       # Allow time for migrations to complete
  retryInterval: 2m
  # Database must be running before migrations can run
  dependsOn:
    - name: postgresql
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: backend-api
      namespace: app
```

## Step 6: Monitor Migration Execution

```bash
# Watch the init container run during deployment
kubectl get pods -n app -w

# View init container logs during migration
kubectl logs -n app -l app=backend-api -c flyway-migration

# Check migration status after deployment
kubectl logs -n app -l app=backend-api -c flyway-migration | tail -20

# If migration fails, the pod will be in Init:Error state
kubectl describe pod -n app -l app=backend-api

# Force Flux to reconcile and re-run migrations
flux reconcile kustomization backend-api --with-source
```

## Step 7: Add a New Migration

To apply a new migration, add a new SQL file to the ConfigMap and push to Git.

```yaml
# Add V4 to the migrations ConfigMap
data:
  V4__add_product_catalog.sql: |
    CREATE TABLE IF NOT EXISTS products (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sku         VARCHAR(100) UNIQUE NOT NULL,
      name        VARCHAR(255) NOT NULL,
      price       DECIMAL(10, 2) NOT NULL,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
```

Flux detects the ConfigMap change, reconciles the Deployment (causing a rolling restart), and the Flyway init container runs V4 before the new app version starts.

## Best Practices

- Set a generous `timeout` in your Flux Kustomization to allow for slow migrations
- Use migration tools that support idempotency so re-runs are safe
- Always use `FLYWAY_BASELINE_ON_MIGRATE=true` for databases with pre-existing data
- Store migration SQL files in Git — never generate them dynamically at runtime
- Test migrations in a staging environment against a copy of production data before promoting
- Set resource limits on init containers to prevent them from consuming excessive memory during large migrations

## Conclusion

Init containers in Kubernetes provide a reliable mechanism to run database migrations before your application starts. Combined with Flux CD's `wait: true` and health checks, you get a fully automated, ordered deployment pipeline where migrations run on every deploy without manual intervention. By storing migration SQL files in Git as ConfigMaps, your schema changes are versioned, auditable, and rolled out exactly like your application code.
