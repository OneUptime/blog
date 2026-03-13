# How to Use Post-Build Substitution for Database Connection Strings in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Database, Post-Build Substitution, Secrets

Description: Learn how to securely manage and inject database connection strings into your Kubernetes workloads using Flux post-build substitution.

---

## Introduction

Database connection strings contain sensitive information like hostnames, credentials, and database names that vary across environments. Hardcoding them in manifests stored in Git is a security risk, and managing separate manifest files for each environment creates maintenance overhead. Flux post-build substitution provides a clean solution by letting you construct connection strings from variables defined in Secrets and ConfigMaps, keeping your Git repository free of sensitive data while maintaining a single set of manifests.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- One or more databases accessible from the cluster

## Connection String Patterns

Different databases use different connection string formats. Here are common patterns you will want to construct through substitution:

- PostgreSQL: `postgresql://user:password@host:5432/dbname?sslmode=require`
- MySQL: `mysql://user:password@host:3306/dbname`
- MongoDB: `mongodb://user:password@host:27017/dbname?authSource=admin`
- Redis: `redis://:password@host:6379/0`

Each of these has components that vary by environment: the host, port, credentials, database name, and connection options.

## Storing Connection Components in Secrets

Break your connection string into individual components and store them in a Kubernetes Secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: flux-system
type: Opaque
stringData:
  DB_HOST: "prod-postgres.internal.example.com"
  DB_PORT: "5432"
  DB_USER: "app_service"
  DB_PASSWORD: "s3cur3-pr0d-p@ssw0rd"
  DB_NAME: "myapp_production"
  DB_SSL_MODE: "require"
```

For environments with multiple databases, create separate secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: redis-credentials
  namespace: flux-system
type: Opaque
stringData:
  REDIS_HOST: "prod-redis.internal.example.com"
  REDIS_PORT: "6379"
  REDIS_PASSWORD: "r3d1s-pr0d-p@ss"
  REDIS_DB: "0"
```

## Constructing Connection Strings in Manifests

In your Deployment manifest, construct the full connection string using variable placeholders:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: ${APP_NAMESPACE}
spec:
  replicas: ${REPLICAS}
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api-server
          image: myregistry/api-server:${IMAGE_TAG}
          env:
            - name: DATABASE_URL
              value: "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL_MODE}"
            - name: REDIS_URL
              value: "redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
            - name: MONGODB_URI
              value: "mongodb://${MONGO_USER}:${MONGO_PASSWORD}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin"
```

## Configuring the Kustomization

Set up the Flux Kustomization to pull values from the credential secrets:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substitute:
      APP_NAMESPACE: "production"
      REPLICAS: "3"
      IMAGE_TAG: "v2.5.0"
    substituteFrom:
      - kind: Secret
        name: database-credentials
      - kind: Secret
        name: redis-credentials
      - kind: Secret
        name: mongodb-credentials
```

## Using Pre-Constructed Connection Strings

If you prefer to store complete connection strings rather than individual components, you can do that as well:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: connection-strings
  namespace: flux-system
type: Opaque
stringData:
  DATABASE_URL: "postgresql://app_service:s3cur3-p@ss@prod-db:5432/myapp?sslmode=require"
  REDIS_URL: "redis://:r3d1s-p@ss@prod-redis:6379/0"
  MONGODB_URI: "mongodb://admin:m0ng0-p@ss@prod-mongo:27017/myapp?authSource=admin"
```

Then reference them directly in your manifest:

```yaml
env:
  - name: DATABASE_URL
    value: "${DATABASE_URL}"
  - name: REDIS_URL
    value: "${REDIS_URL}"
  - name: MONGODB_URI
    value: "${MONGODB_URI}"
```

This approach is simpler but less flexible since you cannot reuse individual components across multiple connection strings.

## Environment-Specific Database Configuration

For multi-environment setups, create per-environment secrets with the same keys but different values:

```yaml
# Staging secret
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: flux-system
type: Opaque
stringData:
  DB_HOST: "staging-postgres.internal.example.com"
  DB_PORT: "5432"
  DB_USER: "app_staging"
  DB_PASSWORD: "staging-password"
  DB_NAME: "myapp_staging"
  DB_SSL_MODE: "prefer"
```

The same Flux Kustomization and application manifests work in both environments. Only the secret values differ.

## Using Default Values for Optional Parameters

Some connection parameters may not apply to all environments. Use defaults to handle these cases:

```yaml
env:
  - name: DATABASE_URL
    value: "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT:=5432}/${DB_NAME}?sslmode=${DB_SSL_MODE:=prefer}&connect_timeout=${DB_CONNECT_TIMEOUT:=10}"
  - name: DB_POOL_SIZE
    value: "${DB_POOL_SIZE:=10}"
  - name: DB_IDLE_TIMEOUT
    value: "${DB_IDLE_TIMEOUT:=300}"
```

The defaults ensure that missing variables do not cause substitution failures while providing sensible fallback values.

## Creating a Kubernetes Secret from Substituted Values

Instead of injecting connection strings directly into environment variables, you can create a Kubernetes Secret that holds the constructed connection strings:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-database-secrets
  namespace: ${APP_NAMESPACE}
type: Opaque
stringData:
  database-url: "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSL_MODE}"
  redis-url: "redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}/${REDIS_DB}"
```

Then reference this secret in your Deployment using `envFrom`:

```yaml
spec:
  containers:
    - name: api-server
      image: myregistry/api-server:${IMAGE_TAG}
      envFrom:
        - secretRef:
            name: app-database-secrets
```

This approach keeps the connection strings in a proper Kubernetes Secret rather than as plain text in the Deployment spec.

## Verifying Connection String Substitution

After reconciliation, verify the substituted values:

```bash
flux get kustomization api-server
```

Check the generated secret:

```bash
kubectl get secret app-database-secrets -n production -o jsonpath='{.data.database-url}' | base64 -d
```

## Conclusion

Flux post-build substitution provides an effective way to manage database connection strings across environments. Whether you store individual connection components or complete connection strings in Secrets, the approach keeps sensitive data out of Git and makes environment-specific configuration straightforward. By combining component-based variables with default values, you get a flexible system that handles differences between development, staging, and production databases without duplicating your application manifests.
