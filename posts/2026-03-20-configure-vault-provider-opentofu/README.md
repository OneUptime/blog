# How to Configure Vault Provider with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Provider, Automation, DevOps

Description: Learn how to configure and use the Vault provider in OpenTofu to manage Vault resources as code.

## Introduction

The Vault provider for OpenTofu enables managing Vault resources with the same plan/apply workflow as your cloud infrastructure. This guide covers authentication, basic resource configuration, and production best practices.

## Provider Installation

```hcl
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.6.0"
}
```

## Authentication

The Vault provider reads connection details from environment variables:

```bash
# Set Vault connection details via environment variables

export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="s.your-vault-token"
```

```hcl
provider "vault" {
  # address and token are read from VAULT_ADDR and VAULT_TOKEN
  # address = var.vault_address  # Alternative: inline (not recommended for token)
}
```

## Example Resource

```hcl
# Enable a KV v2 secrets engine and write a secret
resource "vault_mount" "kv" {
  path        = "${var.name}-${var.environment}"
  type        = "kv"
  options     = { version = "2" }
  description = "KV v2 store managed by OpenTofu"
}

resource "vault_kv_secret_v2" "example" {
  mount = vault_mount.kv.path
  name  = "app/config"

  data_json = jsonencode({
    environment = var.environment
    managed_by  = "opentofu"
  })
}
```

## Variables

```hcl
variable "name"        { type = string }
variable "environment" { type = string }
```

## Outputs

```hcl
output "mount_path" { value = vault_mount.kv.path }
```

## Best Practices

- Store API keys in environment variables or a secrets manager-never in .tf files
- Pin provider versions in `required_providers` to prevent unexpected updates
- Commit the `.terraform.lock.hcl` file to lock exact provider versions
- Use separate provider configurations per environment using aliases or workspaces

## Conclusion

Managing Vault resources with OpenTofu brings the same consistency and auditability to SaaS tooling as you get with cloud infrastructure. Start by codifying your most critical resources and gradually expand coverage over time.
