# How to Configure Vault for Secrets Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, Vault, HashiCorp, Secrets Management, DevOps, Kubernetes, Encryption

Description: Learn how to deploy and configure HashiCorp Vault to securely store, access, and manage secrets, API keys, and sensitive configuration across your infrastructure.

---

Secrets scattered across environment variables, config files, and developer machines are a breach waiting to happen. HashiCorp Vault centralizes secret storage with fine-grained access control, audit logging, and automatic rotation. This guide covers deployment, secrets engines, authentication methods, and Kubernetes integration.

## What Vault Provides

Vault goes beyond simple secret storage:

- **Secret Storage**: Key-value secrets, database credentials, API keys
- **Dynamic Secrets**: Generate credentials on-demand with automatic expiration
- **Encryption as a Service**: Encrypt data without managing keys
- **Identity-Based Access**: Authenticate services and users with policies
- **Secret Leasing**: All secrets have TTLs and can be revoked
- **Audit Logging**: Every access is logged for compliance

## Architecture Overview

```mermaid
flowchart TB
    subgraph Clients
        A[Applications]
        B[CI/CD Pipelines]
        C[Developers]
    end

    subgraph Vault Cluster
        D[Vault Server]
        E[Storage Backend]
        F[Secrets Engines]
        G[Auth Methods]
    end

    A --> |Authenticate| G
    B --> |Authenticate| G
    C --> |Authenticate| G
    G --> D
    D --> F
    D --> E

    F --> H[KV Secrets]
    F --> I[Database Credentials]
    F --> J[PKI Certificates]
    F --> K[Cloud Credentials]
```

## Deploying Vault

### Docker (Development)

```bash
# Start Vault in development mode (not for production!)
docker run --cap-add=IPC_LOCK -d --name=vault \
  -e 'VAULT_DEV_ROOT_TOKEN_ID=myroot' \
  -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' \
  -p 8200:8200 \
  hashicorp/vault

# Set environment variables
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='myroot'

# Verify
vault status
```

### Kubernetes with Helm (Production)

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault with integrated storage (Raft)
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set server.ha.enabled=true \
  --set server.ha.replicas=3 \
  --set server.ha.raft.enabled=true
```

Initialize and unseal the cluster:

```bash
# Initialize (generates unseal keys and root token)
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3

# Store the output securely! You need 3 of 5 keys to unseal.

# Unseal each pod (repeat with 3 different keys)
kubectl exec -n vault vault-0 -- vault operator unseal $KEY1
kubectl exec -n vault vault-0 -- vault operator unseal $KEY2
kubectl exec -n vault vault-0 -- vault operator unseal $KEY3

# Join other pods to the cluster
kubectl exec -n vault vault-1 -- vault operator raft join http://vault-0.vault-internal:8200
kubectl exec -n vault vault-2 -- vault operator raft join http://vault-0.vault-internal:8200
```

## Secrets Engines

### KV (Key-Value) Secrets

The most common secrets engine stores arbitrary key-value pairs:

```bash
# Enable KV secrets engine (version 2)
vault secrets enable -path=secret kv-v2

# Store a secret
vault kv put secret/myapp/config \
  database_url="postgres://user:pass@db:5432/mydb" \
  api_key="sk-12345abcde"

# Read a secret
vault kv get secret/myapp/config

# Read specific field
vault kv get -field=api_key secret/myapp/config

# List secrets
vault kv list secret/myapp

# Delete a secret
vault kv delete secret/myapp/config

# Restore a deleted secret (versioned)
vault kv undelete -versions=1 secret/myapp/config
```

### Dynamic Database Credentials

Vault can generate database credentials on-demand:

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/mydb \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/mydb?sslmode=require" \
  allowed_roles="readonly,readwrite" \
  username="vault_admin" \
  password="admin_password"

# Create a role that generates read-only credentials
vault write database/roles/readonly \
  db_name=mydb \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Generate credentials (new user created in PostgreSQL)
vault read database/creds/readonly
# Key                Value
# lease_id           database/creds/readonly/abc123
# lease_duration     1h
# username           v-token-readonly-xyz789
# password           A1B2C3D4E5F6

# Credentials automatically revoked after TTL
```

### PKI (Certificate Authority)

Vault can act as a certificate authority:

```bash
# Enable PKI secrets engine
vault secrets enable pki

# Configure maximum TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root certificate
vault write pki/root/generate/internal \
  common_name="example.com" \
  ttl=87600h

# Create a role for issuing certificates
vault write pki/roles/web-servers \
  allowed_domains="example.com" \
  allow_subdomains=true \
  max_ttl="72h"

# Issue a certificate
vault write pki/issue/web-servers \
  common_name="api.example.com" \
  ttl="24h"
```

## Authentication Methods

### AppRole (for Applications)

```bash
# Enable AppRole auth
vault auth enable approle

# Create a policy
vault policy write myapp-policy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "database/creds/readonly" {
  capabilities = ["read"]
}
EOF

# Create an AppRole
vault write auth/approle/role/myapp \
  token_policies="myapp-policy" \
  token_ttl=1h \
  token_max_ttl=4h \
  secret_id_ttl=10m \
  secret_id_num_uses=1

# Get RoleID (static, can be embedded in config)
vault read auth/approle/role/myapp/role-id

# Generate SecretID (dynamic, delivered securely)
vault write -f auth/approle/role/myapp/secret-id

# Application authenticates with both
vault write auth/approle/login \
  role_id="$ROLE_ID" \
  secret_id="$SECRET_ID"
```

### Kubernetes Auth

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure (run from a pod with access to Kubernetes API)
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create a role for a specific service account
vault write auth/kubernetes/role/myapp \
  bound_service_account_names=myapp-sa \
  bound_service_account_namespaces=default \
  policies=myapp-policy \
  ttl=1h
```

### OIDC (for Humans)

```bash
# Enable OIDC auth
vault auth enable oidc

# Configure with your identity provider
vault write auth/oidc/config \
  oidc_discovery_url="https://accounts.google.com" \
  oidc_client_id="$CLIENT_ID" \
  oidc_client_secret="$CLIENT_SECRET" \
  default_role="default"

# Create a role mapping claims to policies
vault write auth/oidc/role/default \
  bound_audiences="$CLIENT_ID" \
  allowed_redirect_uris="http://localhost:8250/oidc/callback" \
  user_claim="email" \
  policies="default"
```

## Kubernetes Integration

### Using the Vault Agent Injector

The injector automatically injects secrets into pods:

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
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        # Inject secret as file
        vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
        # Template the secret
        vault.hashicorp.com/agent-inject-template-config: |
          {{- with secret "secret/data/myapp/config" -}}
          DATABASE_URL={{ .Data.data.database_url }}
          API_KEY={{ .Data.data.api_key }}
          {{- end -}}
    spec:
      serviceAccountName: myapp-sa
      containers:
        - name: myapp
          image: myapp:v1.0
          # Secret available at /vault/secrets/config
          command: ["sh", "-c", "source /vault/secrets/config && ./start.sh"]
```

### Using the Vault CSI Provider

Mount secrets as volumes:

```yaml
# SecretProviderClass
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-secrets
spec:
  provider: vault
  parameters:
    vaultAddress: "http://vault.vault:8200"
    roleName: "myapp"
    objects: |
      - objectName: "database_url"
        secretPath: "secret/data/myapp/config"
        secretKey: "database_url"
      - objectName: "api_key"
        secretPath: "secret/data/myapp/config"
        secretKey: "api_key"
---
# Pod using the secrets
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  serviceAccountName: myapp-sa
  containers:
    - name: myapp
      image: myapp:v1.0
      volumeMounts:
        - name: secrets
          mountPath: "/secrets"
          readOnly: true
  volumes:
    - name: secrets
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "vault-secrets"
```

## Audit Logging

Enable audit logging for compliance:

```bash
# Enable file audit device
vault audit enable file file_path=/vault/logs/audit.log

# Enable syslog audit device
vault audit enable syslog tag="vault" facility="AUTH"

# View audit log entry
# Every request and response is logged with requestor identity
```

## Policies

Define fine-grained access control:

```hcl
# myapp-policy.hcl

# Read-only access to app secrets
path "secret/data/myapp/*" {
  capabilities = ["read", "list"]
}

# Generate database credentials
path "database/creds/readonly" {
  capabilities = ["read"]
}

# Deny access to admin paths
path "sys/*" {
  capabilities = ["deny"]
}

# Allow token renewal
path "auth/token/renew-self" {
  capabilities = ["update"]
}
```

Apply the policy:

```bash
vault policy write myapp myapp-policy.hcl
```

---

Vault transforms secret management from a liability into a capability. Start with the KV secrets engine and AppRole authentication, then expand to dynamic secrets and Kubernetes integration. The investment in proper secret management pays off the first time you need to rotate a compromised credential across your entire infrastructure.
