# How to Handle Secret Rotation with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Secrets, Security

Description: Learn how to implement automated secret rotation in ArgoCD-managed Kubernetes clusters using External Secrets Operator, Vault, and rolling restart strategies for zero-downtime credential updates.

---

Secret rotation is one of the trickiest challenges in GitOps. You need credentials to change regularly, but you also need applications to pick up new credentials without downtime. With ArgoCD managing your deployments, you need a strategy that works with the GitOps model rather than against it.

In this post, I will show you practical approaches to rotating secrets in ArgoCD environments, from simple refresh intervals to fully automated rotation pipelines.

## The Secret Rotation Challenge in GitOps

In a traditional setup, you might rotate a database password by updating it in your secret manager and restarting your application. In GitOps with ArgoCD, it gets more complex:

1. Secrets should not be in Git (as covered in our [preventing secrets in Git](https://oneuptime.com/blog/post/2026-02-26-argocd-prevent-secrets-in-git/view) guide)
2. ArgoCD syncs from Git, so rotation needs to happen outside of Git
3. Applications need to reload after a secret changes
4. The rotation window must avoid breaking active connections

## Approach 1: External Secrets Operator with Refresh Intervals

The simplest rotation strategy uses ESO's built-in refresh mechanism. ESO periodically polls the external secret store and updates the Kubernetes Secret when values change:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  # Check for updates every 15 minutes
  refreshInterval: 15m
  secretStoreRef:
    name: vault-store
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    deletionPolicy: Retain
  data:
    - secretKey: username
      remoteRef:
        key: secret/data/production/db
        property: username
    - secretKey: password
      remoteRef:
        key: secret/data/production/db
        property: password
```

When the secret changes in Vault, ESO picks it up within 15 minutes and updates the Kubernetes Secret. The challenge is getting your application to use the new credentials.

## Approach 2: Vault Dynamic Secrets with TTLs

HashiCorp Vault can generate short-lived database credentials automatically. This means credentials rotate themselves:

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the PostgreSQL connection
vault write database/config/myapp-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp-role" \
  connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/myapp" \
  username="vault_admin" \
  password="vault_admin_password"

# Create a role with a 1-hour TTL
vault write database/roles/myapp-role \
  db_name=myapp-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Configure ESO to use Vault's dynamic secrets:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dynamic-db-creds
  namespace: production
spec:
  refreshInterval: 30m
  secretStoreRef:
    name: vault-store
    kind: ClusterSecretStore
  target:
    name: dynamic-db-creds
    creationPolicy: Owner
  dataFrom:
    - extract:
        key: database/creds/myapp-role
```

## Approach 3: Reloader for Automatic Pod Restarts

When a Kubernetes Secret changes, pods using it do not automatically restart. The Stakater Reloader watches for Secret changes and triggers rolling restarts:

```bash
# Install Reloader
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader --namespace kube-system
```

Annotate your Deployment to watch for secret changes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  annotations:
    # Reloader watches this specific secret
    reloader.stakater.com/auto: "true"
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
      containers:
        - name: myapp
          image: myapp:latest
          envFrom:
            - secretRef:
                name: database-credentials
```

When ESO updates the `database-credentials` secret, Reloader triggers a rolling restart of the pods, so they pick up the new values.

## Approach 4: Sealed Secrets Key Rotation

Sealed Secrets uses encryption keys that should also be rotated. The controller generates new keys periodically, but existing sealed secrets continue to work:

```bash
# Check current sealing keys
kubectl get secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key

# Force key rotation
kubectl annotate secret -n kube-system -l sealedsecrets.bitnami.com/sealed-secrets-key \
  sealedsecrets.bitnami.com/sealed-secrets-key- --overwrite

# Re-encrypt all sealed secrets with the new key
kubeseal --re-encrypt < sealed-secret.yaml > re-encrypted-sealed-secret.yaml
```

Automate re-encryption in your CI pipeline:

```yaml
# .github/workflows/rotate-sealed-secrets.yaml
name: Rotate Sealed Secrets Keys
on:
  schedule:
    - cron: '0 0 1 * *'  # Monthly

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Re-encrypt all sealed secrets
        run: |
          for f in $(find . -name 'sealed-*.yaml'); do
            kubeseal --re-encrypt < "$f" > "$f.tmp"
            mv "$f.tmp" "$f"
          done

      - name: Commit re-encrypted secrets
        run: |
          git config user.name "secret-rotator"
          git config user.email "rotator@example.com"
          git add .
          git commit -m "chore: re-encrypt sealed secrets with new key"
          git push
```

## Approach 5: Full Automation Pipeline

Here is a complete automated rotation pipeline that combines Vault, ESO, and Reloader:

```mermaid
graph TD
    A[Vault generates new credentials] --> B[ESO detects change via refreshInterval]
    B --> C[ESO updates Kubernetes Secret]
    C --> D[Reloader detects Secret change]
    D --> E[Rolling restart of Pods]
    E --> F[Pods connect with new credentials]
    F --> G[Old credentials expire via TTL]
```

The infrastructure setup for this pipeline:

```yaml
# 1. ClusterSecretStore connecting to Vault
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-store
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
            namespace: external-secrets

---
# 2. ExternalSecret with aggressive refresh
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-credentials
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: vault-store
    kind: ClusterSecretStore
  target:
    name: app-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_HOST
      remoteRef:
        key: secret/data/production/app
        property: db_host
    - secretKey: DB_PASSWORD
      remoteRef:
        key: secret/data/production/app
        property: db_password
    - secretKey: API_KEY
      remoteRef:
        key: secret/data/production/app
        property: api_key

---
# 3. Deployment with Reloader annotation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: production-app
  namespace: production
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  replicas: 3
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: production-app
  template:
    metadata:
      labels:
        app: production-app
    spec:
      containers:
        - name: app
          image: myapp:v2.1.0
          envFrom:
            - secretRef:
                name: app-credentials
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
```

## Handling Dual-Credential Rotation

For database passwords, you often need a dual-credential approach to avoid downtime. Both old and new credentials work during the transition:

```bash
# Vault rotation script
#!/bin/bash
# Step 1: Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Step 2: Update database to accept both old and new passwords
# (Using PostgreSQL ALTER ROLE)
PGPASSWORD=$OLD_PASSWORD psql -h db.example.com -U admin -c \
  "ALTER ROLE app_user WITH PASSWORD '$NEW_PASSWORD';"

# Step 3: Update Vault with new password
vault kv put secret/production/db \
  username=app_user \
  password=$NEW_PASSWORD

# Step 4: Wait for ESO refresh + pod rollout
sleep 600

# Step 5: Verify all pods are using new credentials
# (Check pod restart timestamps)
kubectl get pods -n production -l app=myapp -o wide
```

## Monitoring Rotation Health

Set up monitoring to ensure rotation works properly:

```yaml
# PrometheusRule for secret rotation monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-rotation-alerts
  namespace: monitoring
spec:
  groups:
    - name: secret-rotation
      rules:
        - alert: ExternalSecretSyncFailed
          expr: |
            externalsecret_status_condition{condition="Ready", status="False"} == 1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "ExternalSecret {{ $labels.name }} sync failed"
            description: "Secret rotation may be broken for {{ $labels.name }} in {{ $labels.namespace }}"

        - alert: SecretNotRefreshed
          expr: |
            time() - externalsecret_status_sync_time > 7200
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "ExternalSecret {{ $labels.name }} not refreshed in 2 hours"
```

For comprehensive monitoring of your ArgoCD deployment health alongside secret rotation, consider setting up [monitoring with OpenTelemetry](https://oneuptime.com/blog/post/2026-02-06-monitor-argocd-deployments-opentelemetry/view).

## ArgoCD Sync Considerations

ArgoCD will detect the ExternalSecret as OutOfSync when you change the refresh interval or other spec fields. But it should not interfere with ESO updating the target Secret, because ArgoCD does not manage the Secret directly - ESO does.

Make sure to configure ignoreDifferences for any fields that change during rotation:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: production-app
  namespace: argocd
spec:
  ignoreDifferences:
    - group: ""
      kind: Secret
      jsonPointers:
        - /data
  # ... rest of the spec
```

## Summary

Secret rotation in ArgoCD environments works best when you separate the rotation mechanism from the GitOps pipeline. Use External Secrets Operator or Vault to handle the actual rotation, Reloader to propagate changes to pods, and ArgoCD to manage the declarative configuration that ties it all together. The key insight is that ArgoCD manages the "how" (ExternalSecret manifests) while the secret store manages the "what" (actual credential values).
