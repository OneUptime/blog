# How to Implement Secret Rotation with ArgoCD and Vault

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, HashiCorp Vault, Secrets

Description: Learn how to implement automated secret rotation between HashiCorp Vault and ArgoCD-managed applications using External Secrets Operator and Vault dynamic secrets.

---

Secret rotation is a security best practice that limits the blast radius of a compromised credential. HashiCorp Vault is the industry standard for secret management, and when combined with ArgoCD, you can build a fully automated rotation pipeline. This guide covers two approaches: periodic rotation of static secrets and Vault's dynamic secrets that are generated on demand and automatically expire.

## Rotation Strategies

There are two fundamentally different approaches to secret rotation with Vault:

```mermaid
graph TD
    subgraph Static Rotation
        A1[Vault Static Secret] -->|ESO Refresh| B1[Kubernetes Secret]
        B1 -->|Mount| C1[Application Pod]
        D1[Rotation Job] -->|Update| A1
    end
    subgraph Dynamic Secrets
        A2[Vault Dynamic Backend] -->|Generate on Demand| B2[Short-Lived Credential]
        B2 -->|Inject| C2[Application Pod]
        B2 -->|Auto-Expire| E2[Revoked]
    end
```

**Static rotation**: A scheduled job updates the secret in Vault, and the External Secrets Operator syncs the new value to Kubernetes. Applications pick up the change through volume mounts or restarts.

**Dynamic secrets**: Vault generates credentials on the fly with a built-in TTL. When they expire, new ones are generated. No rotation job is needed.

## Setting Up Vault for ArgoCD

First, configure Vault with Kubernetes authentication so ArgoCD-managed workloads can authenticate:

```bash
# Enable Kubernetes auth method in Vault
vault auth enable kubernetes

# Configure Kubernetes auth to connect to your cluster
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# Create a policy for the External Secrets Operator
vault policy write external-secrets - <<EOF
path "secret/data/*" {
  capabilities = ["read"]
}
path "database/creds/*" {
  capabilities = ["read"]
}
EOF

# Create a role for ESO
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets \
  policies=external-secrets \
  ttl=1h
```

## Static Secret Rotation with ESO

### Step 1: Store the Initial Secret in Vault

```bash
# Store the initial database credentials
vault kv put secret/payments/database \
  host=db.payments.internal \
  port=5432 \
  username=payment_svc \
  password=initial-secure-password \
  rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
```

### Step 2: Create the ExternalSecret in Git

```yaml
# external-secret.yaml - managed by ArgoCD
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: payments
spec:
  # How often ESO checks Vault for changes
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
    # Template the secret with a rotation timestamp
    template:
      type: Opaque
      metadata:
        annotations:
          # Track when the secret was last refreshed
          rotated-at: "{{ .rotated_at }}"
      data:
        DB_HOST: "{{ .host }}"
        DB_PORT: "{{ .port }}"
        DB_USERNAME: "{{ .username }}"
        DB_PASSWORD: "{{ .password }}"
  data:
    - secretKey: host
      remoteRef:
        key: payments/database
        property: host
    - secretKey: port
      remoteRef:
        key: payments/database
        property: port
    - secretKey: username
      remoteRef:
        key: payments/database
        property: username
    - secretKey: password
      remoteRef:
        key: payments/database
        property: password
    - secretKey: rotated_at
      remoteRef:
        key: payments/database
        property: rotated_at
```

### Step 3: Create the Rotation Job

Deploy a CronJob through ArgoCD that rotates the password:

```yaml
# rotation-job.yaml - managed by ArgoCD
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-db-credentials
  namespace: payments
spec:
  # Rotate every 30 days
  schedule: "0 2 1 * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
            - name: rotate
              image: vault:latest
              command:
                - /bin/sh
                - -c
                - |
                  set -e

                  # Authenticate to Vault
                  export VAULT_ADDR=https://vault.example.com
                  vault login -method=kubernetes role=secret-rotator

                  # Read the current secret
                  CURRENT=$(vault kv get -format=json secret/payments/database)
                  CURRENT_USER=$(echo $CURRENT | jq -r '.data.data.username')
                  CURRENT_HOST=$(echo $CURRENT | jq -r '.data.data.host')
                  CURRENT_PORT=$(echo $CURRENT | jq -r '.data.data.port')

                  # Generate a new password
                  NEW_PASSWORD=$(openssl rand -base64 32 | tr -d '=/+')

                  # Update the database password
                  # This uses psql to change the password directly
                  PGPASSWORD=$(echo $CURRENT | jq -r '.data.data.password') \
                    psql -h "$CURRENT_HOST" -p "$CURRENT_PORT" -U "$CURRENT_USER" -d payments \
                    -c "ALTER USER $CURRENT_USER WITH PASSWORD '$NEW_PASSWORD';"

                  # Update Vault with the new password
                  vault kv put secret/payments/database \
                    host="$CURRENT_HOST" \
                    port="$CURRENT_PORT" \
                    username="$CURRENT_USER" \
                    password="$NEW_PASSWORD" \
                    rotated_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

                  echo "Password rotated successfully at $(date)"
          restartPolicy: OnFailure
```

### Step 4: Trigger Application Restart on Secret Change

When the secret changes, applications need to pick up the new value. Use a Reloader or stakater/Reloader to watch for secret changes:

```yaml
# Deploy stakater/Reloader via ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: reloader
  namespace: argocd
spec:
  source:
    repoURL: https://stakater.github.io/stakater-charts
    chart: reloader
    targetRevision: 1.0.52
  destination:
    server: https://kubernetes.default.svc
    namespace: reloader
```

Annotate your deployment to watch for secret changes:

```yaml
# Deployment that auto-reloads on secret change
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
  annotations:
    # Reloader watches this secret and triggers a rolling restart
    reloader.stakater.com/auto: "true"
spec:
  template:
    spec:
      containers:
        - name: payment-service
          envFrom:
            - secretRef:
                name: database-credentials
```

## Dynamic Secrets with Vault Database Backend

Dynamic secrets are the gold standard for database credential management. Vault generates unique credentials for each request and automatically revokes them when they expire.

### Configure Vault Database Backend

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the PostgreSQL connection
vault write database/config/payments-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="payment-service" \
  connection_url="postgresql://{{username}}:{{password}}@db.payments.internal:5432/payments?sslmode=require" \
  username="vault_admin" \
  password="vault_admin_password"

# Create a role that generates credentials
vault write database/roles/payment-service \
  db_name=payments-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Use Dynamic Secrets with ESO

```yaml
# ExternalSecret using Vault dynamic database credentials
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: dynamic-db-credentials
  namespace: payments
spec:
  # Refresh before the TTL expires
  refreshInterval: 45m
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  dataFrom:
    - extract:
        # Use the database secrets engine path
        key: database/creds/payment-service
```

### Use Dynamic Secrets with Vault Agent Injector

For tighter integration, use Vault Agent as a sidecar:

```yaml
# Deployment with Vault Agent sidecar for dynamic secrets
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
spec:
  template:
    metadata:
      annotations:
        # Vault Agent annotations
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "payment-service"
        # Inject database credentials
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/payment-service"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/payment-service" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          {{- end }}
        # Auto-rotate by re-rendering when the lease expires
        vault.hashicorp.com/agent-inject-command-db-creds: |
          kill -HUP $(pidof payment-service) || true
    spec:
      serviceAccountName: payment-service
      containers:
        - name: payment-service
          image: myorg/payment-service:latest
          command:
            - /bin/sh
            - -c
            - "source /vault/secrets/db-creds && exec /app/payment-service"
```

Deploy the Vault Agent Injector via ArgoCD:

```yaml
# Deploy Vault Agent Injector with ArgoCD
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: vault-agent-injector
  namespace: argocd
spec:
  source:
    repoURL: https://helm.releases.hashicorp.com
    chart: vault
    targetRevision: 0.27.0
    helm:
      values: |
        injector:
          enabled: true
        server:
          enabled: false  # We use an external Vault server
  destination:
    server: https://kubernetes.default.svc
    namespace: vault
```

## Monitoring Rotation

Set up monitoring to ensure rotation is working:

```yaml
# PrometheusRule for rotation monitoring
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-rotation-alerts
spec:
  groups:
    - name: secret-rotation
      rules:
        - alert: SecretRotationOverdue
          expr: |
            (time() - kube_secret_created) > 2592000
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Secret {{ $labels.secret }} in {{ $labels.namespace }} not rotated in 30 days"

        - alert: VaultLeaseExpiringSoon
          expr: |
            vault_secret_lease_remaining_seconds < 300
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "Vault lease expiring in less than 5 minutes"
```

## Summary

Secret rotation with ArgoCD and Vault can be implemented through static rotation (CronJob updates Vault, ESO syncs to Kubernetes) or dynamic secrets (Vault generates short-lived credentials automatically). Dynamic secrets are more secure but require application support for credential renewal. Use the Vault Agent Injector for seamless integration, Reloader for automatic pod restarts on secret changes, and monitoring to ensure rotation is working reliably. For AWS-based rotation, see our guide on [secret rotation with ArgoCD and AWS](https://oneuptime.com/blog/post/2026-02-26-argocd-secret-rotation-aws/view). For multi-cluster secret management, see [handling secrets in multi-cluster ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-multi-cluster-secrets/view).
