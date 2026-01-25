# How to Fix "Secret Management" Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Secret Management, Kubernetes, Security, Vault, External Secrets, DevOps, Encryption

Description: A practical guide to diagnosing and fixing common secret management issues in Kubernetes, including missing secrets, access problems, rotation failures, and security misconfigurations.

---

Secret management issues can expose sensitive data or break your applications. A missing database password, an expired API key, or a misconfigured secret store can cause outages and security incidents. This guide covers how to identify, debug, and fix the most common secret management problems.

## Understanding Secret Sources

Kubernetes applications can retrieve secrets from multiple sources. Each has different failure modes and debugging approaches.

```mermaid
flowchart TD
    A[Application] --> B{Secret Sources}
    B --> C[Kubernetes Secrets]
    B --> D[External Secrets Operator]
    B --> E[HashiCorp Vault]
    B --> F[Cloud Provider KMS]

    C --> G[etcd]
    D --> H[AWS Secrets Manager]
    D --> I[GCP Secret Manager]
    D --> J[Azure Key Vault]
    E --> K[Vault Server]
```

## Fixing Missing Kubernetes Secrets

When a pod fails to start because of a missing secret, you will see errors like "secret not found" or pods stuck in ContainerCreating status.

```bash
# Check if the secret exists
kubectl get secret myapp-secrets -n myapp

# View pod events to find secret-related errors
kubectl describe pod myapp-pod -n myapp | grep -A10 Events

# Common error message:
# Warning  FailedMount  secret "myapp-secrets" not found
```

Create the missing secret:

```bash
# Create secret from literal values
kubectl create secret generic myapp-secrets \
  --from-literal=db-password='secretpassword123' \
  --from-literal=api-key='abc123xyz' \
  -n myapp

# Create secret from files
kubectl create secret generic myapp-secrets \
  --from-file=tls.crt=./server.crt \
  --from-file=tls.key=./server.key \
  -n myapp

# Create secret from env file
kubectl create secret generic myapp-secrets \
  --from-env-file=.env.production \
  -n myapp
```

## Fixing Secret Key Not Found Errors

Sometimes the secret exists but the referenced key does not.

```bash
# List all keys in a secret
kubectl get secret myapp-secrets -n myapp -o jsonpath='{.data}' | jq 'keys'

# View decoded secret values (be careful with this in production)
kubectl get secret myapp-secrets -n myapp -o jsonpath='{.data.db-password}' | base64 -d
```

Fix the key reference in your deployment:

```yaml
# Problem: Wrong key name
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: myapp-secrets
        key: database_password  # Key does not exist

# Fix: Use the correct key name
env:
  - name: DATABASE_PASSWORD
    valueFrom:
      secretKeyRef:
        name: myapp-secrets
        key: db-password  # Correct key name
```

## Fixing External Secrets Operator Issues

External Secrets Operator syncs secrets from external providers. Common issues include authentication failures and sync problems.

### Check ExternalSecret Status

```bash
# View ExternalSecret status
kubectl get externalsecret myapp-secrets -n myapp

# Get detailed information
kubectl describe externalsecret myapp-secrets -n myapp

# Check for sync errors
kubectl get externalsecret myapp-secrets -n myapp -o jsonpath='{.status.conditions}'
```

### Fix Authentication Issues

```yaml
# secretstore.yaml - Configure provider authentication
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-manager
  namespace: myapp
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        secretRef:
          accessKeyIDSecretRef:
            name: aws-credentials
            key: access-key-id
          secretAccessKeySecretRef:
            name: aws-credentials
            key: secret-access-key
```

Verify the credentials secret exists:

```bash
# Check if the authentication secret exists
kubectl get secret aws-credentials -n myapp

# Create it if missing
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id='AKIAIOSFODNN7EXAMPLE' \
  --from-literal=secret-access-key='wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' \
  -n myapp
```

### Fix Sync Issues

```yaml
# externalsecret.yaml - Correct configuration
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: myapp-secrets
  namespace: myapp
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: myapp-secrets
    creationPolicy: Owner
  data:
    # Map external secret to Kubernetes secret key
    - secretKey: db-password
      remoteRef:
        key: prod/myapp/database
        property: password
    - secretKey: api-key
      remoteRef:
        key: prod/myapp/api
        property: key
```

Force a refresh if the secret is stale:

```bash
# Annotate to trigger refresh
kubectl annotate externalsecret myapp-secrets \
  force-sync=$(date +%s) \
  -n myapp --overwrite
```

## Fixing HashiCorp Vault Issues

Vault integration issues typically involve authentication, policies, or network connectivity.

### Debug Vault Authentication

```bash
# Check Vault Agent or sidecar logs
kubectl logs myapp-pod -c vault-agent -n myapp

# Test Vault connectivity from a pod
kubectl exec -it myapp-pod -n myapp -- sh -c '
  wget -qO- --header="X-Vault-Token: $VAULT_TOKEN" \
    $VAULT_ADDR/v1/sys/health
'
```

### Fix Vault Policy Issues

```hcl
# vault-policy.hcl - Ensure correct permissions
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

path "secret/metadata/myapp/*" {
  capabilities = ["list"]
}

path "database/creds/myapp-db" {
  capabilities = ["read"]
}
```

Apply the policy and verify:

```bash
# Write the policy
vault policy write myapp-policy vault-policy.hcl

# Test reading a secret
vault kv get secret/myapp/database

# Check if the service account can authenticate
vault write auth/kubernetes/login \
  role=myapp \
  jwt=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
```

### Configure Vault Agent Injection

```yaml
# deployment with Vault annotations
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        # Enable Vault injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        # Inject secrets as files
        vault.hashicorp.com/agent-inject-secret-db-creds: "secret/data/myapp/database"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "secret/data/myapp/database" -}}
          export DATABASE_PASSWORD="{{ .Data.data.password }}"
          {{- end }}
    spec:
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myapp:latest
          command: ["/bin/sh", "-c"]
          args: ["source /vault/secrets/db-creds && ./app"]
```

## Fixing Secret Rotation Issues

Secrets need rotation, but applications may not pick up changes automatically.

### Detect Stale Secrets

```bash
# Check when the secret was last modified
kubectl get secret myapp-secrets -n myapp -o jsonpath='{.metadata.creationTimestamp}'

# For External Secrets, check last sync time
kubectl get externalsecret myapp-secrets -n myapp \
  -o jsonpath='{.status.refreshTime}'
```

### Force Application Restart on Secret Change

Use a checksum annotation to trigger restarts:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        # Recalculate on each helm upgrade
        checksum/secrets: {{ include (print $.Template.BasePath "/secrets.yaml") . | sha256sum }}
```

For dynamic reloading without restarts, use Reloader:

```bash
# Install Reloader
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
```

```yaml
# deployment.yaml with Reloader annotation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    reloader.stakater.com/auto: "true"  # Auto-reload on secret/configmap changes
```

## Fixing Secret Encryption Issues

Kubernetes secrets are base64 encoded, not encrypted. Enable encryption at rest for security.

### Check Encryption Configuration

```bash
# View encryption configuration (on control plane)
cat /etc/kubernetes/encryption-config.yaml

# Test if secrets are encrypted in etcd
ETCDCTL_API=3 etcdctl get /registry/secrets/default/myapp-secrets \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key | hexdump -C | head
```

### Configure Encryption at Rest

```yaml
# encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources:
      - secrets
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}  # Fallback for reading unencrypted secrets
```

Apply the configuration:

```bash
# Generate a strong encryption key
head -c 32 /dev/urandom | base64

# Add to kube-apiserver configuration
# --encryption-provider-config=/etc/kubernetes/encryption-config.yaml

# Re-encrypt existing secrets
kubectl get secrets --all-namespaces -o json | \
  kubectl replace -f -
```

## Implementing Secret Best Practices

### Use Sealed Secrets for GitOps

Sealed Secrets allows storing encrypted secrets in Git:

```bash
# Install kubeseal CLI
brew install kubeseal

# Create a sealed secret
kubectl create secret generic myapp-secrets \
  --from-literal=db-password='secret123' \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-secret.yaml

# Apply the sealed secret
kubectl apply -f sealed-secret.yaml
```

### Implement Secret Scanning in CI

```yaml
# .github/workflows/secret-scan.yaml
name: Secret Scanning
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Scan for secrets with gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Scan for secrets with trufflehog
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

### Monitor Secret Access

```yaml
# Kubernetes audit policy for secret access
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    omitStages:
      - RequestReceived
```

Set up alerts for suspicious access patterns:

```yaml
# prometheus-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: secret-access-alerts
spec:
  groups:
    - name: secrets
      rules:
        - alert: HighSecretAccessRate
          expr: |
            sum(rate(apiserver_request_total{
              resource="secrets",
              verb=~"get|list"
            }[5m])) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Unusually high secret access rate"
```

## Quick Reference for Common Issues

| Issue | Symptom | Solution |
|-------|---------|----------|
| Secret not found | Pod stuck in ContainerCreating | Create the missing secret |
| Key not found | Container fails to start | Check key name matches exactly |
| Auth failure | ExternalSecret sync error | Verify credentials and permissions |
| Stale secret | Application uses old value | Restart pod or use Reloader |
| Unencrypted | Security audit failure | Enable encryption at rest |

Secret management requires constant attention. Implement automation for rotation, use external secret managers for sensitive environments, and monitor access patterns for anomalies. When issues occur, start by checking if the secret exists and if the application has the correct permissions to access it.
