# How to Install and Configure HashiCorp Vault on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Vault, HashiCorp, Secrets, Security, Tutorial

Description: Complete guide to installing HashiCorp Vault on Ubuntu for secure secrets management and encryption as a service.

---

HashiCorp Vault is a tool for securely storing and accessing secrets such as API keys, passwords, certificates, and encryption keys. It provides a unified interface to secrets while maintaining tight access control. This guide covers Vault installation and configuration on Ubuntu.

## Features

- Centralized secrets management
- Dynamic secrets generation
- Data encryption
- Leasing and renewal
- Audit logging
- Identity-based access

## Prerequisites

- Ubuntu 20.04 or later
- At least 2GB RAM
- Root or sudo access

## Installation

### Add HashiCorp Repository

```bash
# Install prerequisites
sudo apt update
sudo apt install -y curl gnupg software-properties-common

# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install Vault
sudo apt update
sudo apt install vault -y

# Verify installation
vault version
```

## Development Mode (Quick Start)

```bash
# Start in development mode (NOT for production!)
vault server -dev

# In another terminal, set environment
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='hvs.xxxxxxxxxxxxx'  # Use root token from dev server output

# Check status
vault status
```

## Production Configuration

### Create Configuration File

```bash
sudo mkdir -p /etc/vault.d
sudo nano /etc/vault.d/vault.hcl
```

```hcl
# Vault configuration

# Storage backend (file-based for single node)
storage "file" {
  path = "/opt/vault/data"
}

# Or use Consul for HA
# storage "consul" {
#   address = "127.0.0.1:8500"
#   path    = "vault/"
# }

# Listener configuration
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_disable   = "false"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

# API address
api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault.example.com:8201"

# UI
ui = true

# Logging
log_level = "info"

# Telemetry
telemetry {
  disable_hostname = true
  prometheus_retention_time = "24h"
}
```

### Create Directories

```bash
# Create data and TLS directories
sudo mkdir -p /opt/vault/data
sudo mkdir -p /opt/vault/tls

# Set ownership
sudo chown -R vault:vault /opt/vault
```

### Generate TLS Certificates

```bash
# Generate self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /opt/vault/tls/vault.key \
  -out /opt/vault/tls/vault.crt \
  -subj "/CN=vault.example.com"

sudo chown vault:vault /opt/vault/tls/*
sudo chmod 600 /opt/vault/tls/vault.key
```

### Create Systemd Service

```bash
sudo nano /etc/systemd/system/vault.service
```

```ini
[Unit]
Description=HashiCorp Vault
Documentation=https://www.vaultproject.io/docs/
Requires=network-online.target
After=network-online.target
ConditionFileNotEmpty=/etc/vault.d/vault.hcl

[Service]
User=vault
Group=vault
ProtectSystem=full
ProtectHome=read-only
PrivateTmp=yes
PrivateDevices=yes
SecureBits=keep-caps
AmbientCapabilities=CAP_IPC_LOCK
CapabilityBoundingSet=CAP_SYSLOG CAP_IPC_LOCK
NoNewPrivileges=yes
ExecStart=/usr/bin/vault server -config=/etc/vault.d/vault.hcl
ExecReload=/bin/kill --signal HUP $MAINPID
KillMode=process
KillSignal=SIGINT
Restart=on-failure
RestartSec=5
TimeoutStopSec=30
LimitNOFILE=65536
LimitMEMLOCK=infinity

[Install]
WantedBy=multi-user.target
```

### Start Vault

```bash
# Start and enable service
sudo systemctl daemon-reload
sudo systemctl start vault
sudo systemctl enable vault

# Check status
sudo systemctl status vault
```

## Initialize Vault

```bash
# Set environment
export VAULT_ADDR='https://vault.example.com:8200'
export VAULT_SKIP_VERIFY=true  # For self-signed certs

# Initialize Vault
vault operator init

# Save the unseal keys and root token securely!
# Output shows 5 unseal keys and 1 root token
```

## Unseal Vault

Vault starts in sealed state and requires unsealing:

```bash
# Unseal with 3 of 5 keys (default threshold)
vault operator unseal <unseal-key-1>
vault operator unseal <unseal-key-2>
vault operator unseal <unseal-key-3>

# Check seal status
vault status
```

## Authenticate

```bash
# Login with root token
vault login <root-token>

# Or
export VAULT_TOKEN='<root-token>'
```

## Secrets Management

### KV Secrets Engine

```bash
# Enable KV secrets engine v2
vault secrets enable -path=secret kv-v2

# Write secret
vault kv put secret/myapp username="admin" password="secretpass"

# Read secret
vault kv get secret/myapp

# Get specific field
vault kv get -field=password secret/myapp

# List secrets
vault kv list secret/

# Delete secret
vault kv delete secret/myapp

# Destroy all versions
vault kv destroy -versions=all secret/myapp
```

### Dynamic Secrets (Database)

```bash
# Enable database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/mydb \
    plugin_name=postgresql-database-plugin \
    allowed_roles="myapp-role" \
    connection_url="postgresql://{{username}}:{{password}}@localhost:5432/mydb" \
    username="vault" \
    password="vaultpass"

# Create role
vault write database/roles/myapp-role \
    db_name=mydb \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Generate credentials
vault read database/creds/myapp-role
```

## Access Control (Policies)

### Create Policy

```bash
# Create policy file
cat > myapp-policy.hcl << EOF
# Read secrets
path "secret/data/myapp/*" {
  capabilities = ["read", "list"]
}

# No access to root token
path "auth/token/root" {
  capabilities = ["deny"]
}
EOF

# Upload policy
vault policy write myapp myapp-policy.hcl

# List policies
vault policy list

# Read policy
vault policy read myapp
```

## Authentication Methods

### UserPass Authentication

```bash
# Enable userpass auth
vault auth enable userpass

# Create user
vault write auth/userpass/users/john \
    password="secret123" \
    policies="myapp"

# Login as user
vault login -method=userpass username=john password=secret123
```

### AppRole Authentication

```bash
# Enable AppRole
vault auth enable approle

# Create role
vault write auth/approle/role/myapp \
    token_policies="myapp" \
    token_ttl=1h \
    token_max_ttl=4h

# Get role ID
vault read auth/approle/role/myapp/role-id

# Generate secret ID
vault write -f auth/approle/role/myapp/secret-id

# Login with AppRole
vault write auth/approle/login \
    role_id="<role-id>" \
    secret_id="<secret-id>"
```

### Kubernetes Authentication

```bash
# Enable Kubernetes auth
vault auth enable kubernetes

# Configure with Kubernetes
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create role
vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp \
    bound_service_account_namespaces=default \
    policies=myapp \
    ttl=1h
```

## Transit Secrets Engine (Encryption)

```bash
# Enable transit engine
vault secrets enable transit

# Create encryption key
vault write -f transit/keys/myapp-key

# Encrypt data
vault write transit/encrypt/myapp-key plaintext=$(base64 <<< "secret data")

# Decrypt data
vault write transit/decrypt/myapp-key ciphertext="vault:v1:..."

# Rotate key
vault write -f transit/keys/myapp-key/rotate
```

## PKI (Certificate Authority)

```bash
# Enable PKI engine
vault secrets enable pki

# Configure max TTL
vault secrets tune -max-lease-ttl=87600h pki

# Generate root CA
vault write pki/root/generate/internal \
    common_name="My Root CA" \
    ttl=87600h

# Configure URLs
vault write pki/config/urls \
    issuing_certificates="https://vault.example.com:8200/v1/pki/ca" \
    crl_distribution_points="https://vault.example.com:8200/v1/pki/crl"

# Create role
vault write pki/roles/server-cert \
    allowed_domains="example.com" \
    allow_subdomains=true \
    max_ttl=72h

# Issue certificate
vault write pki/issue/server-cert \
    common_name="web.example.com" \
    ttl=24h
```

## Audit Logging

```bash
# Enable file audit
vault audit enable file file_path=/var/log/vault/audit.log

# Enable syslog audit
vault audit enable syslog

# List audit devices
vault audit list
```

## High Availability Setup

For production, use Consul or Raft storage:

### Raft Storage (Integrated)

```hcl
# /etc/vault.d/vault.hcl
storage "raft" {
  path    = "/opt/vault/data"
  node_id = "vault-1"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/opt/vault/tls/vault.crt"
  tls_key_file  = "/opt/vault/tls/vault.key"
}

cluster_addr = "https://vault-1.example.com:8201"
api_addr = "https://vault-1.example.com:8200"

# Auto unseal with AWS KMS
seal "awskms" {
  region     = "us-east-1"
  kms_key_id = "alias/vault-unseal"
}
```

### Join Cluster

```bash
# On additional nodes
vault operator raft join https://vault-1.example.com:8200
```

## Monitoring

```bash
# Enable Prometheus metrics
# Add to vault.hcl:
telemetry {
  prometheus_retention_time = "24h"
  disable_hostname = true
}

# Access metrics
curl https://vault.example.com:8200/v1/sys/metrics?format=prometheus
```

## Troubleshooting

### Check Status

```bash
# Vault status
vault status

# Check seal status
vault operator seal-status

# Check HA status
vault operator raft list-peers
```

### View Logs

```bash
# Systemd logs
sudo journalctl -u vault -f

# Audit logs
sudo tail -f /var/log/vault/audit.log
```

### Common Issues

```bash
# Permission denied
# Check policies and token permissions

# Connection refused
# Verify Vault is running and address is correct

# Sealed vault
# Unseal with required number of keys

# Certificate errors
export VAULT_SKIP_VERIFY=true  # For testing only
```

---

HashiCorp Vault provides enterprise-grade secrets management. Proper configuration of authentication, policies, and audit logging is essential for security. For comprehensive monitoring of your Vault deployment, consider integrating with OneUptime for uptime and performance tracking.
