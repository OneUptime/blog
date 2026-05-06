# How to Configure the Consul Backend in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Consul, State Management

Description: Learn how to configure the OpenTofu Consul backend to store state in HashiCorp Consul's key-value store with native locking and ACL-based access control.

## Introduction

The Consul backend stores OpenTofu state in HashiCorp Consul's key-value (KV) store. It provides native state locking via Consul sessions, supports ACL-based access control, and is well-suited for teams already using Consul for service discovery and configuration management.

## Prerequisites

- Consul cluster running
- Consul ACL token with appropriate permissions (if ACLs enabled)
- Network access from OpenTofu to the Consul HTTP API

## Basic Configuration

```hcl
# backend.tf

terraform {
  backend "consul" {
    address = "consul.example.com:8500"  # Consul HTTP API address
    scheme  = "https"                    # Use HTTPS for production
    path    = "opentofu/states/prod"     # KV path for state storage
  }
}
```

## Authentication with ACL Tokens

If Consul has ACLs enabled:

```hcl
terraform {
  backend "consul" {
    address = "consul.example.com:8500"
    scheme  = "https"
    path    = "opentofu/states/prod"

    # ACL token for authentication
    access_token = var.consul_token

    # Or set CONSUL_HTTP_TOKEN environment variable
  }
}
```

```bash
# Set token via environment variable
export CONSUL_HTTP_TOKEN="your-consul-acl-token"
export CONSUL_HTTP_ADDR="https://consul.example.com:8500"
```

## Creating a Consul ACL Policy

```hcl
# Minimal policy for OpenTofu state management
resource "consul_acl_policy" "opentofu_state" {
  name  = "opentofu-state"
  rules = <<EOF
key_prefix "opentofu/states/" {
  policy = "write"
}

session_prefix "" {
  policy = "write"
}
EOF
}

resource "consul_acl_token" "opentofu_state" {
  description = "OpenTofu state management token"
  policies    = [consul_acl_policy.opentofu_state.name]
  local       = false  # Global token
}

# If you need to retrieve the SecretID in OpenTofu, use the dedicated data source.
# Note: this writes the secret into state unless you also configure pgp_key.
data "consul_acl_token_secret_id" "opentofu_state" {
  accessor_id = consul_acl_token.opentofu_state.id
}

output "opentofu_state_token" {
  value     = data.consul_acl_token_secret_id.opentofu_state.secret_id
  sensitive = true
}
```

## Organizing State Files

Use a consistent path structure in Consul KV:

```hcl
# Production state
path = "opentofu/states/production/networking"

# Staging state
path = "opentofu/states/staging/networking"

# Per-team organization
path = "opentofu/states/platform-team/eks-cluster"
```

## TLS/mTLS Configuration

For secure Consul communication:

```hcl
terraform {
  backend "consul" {
    address    = "consul.example.com:8501"  # HTTPS port
    scheme     = "https"
    path       = "opentofu/states/prod"

    # CA certificate for verification
    ca_file    = "/etc/consul/certs/ca.pem"

    # Client certificate for mTLS
    cert_file  = "/etc/consul/certs/client.pem"
    key_file   = "/etc/consul/certs/client-key.pem"
  }
}
```

## State Locking with Consul Sessions

Consul locking uses Consul sessions. When OpenTofu acquires a lock:

1. Creates a Consul session with a TTL
2. Acquires a lock on `$path/.lock` using the session
3. Renews the session during long operations
4. Releases the lock, removes lock metadata from `$path/.lockinfo`, and destroys the session on completion

```bash
# Check for active locks
consul kv get "opentofu/states/prod/.lock"

# View lock metadata
consul kv get "opentofu/states/prod/.lockinfo"

# List all state keys under a prefix
consul kv get -keys -separator="" "opentofu/states/"

# Force-unlock a stuck state lock using the lock ID reported by OpenTofu
tofu force-unlock <LOCK_ID>
```

## Workspace Support

Consul backend supports workspaces:

```hcl
terraform {
  backend "consul" {
    address = "consul.example.com:8500"
    path    = "opentofu/states/app"
  }
}
```

```bash
# Create workspace
tofu workspace new production

# States stored at:
# opentofu/states/app                 ← default workspace
# opentofu/states/app-env:production  ← production workspace
```

## Environment Variables

Common connection and TLS settings can be set via Consul environment variables:

```bash
export CONSUL_HTTP_ADDR="https://consul.example.com:8500"
export CONSUL_HTTP_TOKEN="your-token"
export CONSUL_TLS_SERVER_NAME="consul.example.com"
export CONSUL_CACERT="/etc/consul/certs/ca.pem"
export CONSUL_CLIENT_CERT="/etc/consul/certs/client.pem"
export CONSUL_CLIENT_KEY="/etc/consul/certs/client-key.pem"
```

## Monitoring State Operations

If you're using Consul Enterprise with ACLs enabled, enable audit logging to track state operations:

```hcl
# In Consul configuration
audit {
  enabled = true
  sink "file" {
    type               = "file"
    format             = "json"
    path               = "/var/log/consul/audit.json"
    delivery_guarantee = "best-effort"
    rotate_duration    = "24h"
    rotate_max_files   = 15
    rotate_bytes       = 25165824
  }
}
```

## Conclusion

The Consul backend is an excellent choice for organizations already invested in the HashiCorp ecosystem. It provides native locking, ACL-based access control, and integrates naturally with Consul's KV store. Use a well-structured path convention and create dedicated ACL policies for OpenTofu state management to maintain clean separation between infrastructure components.
