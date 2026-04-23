# How to Set Up Vault Integration with Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Vault, HashiCorp, Secrets Management, Security

Description: Integrate HashiCorp Vault with Rancher for centralized secrets management, dynamic credentials, and certificate authority for all your cluster workloads.

## Introduction

HashiCorp Vault provides centralized, secure secret management with dynamic credentials, encryption as a service, and comprehensive audit logging. Integrating Vault with Rancher enables your Kubernetes workloads to retrieve secrets without storing them in Git or Kubernetes secrets objects. This guide covers deploying Vault on Rancher and configuring applications to use it.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- kubectl with cluster-admin access
- Basic Vault knowledge

## Step 1: Deploy Vault on Kubernetes

```bash
# Add HashiCorp Helm repository

helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update
```

```yaml
# vault-values.yaml - Example HA Vault configuration
server:
  affinity: |
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app.kubernetes.io/name: vault
              component: server
          topologyKey: kubernetes.io/hostname

  ha:
    enabled: true
    replicas: 3
    raft:
      enabled: true
      config: |
        ui = true
        listener "tcp" {
          tls_disable = 1
          address = "[::]:8200"
          cluster_address = "[::]:8201"
        }
        storage "raft" {
          path = "/vault/data"
          retry_join {
            leader_api_addr = "http://vault-0.vault-internal:8200"
          }
          retry_join {
            leader_api_addr = "http://vault-1.vault-internal:8200"
          }
          retry_join {
            leader_api_addr = "http://vault-2.vault-internal:8200"
          }
        }
        service_registration "kubernetes" {}

  dataStorage:
    enabled: true
    size: 10Gi
    storageClass: standard

  resources:
    requests:
      memory: 256Mi
      cpu: 250m
    limits:
      memory: 512Mi

ui:
  enabled: true
  serviceType: ClusterIP

injector:
  enabled: true
  replicas: 2
```

```bash
# Deploy Vault
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --values vault-values.yaml

# Initialize Vault (run only once)
kubectl exec -n vault vault-0 -- vault operator init \
  -key-shares=5 \
  -key-threshold=3 \
  -format=json > vault-init-keys.json

# Unseal all Vault pods (requires 3 of 5 keys per pod)
for POD in vault-0 vault-1 vault-2; do
  for i in 0 1 2; do
    KEY=$(jq -r ".unseal_keys_b64[$i]" vault-init-keys.json)
    kubectl exec -n vault $POD -- vault operator unseal "$KEY"
  done
done
```

## Step 2: Configure Kubernetes Authentication

```bash
# Set the root token (save securely)
VAULT_ROOT_TOKEN=$(cat vault-init-keys.json | jq -r '.root_token')

# Configure Kubernetes auth method
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault auth enable kubernetes

# Configure the Kubernetes auth backend using Vault's in-cluster service account
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN sh -c \
  'vault write auth/kubernetes/config \
    kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT"'
```

## Step 3: Create Policies and Roles

```bash
# Create a policy for application secrets
kubectl exec -i -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault policy write production-app - << 'EOF'
path "secret/data/production/*" {
  capabilities = ["read", "list"]
}
path "database/creds/app-role" {
  capabilities = ["read"]
}
path "pki/issue/production-cert" {
  capabilities = ["create", "update"]
}
EOF

# Create a Kubernetes auth role
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault write \
  auth/kubernetes/role/production-app \
  bound_service_account_names=app-service-account \
  bound_service_account_namespaces=production \
  token_policies=production-app \
  token_ttl=1h
```

## Step 4: Store Application Secrets

```bash
# Enable KV v2 secrets engine
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault secrets enable -path=secret kv-v2

# Store application secrets
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault kv put \
  secret/production/app-config \
  database_url="postgresql://user:pass@db.internal:5432/myapp" \
  api_key="sk-production-xxxxx" \
  jwt_secret="$(openssl rand -hex 32)"
```

## Step 5: Use Vault Agent Injector

Automatically inject secrets into pods using Vault Agent:

```yaml
# app-with-vault-injection.yaml - Application with Vault Agent sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        # Enable Vault injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "production-app"
        # Inject specific secrets as files
        vault.hashicorp.com/agent-inject-secret-config.env: "secret/data/production/app-config"
        # Template the secret content
        vault.hashicorp.com/agent-inject-template-config.env: |
          {{- with secret "secret/data/production/app-config" -}}
          export DATABASE_URL="{{ .Data.data.database_url }}"
          export API_KEY="{{ .Data.data.api_key }}"
          export JWT_SECRET="{{ .Data.data.jwt_secret }}"
          {{- end }}
    spec:
      serviceAccountName: app-service-account
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.0
          command:
            - /bin/sh
            - -c
            # Source the injected environment file
            - ". /vault/secrets/config.env && exec ./app"
```

## Step 6: Configure Dynamic Database Credentials

```bash
# Enable database secrets engine
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault secrets enable database

# Configure PostgreSQL connection
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault write \
  database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgresql.databases.svc.cluster.local:5432/myapp?sslmode=disable" \
  username="vault-admin" \
  password="VaultAdminP@ss"

# Create dynamic credential role
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault write \
  database/roles/app-role \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

```yaml
# dynamic-db-annotation.yaml - Get dynamic DB credentials via Vault
metadata:
  annotations:
    vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/app-role"
    vault.hashicorp.com/agent-inject-template-db-creds: |
      {{- with secret "database/creds/app-role" -}}
      export DB_USER="{{ .Data.username }}"
      export DB_PASSWORD="{{ .Data.password }}"
      {{- end }}
```

## Step 7: Configure Vault as Certificate Authority

```bash
# Enable PKI secrets engine
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault secrets enable pki
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault secrets tune -max-lease-ttl=87600h pki

# Generate internal root CA
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault write -field=certificate \
  pki/root/generate/internal \
  common_name="Rancher Internal CA" \
  ttl=87600h > internal-ca.crt

# Create PKI role
kubectl exec -n vault vault-0 -- env VAULT_TOKEN=$VAULT_ROOT_TOKEN vault write \
  pki/roles/production-cert \
  allowed_domains="production.svc.cluster.local,example.com" \
  allow_subdomains=true \
  max_ttl=72h
```

## Conclusion

HashiCorp Vault provides enterprise-grade secrets management for Rancher environments. The Vault Agent Injector enables transparent secret injection into pods without application code changes. Dynamic credentials (for databases, cloud providers) eliminate long-lived credentials, dramatically reducing the blast radius of a compromise. For production deployments, run Vault in HA Raft mode with auto-unseal (AWS KMS, GCP KMS) to avoid manual unsealing after restarts.
