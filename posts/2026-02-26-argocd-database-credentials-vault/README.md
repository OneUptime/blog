# How to Manage Database Credentials with ArgoCD and Vault

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, HashiCorp Vault, Database

Description: Learn how to manage database credentials in ArgoCD-deployed applications using HashiCorp Vault dynamic secrets, including PostgreSQL, MySQL, and MongoDB credential generation and rotation.

---

Database credentials are some of the most sensitive secrets in any application. Static passwords shared across environments, stored in config files, and rarely rotated are a recipe for a security breach. HashiCorp Vault solves this by generating short-lived, unique database credentials on demand. When you combine this with ArgoCD for GitOps deployments, you get a system where applications automatically receive fresh credentials without anyone ever seeing or typing a password.

In this guide, I will show you how to set up this integration end to end, from configuring Vault's database secrets engine to deploying applications through ArgoCD that consume dynamic credentials.

## Architecture Overview

```mermaid
graph TD
    A[ArgoCD syncs from Git] --> B[Deploys ExternalSecret + Deployment]
    B --> C[External Secrets Operator]
    C --> D[Requests credentials from Vault]
    D --> E[Vault Database Secrets Engine]
    E --> F[Generates temp DB user/password]
    F --> G[Returns credentials to ESO]
    G --> H[ESO creates Kubernetes Secret]
    H --> I[Pod mounts Secret as env vars]
    I --> J[App connects to database]
    J --> K[Credentials expire after TTL]
    K --> D
```

## Prerequisites

You need the following components installed:

- ArgoCD running in your cluster
- HashiCorp Vault (external or in-cluster)
- External Secrets Operator
- A PostgreSQL, MySQL, or MongoDB database

## Step 1: Configure Vault Database Secrets Engine

### PostgreSQL

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the PostgreSQL connection
vault write database/config/production-postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-readonly,app-readwrite" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.db.example.com:5432/appdb?sslmode=require" \
  username="vault_admin" \
  password="vault_admin_password" \
  password_authentication="scram-sha-256"

# Create a read-only role
vault write database/roles/app-readonly \
  db_name=production-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO \"{{name}}\";" \
  revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Create a read-write role
vault write database/roles/app-readwrite \
  db_name=production-postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO \"{{name}}\";" \
  revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### MySQL

```bash
vault write database/config/production-mysql \
  plugin_name=mysql-database-plugin \
  allowed_roles="app-mysql-role" \
  connection_url="{{username}}:{{password}}@tcp(mysql.db.example.com:3306)/appdb" \
  username="vault_admin" \
  password="vault_admin_password"

vault write database/roles/app-mysql-role \
  db_name=production-mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO '{{name}}'@'%';" \
  default_ttl="1h" \
  max_ttl="24h"
```

### MongoDB

```bash
vault write database/config/production-mongo \
  plugin_name=mongodb-database-plugin \
  allowed_roles="app-mongo-role" \
  connection_url="mongodb://{{username}}:{{password}}@mongo.db.example.com:27017/admin?tls=true" \
  username="vault_admin" \
  password="vault_admin_password"

vault write database/roles/app-mongo-role \
  db_name=production-mongo \
  creation_statements='{"db": "appdb", "roles": [{"role": "readWrite"}]}' \
  default_ttl="1h" \
  max_ttl="24h"
```

## Step 2: Configure Vault Kubernetes Auth

Vault needs to authenticate requests from your Kubernetes cluster:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure it with the cluster's service account
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  token_reviewer_jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  kubernetes_ca_cert="$(cat /var/run/secrets/kubernetes.io/serviceaccount/ca.crt)"

# Create a policy for the external secrets operator
vault policy write external-secrets - <<EOF
path "database/creds/app-readonly" {
  capabilities = ["read"]
}
path "database/creds/app-readwrite" {
  capabilities = ["read"]
}
EOF

# Bind the policy to the ESO service account
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

## Step 3: Set Up External Secrets Operator

Create a ClusterSecretStore that connects to Vault:

```yaml
# cluster-secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-database
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "database"
      version: "v1"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets
```

## Step 4: Create ExternalSecrets for Database Credentials

This is the manifest that goes in your Git repository. It contains no sensitive data:

```yaml
# external-secret-db.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  # Refresh before the TTL expires
  refreshInterval: 45m
  secretStoreRef:
    name: vault-database
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Template the connection string
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@postgres.db.example.com:5432/appdb?sslmode=require"
        DB_USERNAME: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
  dataFrom:
    - extract:
        key: creds/app-readwrite
```

## Step 5: Deploy with ArgoCD

Create the ArgoCD Application that deploys everything:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-api
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/your-org/apps.git
    targetRevision: main
    path: apps/api/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  ignoreDifferences:
    # Vault generates unique credentials each time
    - group: ""
      kind: Secret
      name: database-credentials
      jsonPointers:
        - /data
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - RespectIgnoreDifferences=true
      - CreateNamespace=true
```

The application manifests in Git:

```yaml
# apps/api/base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
        - name: api
          image: myorg/api-server:v2.5.0
          ports:
            - containerPort: 8080
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: DATABASE_URL
          # Connection pool settings for dynamic credentials
          env:
            - name: DB_MAX_CONNECTIONS
              value: "10"
            - name: DB_MAX_IDLE_TIME
              value: "30m"
            - name: DB_MAX_LIFETIME
              value: "50m"  # Less than Vault TTL
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15

---
# apps/api/base/external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
spec:
  refreshInterval: 45m
  secretStoreRef:
    name: vault-database
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        DATABASE_URL: "postgresql://{{ .username }}:{{ .password }}@postgres.db.example.com:5432/appdb?sslmode=require"
        DB_USERNAME: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
  dataFrom:
    - extract:
        key: creds/app-readwrite
```

## Handling Credential Rotation Gracefully

The biggest challenge with dynamic credentials is handling the transition period when old credentials expire and new ones are issued. Here is how to handle it:

### Connection Pool Configuration

Configure your application's connection pool to handle credential changes:

```yaml
# Application-level database configuration
database:
  # Set connection lifetime shorter than Vault TTL
  maxLifetime: 50m   # Vault TTL is 60m
  maxIdleTime: 30m
  maxOpenConns: 10
  maxIdleConns: 5
  # Enable connection health checks
  connHealthCheck: true
```

### Using Reloader for Pod Restarts

The Stakater Reloader watches for Secret changes and triggers rolling restarts:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    # Reloader restarts pods when the secret changes
    reloader.stakater.com/auto: "true"
spec:
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime rotation
```

### Refresh Interval Strategy

Set the ESO refresh interval to be well under the Vault TTL:

```
Vault TTL:        60 minutes
ESO Refresh:      45 minutes (refresh before expiry)
Connection Max:   50 minutes (close connections before expiry)
```

This ensures that new credentials are always fetched before the current ones expire.

## Monitoring Database Credential Health

```yaml
# PrometheusRule for monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: db-credential-alerts
spec:
  groups:
    - name: database-credentials
      rules:
        - alert: VaultDatabaseCredentialFetchFailed
          expr: |
            externalsecret_status_condition{
              condition="Ready",
              status="False",
              name=~".*database.*"
            } == 1
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Failed to fetch database credentials from Vault"

        - alert: DatabaseConnectionFailures
          expr: |
            rate(app_database_connection_errors_total[5m]) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Database connection failures detected - possible credential issue"
```

## Summary

Managing database credentials with ArgoCD and Vault gives you the best of both worlds: GitOps-driven deployment with dynamic, short-lived credentials. The ExternalSecret manifest in Git tells ESO what to fetch from Vault, Vault generates unique credentials with limited lifetimes, and ArgoCD keeps everything in sync. The key to making this work smoothly is proper TTL and refresh interval alignment, connection pool configuration, and monitoring. For more on ArgoCD secret management patterns, see our comprehensive [secret management guide](https://oneuptime.com/blog/post/2026-02-02-argocd-secrets/view).
