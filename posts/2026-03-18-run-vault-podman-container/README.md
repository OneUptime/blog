# How to Run Vault in a Podman Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Vault, Secrets Management, Security, HashiCorp

Description: Learn how to run HashiCorp Vault in a Podman container for secrets management with persistent storage, policies, and secret engines.

---

> Vault in Podman provides a centralized secrets management platform in a secure, rootless container with full API access.

HashiCorp Vault is the industry standard for secrets management, providing a unified interface to manage access to tokens, passwords, certificates, and encryption keys. Running Vault in a Podman container gives you an isolated, portable secrets manager that is easy to set up for development and testing. This guide covers running Vault in dev mode, production-like file storage, secret engines, and policy management.

---

## Pulling the Vault Image

Download the official Vault image.

```bash
# Pull the latest Vault image

podman pull docker.io/hashicorp/vault:latest

# Verify the image
podman images | grep vault
```

## Running Vault in Dev Mode

Start Vault in development mode for quick testing.

```bash
# Run Vault in dev mode with a known root token
podman run -d \
  --name vault-dev \
  -p 8200:8200 \
  -e VAULT_DEV_ROOT_TOKEN_ID=my-root-token \
  -e VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200 \
  -e VAULT_ADDR=http://127.0.0.1:8200 \
  --cap-add IPC_LOCK \
  docker.io/hashicorp/vault:latest

# Check the container is running
podman ps

# Verify Vault is running
export VAULT_ADDR='http://localhost:8200'
curl -s http://localhost:8200/v1/sys/health | python3 -m json.tool
```

## Working with Secrets

Store and retrieve secrets using the KV secrets engine.

```bash
# Set the Vault address and token
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='my-root-token'

# Write a secret using the API
curl -s -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"data": {"username": "admin", "password": "s3cret123"}}' \
  $VAULT_ADDR/v1/secret/data/myapp/database | python3 -m json.tool

# Read the secret back
curl -s -H "X-Vault-Token: $VAULT_TOKEN" \
  $VAULT_ADDR/v1/secret/data/myapp/database | python3 -m json.tool

# List all secrets at a path
curl -s -X LIST -H "X-Vault-Token: $VAULT_TOKEN" \
  $VAULT_ADDR/v1/secret/metadata/myapp | python3 -m json.tool

# Delete a secret
curl -s -X DELETE -H "X-Vault-Token: $VAULT_TOKEN" \
  $VAULT_ADDR/v1/secret/data/myapp/database
```

## Using the Vault CLI Inside the Container

Run Vault commands directly inside the container.

```bash
# Store a secret using the CLI
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault kv put -mount=secret myapp/api key=abc123 endpoint=https://api.example.com

# Read the secret
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault kv get -mount=secret myapp/api

# List secrets
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault kv list -mount=secret myapp

# Check Vault status
podman exec vault-dev vault status
```

## Running Vault with File Storage

Set up Vault with file-based storage for data persistence.

```bash
# Create directories for Vault data and config
mkdir -p ~/vault-config
podman volume create vault-data

# Write a Vault server configuration
cat > ~/vault-config/vault.hcl <<'EOF'
# Storage backend using local files
storage "file" {
  path = "/vault/data"
}

# Listener configuration
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1
}

# Disable mlock for container environments
disable_mlock = true

# API address
api_addr = "http://127.0.0.1:8201"

# UI
ui = true
EOF

# Run Vault with file storage
podman run -d \
  --name vault-server \
  -p 8201:8200 \
  --cap-add IPC_LOCK \
  -v ~/vault-config/vault.hcl:/vault/config/vault.hcl:Z \
  -v vault-data:/vault/data:Z \
  docker.io/hashicorp/vault:latest server

# Initialize and unseal Vault (only needed once)
sleep 3
export VAULT_ADDR='http://localhost:8201'
curl -s -X POST $VAULT_ADDR/v1/sys/init \
  -d '{"secret_shares": 1, "secret_threshold": 1}' | tee ~/vault-init.json | python3 -m json.tool

VAULT_UNSEAL_KEY=$(python3 -c 'import json, pathlib; print(json.loads(pathlib.Path.home().joinpath("vault-init.json").read_text())["keys_base64"][0])')
curl -s -X POST $VAULT_ADDR/v1/sys/unseal \
  -d "{\"key\": \"$VAULT_UNSEAL_KEY\"}" | python3 -m json.tool
```

## Creating Vault Policies

Define access control policies for different roles.

```bash
# Create a read-only policy for the myapp path
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault policy write myapp-readonly - <<'EOF'
# Allow reading secrets under myapp/
path "secret/data/myapp/*" {
  capabilities = ["read"]
}

# Allow listing secret names under myapp/
path "secret/metadata/myapp" {
  capabilities = ["list"]
}

path "secret/metadata/myapp/*" {
  capabilities = ["list"]
}
EOF

# Create a token with the policy attached
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault token create -policy=myapp-readonly -ttl=1h

# List all policies
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault policy list
```

## Enabling Secret Engines

Enable additional secret engines for different use cases.

```bash
# Enable the TOTP secrets engine for one-time passwords
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault secrets enable totp

# Enable the Transit secrets engine for encryption as a service
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault secrets enable transit

# Create an encryption key
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault write -f transit/keys/my-encryption-key

# Encrypt data using the transit engine
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault write transit/encrypt/my-encryption-key plaintext=$(printf "secret data" | base64)

# List all secret engines
podman exec -e VAULT_TOKEN=my-root-token vault-dev \
  vault secrets list
```

## Managing the Container

Common management operations.

```bash
# View Vault logs
podman logs vault-dev

# Seal Vault (locks all access until unsealed)
podman exec -e VAULT_TOKEN=my-root-token vault-dev vault operator seal

# Stop and start
podman stop vault-dev
podman start vault-dev

# Remove containers and volumes
podman rm -f vault-dev vault-server
podman volume rm vault-data
```

## Summary

Running Vault in a Podman container provides a centralized secrets management platform with flexible storage backends and comprehensive access control. Dev mode gives you instant access for testing, while file-based storage provides persistence for more permanent setups. The KV secrets engine handles static secrets, Transit provides encryption as a service, and policies control exactly who can access what. Podman's rootless execution complements Vault's security model, keeping your secrets management infrastructure well-isolated.
