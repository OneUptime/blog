# How to Deploy Vault (HashiCorp) via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, HashiCorp Vault, Secrets Management, Security, Self-Hosted

Description: Deploy HashiCorp Vault via Portainer as a centralized secrets management solution for storing and accessing API keys, passwords, and certificates.

## Introduction

HashiCorp Vault provides centralized secrets management with fine-grained access controls, audit logging, and dynamic secrets generation. Deploying it via Portainer gives you a self-hosted alternative to AWS Secrets Manager or Azure Key Vault.

## Deploy as a Stack

```yaml
version: "3.8"

services:
  vault:
    image: hashicorp/vault:latest
    container_name: vault
    cap_add:
      - IPC_LOCK   # Required for memory locking (prevents secrets swapping to disk)
    environment:
      VAULT_ADDR: http://127.0.0.1:8200
    volumes:
      - vault_data:/vault/data
      - vault_logs:/vault/logs
      - /opt/vault/vault-config:/vault/config:ro
    ports:
      - "8200:8200"
    command: vault server -config=/vault/config/vault.hcl
    restart: unless-stopped

volumes:
  vault_data:
  vault_logs:
```

## Vault Configuration

Create `/opt/vault/vault-config/vault.hcl` on the Docker host:

```hcl
# vault.hcl - Example single-node Vault configuration

storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1  # Enable TLS in production with a real certificate
}

# UI settings

ui = true

# API address
api_addr = "http://vault.example.com:8200"

# Default lease TTL
default_lease_ttl = "168h"
max_lease_ttl = "720h"
```

## Initialize and Unseal Vault

```bash
# Initialize Vault (do this once)
docker exec vault vault operator init \
  -key-shares=5 \
  -key-threshold=3

# IMPORTANT: Save the 5 unseal keys and root token securely!
# Example output:
# Unseal Key 1: key1value...
# Unseal Key 2: key2value...
# Initial Root Token: hvs.roottoken...

# Unseal Vault (requires 3 of 5 keys)
docker exec vault vault operator unseal key1value
docker exec vault vault operator unseal key2value
docker exec vault vault operator unseal key3value

# Verify unsealed
docker exec vault vault status
```

## Store and Retrieve Secrets

```bash
# Log in with root token
docker exec vault vault login hvs.roottoken

# Enable file audit logging
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault audit enable file file_path=/vault/logs/audit.log

# Enable KV secrets engine
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault secrets enable -path=secret kv-v2

# Store a secret
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault kv put -mount=secret myapp \
  db_password=supersecret \
  api_key=abc123def456

# Retrieve secrets
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault kv get -mount=secret myapp

# Get specific field
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault kv get -mount=secret -field=db_password myapp
```

## Application Integration

Applications can retrieve secrets via Vault's HTTP API:

```bash
# Get a secret via API
curl -H "X-Vault-Token: $VAULT_TOKEN" \
     "$VAULT_ADDR/v1/secret/data/myapp" | \
     jq '.data.data'
```

## Create Application Policies

```bash
# Create a policy for an application
cat << 'EOF' | docker exec -i -e VAULT_TOKEN=hvs.roottoken vault \
  vault policy write myapp -
path "secret/data/myapp" {
  capabilities = ["read"]
}
EOF

# Create an app token with this policy
docker exec -e VAULT_TOKEN=hvs.roottoken vault \
  vault token create -policy=myapp -ttl=24h
```

## Conclusion

HashiCorp Vault deployed via Portainer provides enterprise-grade secrets management for self-hosted environments. Centralizing secrets eliminates hardcoded credentials and provides audit logging of all access. The file backend is suitable for small single-node deployments - for production use and high availability, prefer the Raft integrated storage backend.
