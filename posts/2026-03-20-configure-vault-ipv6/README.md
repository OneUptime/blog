# How to Configure Vault with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Vault, HashiCorp, Secrets Management, Security

Description: Learn how to configure HashiCorp Vault to listen on IPv6 addresses for API access, cluster communication, and HA replication, enabling IPv6-native secrets management.

## Vault Server Configuration

```hcl
# /etc/vault.d/vault.hcl

# TCP listener on IPv6 address

listener "tcp" {
  address         = "[2001:db8::10]:8200"
  tls_disable     = false
  tls_cert_file   = "/etc/vault.d/certs/vault.crt"
  tls_key_file    = "/etc/vault.d/certs/vault.key"
}

# Storage backend (Raft integrated storage)
storage "raft" {
  path    = "/var/lib/vault/data"
  node_id = "vault-node-1"

  retry_join {
    leader_api_addr = "https://[2001:db8::10]:8200"
  }
  retry_join {
    leader_api_addr = "https://[2001:db8::11]:8200"
  }
  retry_join {
    leader_api_addr = "https://[2001:db8::12]:8200"
  }
}

# API address (advertised to clients)
api_addr     = "https://[2001:db8::10]:8200"

# Cluster address (for HA peer communication)
cluster_addr = "https://[2001:db8::10]:8201"
```

## Listen on All Interfaces

```hcl
# Listen on all IPv6 and IPv4 interfaces
# A single listener serves both API traffic (address) and
# cluster server-to-server traffic (cluster_address)
listener "tcp" {
  address         = "[::]:8200"
  cluster_address = "[::]:8201"
  tls_disable     = 1  # Development only
}
```

## Development Mode with IPv6

```bash
# Start Vault in dev mode on IPv6
vault server -dev -dev-listen-address="[2001:db8::10]:8200"

# Export VAULT_ADDR for CLI
export VAULT_ADDR="http://[2001:db8::10]:8200"

# Check status
vault status
```

## Vault CLI with IPv6

```bash
# Set Vault address
export VAULT_ADDR="https://[2001:db8::10]:8200"
export VAULT_TOKEN="your-root-token"

# Initialize Vault
vault operator init

# Unseal Vault
vault operator unseal

# Check status
vault status

# Write a secret
vault kv put secret/myapp/config db_host="2001:db8::30" db_port="5432"

# Read a secret
vault kv get secret/myapp/config

# List secrets
vault kv list secret/myapp/
```

## Test Vault API over IPv6

```bash
# Check Vault health
curl -6 https://[2001:db8::10]:8200/v1/sys/health \
    --cacert /etc/vault.d/certs/ca.crt

# With TLS verification disabled (development only)
curl -6 -k https://[2001:db8::10]:8200/v1/sys/health

# Authenticate and get token
curl -6 -k -X POST https://[2001:db8::10]:8200/v1/auth/userpass/login/myuser \
    -d '{"password": "mypassword"}'
```

## Python hvac Client over IPv6

```python
import hvac

# Connect to Vault via IPv6
client = hvac.Client(
    url='https://[2001:db8::10]:8200',
    token='your-vault-token',
    verify='/etc/vault.d/certs/ca.crt'
)

# Check authentication
print(f"Authenticated: {client.is_authenticated()}")

# Write a secret (KV v2)
client.secrets.kv.v2.create_or_update_secret(
    path='myapp/database',
    secret={'host': '2001:db8::30', 'port': '5432'},
    mount_point='secret'
)

# Read a secret
read_response = client.secrets.kv.v2.read_secret_version(
    path='myapp/database',
    mount_point='secret'
)
secret_data = read_response['data']['data']
print(f"DB Host: {secret_data['host']}")
```

## Summary

Configure Vault for IPv6 by setting `address = "[2001:db8::10]:8200"` in the TCP listener block. Set `api_addr = "https://[2001:db8::10]:8200"` for client advertisement and `cluster_addr = "https://[2001:db8::10]:8201"` for HA replication. For Raft storage, list all nodes in `retry_join` blocks with IPv6 addresses. Export `VAULT_ADDR="https://[2001:db8::10]:8200"` for CLI usage. Test with `curl -6 https://[2001:db8::10]:8200/v1/sys/health`.
