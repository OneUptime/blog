# How to Use External Secrets with Flux for Database Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, External Secrets Operator, Database, Credentials

Description: Sync database credentials from external secret stores using ESO and Flux CD, enabling zero-downtime credential rotation for PostgreSQL, MySQL, and Redis workloads.

---

## Introduction

Database credentials are among the most sensitive secrets in any application. They grant direct access to your data and must be protected, rotated regularly, and audited carefully. Managing them through Kubernetes Secrets alone is insufficient - they are stored in etcd without encryption by default, and rotating them requires manual updates to Secret objects.

The External Secrets Operator solves this by keeping database credentials in a purpose-built secret store (AWS Secrets Manager, HashiCorp Vault, etc.) and syncing them into Kubernetes automatically. Combined with Flux CD managing the `ExternalSecret` configuration and Reloader triggering pod restarts on credential changes, you get a complete database credential rotation pipeline that requires zero manual intervention.

This guide covers syncing database credentials for PostgreSQL, MySQL, and Redis using ESO with Flux CD, including rotation-safe patterns.

## Prerequisites

- External Secrets Operator deployed via Flux HelmRelease
- A `SecretStore` configured for your external secret store
- Flux CD bootstrapped on the cluster
- Database credentials stored in the external secret store

## Step 1: Store Database Credentials in AWS Secrets Manager

Organize database credentials as JSON objects in the external store:

**Secret: `myapp/postgres-prod`**
```json
{
  "host": "postgres.prod.internal",
  "port": "5432",
  "database": "myapp_prod",
  "username": "myapp_user",
  "password": "$(generated-secure-password)",
  "ssl_mode": "require"
}
```

**Secret: `myapp/redis-prod`**
```json
{
  "host": "redis.prod.internal",
  "port": "6379",
  "password": "$(generated-redis-password)"
}
```

## Step 2: Sync PostgreSQL Credentials

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-postgres.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-postgres-credentials
  namespace: default
spec:
  # Refresh every 15 minutes to support hourly rotation
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-postgres
    creationPolicy: Owner
    deletionPolicy: Delete
    template:
      engineVersion: v2
      data:
        # Construct a complete DSN for the application
        DATABASE_URL: "postgres://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/{{ .database }}?sslmode={{ .ssl_mode }}"
        # Individual fields for applications that need them separately
        PGHOST: "{{ .host }}"
        PGPORT: "{{ .port }}"
        PGDATABASE: "{{ .database }}"
        PGUSER: "{{ .username }}"
        PGPASSWORD: "{{ .password }}"
  dataFrom:
    - extract:
        key: myapp/postgres-prod
```

## Step 3: Sync Redis Credentials

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-redis.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-redis-credentials
  namespace: default
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-redis
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Construct a Redis URL with authentication
        REDIS_URL: "redis://:{{ .password }}@{{ .host }}:{{ .port }}/0"
        REDIS_HOST: "{{ .host }}"
        REDIS_PORT: "{{ .port }}"
        REDIS_PASSWORD: "{{ .password }}"
  dataFrom:
    - extract:
        key: myapp/redis-prod
```

## Step 4: Sync MySQL Credentials

```yaml
# clusters/my-cluster/apps/myapp/externalsecret-mysql.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-mysql-credentials
  namespace: default
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-mysql
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # MySQL DSN for Go applications
        MYSQL_DSN: "{{ .username }}:{{ .password }}@tcp({{ .host }}:{{ .port }})/{{ .database }}?tls=true"
        # Separate env vars for Node.js/Python applications
        DB_HOST: "{{ .host }}"
        DB_PORT: "{{ .port }}"
        DB_NAME: "{{ .database }}"
        DB_USER: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
  dataFrom:
    - extract:
        key: myapp/mysql-prod
```

## Step 5: Reference Credentials in Deployments

```yaml
# clusters/my-cluster/apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: default
  annotations:
    # Reloader restarts the Deployment when the Secret changes
    secret.reloader.stakater.com/reload: "myapp-postgres,myapp-redis"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    spec:
      containers:
        - name: myapp
          image: myapp:latest
          envFrom:
            # Mount all keys from the postgres secret as env vars
            - secretRef:
                name: myapp-postgres
            - secretRef:
                name: myapp-redis
```

## Step 6: Manage with Flux Kustomization

```yaml
# clusters/my-cluster/apps/myapp/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./clusters/my-cluster/apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: secret-stores
    - name: reloader
  healthChecks:
    - apiVersion: external-secrets.io/v1beta1
      kind: ExternalSecret
      name: myapp-postgres-credentials
      namespace: default
```

## Best Practices

- Use template rendering to construct connection strings in the `ExternalSecret` rather than in application code; this keeps connection string format changes auditable in Git.
- Use `envFrom.secretRef` for applications that need many database parameters, rather than listing each `env.valueFrom.secretKeyRef` individually.
- Enable RDS or Cloud SQL automatic credential rotation and align the `refreshInterval` to be shorter than the rotation window.
- Mount database credentials as volumes rather than environment variables when possible; volumes update automatically without a pod restart when the Secret changes.
- Keep a `PGPASSWORD_PREVIOUS` key synced during dual-write rotation windows to allow in-flight transactions to complete with the old password.

## Conclusion

Using External Secrets Operator with Flux CD for database credentials creates a secure, rotation-friendly pattern where credentials never need to be manually updated in Kubernetes. The combination of ESO for synchronization, Reloader for automatic pod restarts, and Flux for declarative management means your database credentials are always fresh, always audited, and always managed as code.
