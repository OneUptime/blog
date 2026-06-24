# How to Integrate HashiCorp Vault with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HashiCorp Vault, Secret, Security, DevOps

Description: Integrate HashiCorp Vault with Portainer to provide dynamic secrets and centralized secrets management for containerized workloads.

## Introduction

HashiCorp Vault is an enterprise-grade secrets management platform that provides dynamic secrets, secret versioning, and fine-grained access control. Integrating Vault with Portainer allows containers to retrieve centrally managed secrets through Vault Agent instead of baking credentials into images or stack files.

## Prerequisites

- Portainer managing Docker or Kubernetes environments
- HashiCorp Vault instance (or deploy via Portainer)
- Docker or Kubernetes workloads needing secrets

## Part 1: Deploy Vault via Portainer

```yaml
# vault-stack.yml - deploy as Portainer stack

version: '3.8'

services:
  vault:
    image: hashicorp/vault:1.15
    container_name: vault
    restart: unless-stopped
    ports:
      - "8200:8200"
    environment:
      VAULT_ADDR: http://127.0.0.1:8200
    volumes:
      - vault-data:/vault/data
      - /opt/vault/config.hcl:/vault/config/config.hcl:ro
      - vault-logs:/vault/logs
    command: vault server -config=/vault/config/config.hcl
    cap_add:
      - IPC_LOCK  # Prevent secrets from being swapped to disk

volumes:
  vault-data:
  vault-logs:
```

```hcl
# vault-config.hcl - store this on the Docker host, for example at /opt/vault/config.hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address = "0.0.0.0:8200"
  tls_disable = 1  # Enable TLS in production!
}

ui = true
```

## Part 2: Initialize and Unseal Vault

```bash
# Initialize Vault
docker exec -e VAULT_ADDR=http://localhost:8200 vault \
  vault operator init -key-shares=5 -key-threshold=3

# Save the unseal keys and initial root token securely!
# Output:
# Unseal Key 1: xxx
# Unseal Key 2: xxx
# ...
# Initial Root Token: hvs.xxx

# Unseal Vault (repeat 3 times with different keys)
docker exec -e VAULT_ADDR=http://localhost:8200 vault \
  vault operator unseal <UNSEAL_KEY_1>
docker exec -e VAULT_ADDR=http://localhost:8200 vault \
  vault operator unseal <UNSEAL_KEY_2>
docker exec -e VAULT_ADDR=http://localhost:8200 vault \
  vault operator unseal <UNSEAL_KEY_3>

# Login with root token
export VAULT_ADDR=http://vault-host:8200
export VAULT_TOKEN=hvs.YOUR_ROOT_TOKEN
vault status
```

## Part 3: Configure Vault for Container Secrets

```bash
# Enable KV secrets engine
vault secrets enable -path=portainer kv-v2

# Store secrets
vault kv put portainer/myapp \
  db_password="SecurePassword123!" \
  api_key="api-key-value" \
  jwt_secret="jwt-secret-value"

# Read secrets
vault kv get portainer/myapp

# Enable AppRole authentication for services
vault auth enable approle

# Create a policy for myapp
vault policy write myapp-policy - << 'EOF'
path "portainer/data/myapp" {
  capabilities = ["read"]
}
path "portainer/data/shared/*" {
  capabilities = ["read"]
}
EOF

# Create an AppRole for myapp
vault write auth/approle/role/myapp \
  token_policies="myapp-policy" \
  token_ttl=1h \
  token_max_ttl=4h

# Get Role ID and Secret ID
ROLE_ID=$(vault read -field=role_id auth/approle/role/myapp/role-id)
SECRET_ID=$(vault write -force -field=secret_id auth/approle/role/myapp/secret-id)

echo "Role ID: $ROLE_ID"
echo "Secret ID: $SECRET_ID"
```

## Part 4: Using Vault Agent in Containers

```yaml
# app-with-vault-stack.yml
version: '3.8'

services:
  vault-agent:
    image: hashicorp/vault:1.15
    restart: unless-stopped
    volumes:
      - /opt/vault-agent:/vault/config:ro  # agent.hcl, role_id, and secret_id live here
      - app-secrets:/vault/secrets  # Shared with app container
    command: vault agent -config=/vault/config/agent.hcl
    
  app:
    image: myapp:latest
    restart: unless-stopped
    depends_on:
      - vault-agent
    volumes:
      - app-secrets:/run/secrets  # Read secrets from here
    environment:
      DB_PASSWORD_FILE: /run/secrets/db_password
      API_KEY_FILE: /run/secrets/api_key

volumes:
  app-secrets:
```

```hcl
# vault-agent config (agent.hcl)
vault {
  address = "http://vault-host:8200"
}

auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/vault/config/role_id"
      secret_id_file_path = "/vault/config/secret_id"
      remove_secret_id_file_after_reading = false
    }
  }
  sink "file" {
    config = {
      path = "/vault/secrets/.vault_token"
    }
  }
}

template {
  contents    = "{{- with secret \"portainer/data/myapp\" -}}{{ .Data.data.db_password }}{{- end }}"
  destination = "/vault/secrets/db_password"
  perms       = 0640
}

template {
  contents    = "{{- with secret \"portainer/data/myapp\" -}}{{ .Data.data.api_key }}{{- end }}"
  destination = "/vault/secrets/api_key"
  perms       = 0640
}
```

## Part 5: Kubernetes Integration (Vault Injector)

```bash
# Install Vault Helm chart on Kubernetes and enable the injector
helm repo add hashicorp https://helm.releases.hashicorp.com
helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set "injector.enabled=true"

# Initialize and unseal the in-cluster Vault instance
kubectl exec -n vault vault-0 -- vault operator init -key-shares=5 -key-threshold=3
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_1>
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_2>
kubectl exec -n vault vault-0 -- vault operator unseal <UNSEAL_KEY_3>

# Enable Kubernetes auth
kubectl exec -n vault vault-0 -- sh -c \
  'export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=hvs.YOUR_ROOT_TOKEN && vault auth enable kubernetes'

# Repeat Part 3 against this Vault instance, then configure Kubernetes auth
kubectl exec -n vault vault-0 -- sh -c \
  'export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=hvs.YOUR_ROOT_TOKEN && vault write auth/kubernetes/config kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT"'

# Create a Vault role bound to the workload service account
kubectl exec -n vault vault-0 -- sh -c \
  'export VAULT_ADDR=http://127.0.0.1:8200 VAULT_TOKEN=hvs.YOUR_ROOT_TOKEN && vault write auth/kubernetes/role/myapp bound_service_account_names=myapp bound_service_account_namespaces=default policies=myapp-policy ttl=1h'
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-config.txt: "portainer/data/myapp"
        vault.hashicorp.com/agent-inject-template-config.txt: |
          {{- with secret "portainer/data/myapp" -}}
          db_password={{ .Data.data.db_password }}
          api_key={{ .Data.data.api_key }}
          {{- end }}
    spec:
      serviceAccountName: myapp
      containers:
        - name: app
          image: myapp:latest
```

## Conclusion

HashiCorp Vault integration with Portainer provides centralized secrets management, secret versioning, and fine-grained access control. Vault Agent handles authentication and secret rendering automatically, and it can refresh rendered files when the underlying secrets change. For Kubernetes deployments, the Vault Injector adds Vault Agent to pod specs through annotations on the workload template.
