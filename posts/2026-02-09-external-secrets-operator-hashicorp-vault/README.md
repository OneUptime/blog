# How to Use External Secrets Operator with HashiCorp Vault Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vault, Secrets Management

Description: Learn how to integrate External Secrets Operator with HashiCorp Vault to sync secrets into Kubernetes, supporting multiple authentication methods and dynamic secrets.

---

HashiCorp Vault provides sophisticated secret management with dynamic secrets, lease management, and detailed audit logging. However, consuming Vault secrets in Kubernetes requires either the Vault Agent injector or custom code in your applications. Both approaches add complexity.

External Secrets Operator simplifies this by syncing Vault secrets directly into Kubernetes Secrets. Your applications use standard Kubernetes Secrets while benefiting from Vault's advanced secret management capabilities, including automatic rotation and dynamic credentials.

In this guide, you'll learn how to configure External Secrets Operator to work with HashiCorp Vault, implement different authentication methods, and manage both static and dynamic secrets.

## Prerequisites

You need a running Vault instance. For this guide, we assume Vault is accessible at `https://vault.example.com` and you have admin access to configure policies and authentication methods.

If you need to set up Vault, see the HashiCorp Vault documentation or deploy it in Kubernetes:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.dev.enabled=true
```

## Installing External Secrets Operator

Install ESO with Helm:

```bash
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

helm install external-secrets \
  external-secrets/external-secrets \
  --namespace external-secrets-system \
  --create-namespace \
  --set installCRDs=true
```

Verify installation:

```bash
kubectl get pods -n external-secrets-system
kubectl get crd | grep external-secrets
```

## Configuring Vault

Create a KV v2 secrets engine in Vault:

```bash
# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2

# Store some secrets
vault kv put secret/production/database \
  username=dbuser \
  password=SecurePassword123 \
  host=postgres.example.com \
  port=5432

vault kv put secret/production/api-keys \
  stripe_key=sk_live_abc123 \
  sendgrid_key=SG.xyz789 \
  datadog_key=dd_api_key_456

vault kv put secret/production/tls \
  cert=@cert.pem \
  key=@key.pem
```

## Setting Up Vault Authentication

External Secrets Operator supports multiple Vault authentication methods. We'll cover the most common ones.

### Method 1: Kubernetes Authentication (Recommended)

Kubernetes auth allows Vault to authenticate service accounts using their JWT tokens.

Enable and configure Kubernetes auth in Vault:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
  token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token
```

Create a Vault policy that allows reading secrets:

```bash
# Create policy
vault policy write external-secrets-policy - <<EOF
path "secret/data/production/*" {
  capabilities = ["read"]
}
path "secret/metadata/production/*" {
  capabilities = ["list", "read"]
}
EOF
```

Create a Vault role that binds to the Kubernetes service account:

```bash
vault write auth/kubernetes/role/external-secrets \
  bound_service_account_names=external-secrets \
  bound_service_account_namespaces=external-secrets-system \
  policies=external-secrets-policy \
  ttl=1h
```

### Method 2: AppRole Authentication

AppRole is useful for non-Kubernetes environments or when you want more control:

```bash
# Enable AppRole auth
vault auth enable approle

# Create AppRole
vault write auth/approle/role/external-secrets \
  secret_id_ttl=0 \
  token_ttl=20m \
  token_max_ttl=30m \
  policies=external-secrets-policy

# Get role ID
vault read auth/approle/role/external-secrets/role-id

# Generate secret ID
vault write -f auth/approle/role/external-secrets/secret-id
```

Store the credentials in Kubernetes:

```bash
kubectl create secret generic vault-approle \
  --namespace external-secrets-system \
  --from-literal=role-id=abc-123-def \
  --from-literal=secret-id=xyz-789-uvw
```

### Method 3: Token Authentication (Development Only)

For development, use a static token:

```bash
# Create a token with the policy
vault token create -policy=external-secrets-policy

# Store in Kubernetes
kubectl create secret generic vault-token \
  --namespace external-secrets-system \
  --from-literal=token=hvs.CAESIJ...
```

## Creating SecretStore with Kubernetes Auth

Create a SecretStore that connects to Vault using Kubernetes authentication:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
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
```

For a ClusterSecretStore accessible from all namespaces:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-backend
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
            namespace: external-secrets-system
```

## Creating SecretStore with AppRole Auth

For AppRole authentication:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      auth:
        appRole:
          path: "approle"
          roleId: "abc-123-def"
          secretRef:
            name: vault-approle
            key: secret-id
            namespace: external-secrets-system
```

## Creating ExternalSecret Resources

### Syncing Database Credentials

Sync database credentials from Vault:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-credentials
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
  - secretKey: host
    remoteRef:
      key: production/database
      property: host
  - secretKey: port
    remoteRef:
      key: production/database
      property: port
```

### Using dataFrom for All Properties

Extract all fields from a Vault secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: api-keys
  namespace: production
spec:
  refreshInterval: 10m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: api-keys
    creationPolicy: Owner
  dataFrom:
  - extract:
      key: production/api-keys
```

This creates a Kubernetes Secret with keys: `stripe_key`, `sendgrid_key`, `datadog_key`.

### Combining Multiple Vault Secrets

Combine data from multiple Vault paths into one Kubernetes Secret:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-config
  namespace: production
spec:
  refreshInterval: 5m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: app-config
    creationPolicy: Owner
  data:
  # From database secret
  - secretKey: db_password
    remoteRef:
      key: production/database
      property: password
  # From API keys
  - secretKey: stripe_key
    remoteRef:
      key: production/api-keys
      property: stripe_key
  # From another path
  - secretKey: license_key
    remoteRef:
      key: production/licenses
      property: app_license
```

### Using Templates to Transform Secrets

Create complex secret formats using templates:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: database-connection
  namespace: production
spec:
  refreshInterval: 15m
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: database-connection
    creationPolicy: Owner
    template:
      engineVersion: v2
      data:
        # Create connection string
        connection_string: |
          postgresql://{{ .username }}:{{ .password }}@{{ .host }}:{{ .port }}/production
        # Create JSON config
        config.json: |
          {
            "database": {
              "host": "{{ .host }}",
              "port": {{ .port }},
              "username": "{{ .username }}",
              "password": "{{ .password }}",
              "ssl": true
            }
          }
  data:
  - secretKey: username
    remoteRef:
      key: production/database
      property: username
  - secretKey: password
    remoteRef:
      key: production/database
      property: password
  - secretKey: host
    remoteRef:
      key: production/database
      property: host
  - secretKey: port
    remoteRef:
      key: production/database
      property: port
```

## Working with Dynamic Secrets

Vault can generate dynamic secrets like database credentials. Configure ESO to fetch them:

First, enable and configure the database secrets engine in Vault:

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/production \
  plugin_name=postgresql-database-plugin \
  allowed_roles="readonly" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.example.com:5432/production" \
  username="vault" \
  password="vault-password"

# Create a role that generates read-only credentials
vault write database/roles/readonly \
  db_name=production \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Update the Vault policy:

```bash
vault policy write external-secrets-policy - <<EOF
path "secret/data/production/*" {
  capabilities = ["read"]
}
path "database/creds/readonly" {
  capabilities = ["read"]
}
EOF
```

Create an ExternalSecret for dynamic credentials:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: postgres-dynamic-creds
  namespace: production
spec:
  refreshInterval: 30m  # Refresh before credentials expire
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: postgres-dynamic-creds
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: database/creds/readonly
      property: username
  - secretKey: password
    remoteRef:
      key: database/creds/readonly
      property: password
```

The operator generates new credentials every 30 minutes. Use Reloader to restart pods when credentials change:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  namespace: production
  annotations:
    secret.reloader.stakater.com/reload: "postgres-dynamic-creds"
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: postgres-dynamic-creds
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-dynamic-creds
              key: password
```

## Handling Vault Namespaces

If using Vault Enterprise with namespaces:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      namespace: "production-team"  # Vault namespace
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
```

## Using CA Certificates for TLS

If Vault uses a custom CA:

```bash
# Create ConfigMap with CA certificate
kubectl create configmap vault-ca \
  --namespace external-secrets-system \
  --from-file=ca.crt=vault-ca.pem
```

Reference it in the SecretStore:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-backend
  namespace: production
spec:
  provider:
    vault:
      server: "https://vault.example.com"
      path: "secret"
      version: "v2"
      caBundle: <base64-encoded-ca-cert>
      # Or reference a ConfigMap
      caProvider:
        type: ConfigMap
        name: vault-ca
        key: ca.crt
        namespace: external-secrets-system
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "external-secrets"
          serviceAccountRef:
            name: external-secrets
```

## Monitoring and Troubleshooting

Check ExternalSecret status:

```bash
# List all ExternalSecrets
kubectl get externalsecrets -n production

# Describe to see sync status
kubectl describe externalsecret database-credentials -n production

# Check operator logs
kubectl logs -n external-secrets-system -l app.kubernetes.io/name=external-secrets
```

Common issues:

1. **Permission denied**: Check Vault policies and role bindings
2. **Connection refused**: Verify Vault server URL and network connectivity
3. **Invalid path**: Ensure the path matches your Vault configuration (e.g., `secret/data/` for KV v2)

## Best Practices

1. **Use Kubernetes auth**: It's the most secure method for Kubernetes environments, using short-lived tokens.

2. **Set appropriate refresh intervals**: Balance between secret freshness and Vault API load.

3. **Use ClusterSecretStore for shared secrets**: Reduce duplication for secrets used across multiple namespaces.

4. **Enable Vault audit logging**: Track all secret access for compliance and security.

5. **Use dynamic secrets when possible**: Database credentials, cloud IAM tokens, etc., benefit from automatic rotation.

6. **Monitor lease expiration**: Ensure refresh intervals are shorter than Vault lease durations.

7. **Use Vault namespaces**: In large organizations, use Vault Enterprise namespaces for multi-tenancy.

External Secrets Operator with HashiCorp Vault provides a powerful combination for secret management in Kubernetes. Your applications consume standard Kubernetes Secrets while benefiting from Vault's advanced features like dynamic secrets, detailed audit logs, and centralized policy management.
