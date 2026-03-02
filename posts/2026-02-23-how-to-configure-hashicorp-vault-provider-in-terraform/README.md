# How to Configure HashiCorp Vault Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, HashiCorp Vault, Secrets Management, Infrastructure as Code

Description: Learn how to configure and use the HashiCorp Vault provider in Terraform to manage secrets, policies, and authentication backends as code.

---

Managing secrets in infrastructure is one of those problems that never truly goes away. You rotate credentials, store API keys, manage certificates, and sooner or later you realize you need a proper secrets management solution. HashiCorp Vault is one of the best tools for this job, and when you combine it with Terraform, you get the ability to manage your entire secrets infrastructure as code.

In this guide, we will walk through configuring the HashiCorp Vault provider in Terraform from scratch, including authentication, resource management, and practical examples you can use in production.

## Prerequisites

Before getting started, make sure you have:

- Terraform 1.0 or later installed
- A running Vault server (dev or production)
- A valid Vault token or alternative authentication method
- Basic familiarity with Terraform syntax

## Installing and Declaring the Provider

The first step is declaring the Vault provider in your Terraform configuration. Create a `versions.tf` file to pin the provider version.

```hcl
# versions.tf - Pin the Vault provider version
terraform {
  required_version = ">= 1.0"

  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.25"
    }
  }
}
```

Next, configure the provider itself in your `main.tf` or a dedicated `provider.tf` file.

```hcl
# provider.tf - Configure the Vault provider
provider "vault" {
  # The Vault server address
  address = "https://vault.example.com:8200"

  # Token-based authentication (simplest method)
  token = var.vault_token

  # Skip TLS verification (only for dev environments)
  skip_tls_verify = false
}
```

Run `terraform init` to download the provider plugin.

```bash
# Initialize Terraform and download the Vault provider
terraform init
```

## Authentication Methods

Token-based auth is the simplest approach, but Vault supports many authentication backends. Here are the most common ways to authenticate the Terraform provider.

### Token Authentication

```hcl
# Using a variable for the token (never hardcode secrets)
variable "vault_token" {
  type      = string
  sensitive = true
}

provider "vault" {
  address = "https://vault.example.com:8200"
  token   = var.vault_token
}
```

### AppRole Authentication

AppRole is the recommended method for machine-to-machine authentication.

```hcl
# AppRole authentication with role_id and secret_id
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}
```

### AWS IAM Authentication

If you are running Terraform from an AWS environment, you can use IAM-based auth.

```hcl
# AWS IAM authentication - useful when running Terraform in AWS
provider "vault" {
  address = "https://vault.example.com:8200"

  auth_login_aws {
    role = "terraform-role"
  }
}
```

### Environment Variables

You can also configure the provider entirely through environment variables, which is useful in CI/CD pipelines.

```bash
# Set Vault address and token via environment variables
export VAULT_ADDR="https://vault.example.com:8200"
export VAULT_TOKEN="hvs.your-token-here"
export VAULT_SKIP_TLS_VERIFY="false"
```

When environment variables are set, the provider block can be minimal.

```hcl
# Provider picks up configuration from environment variables
provider "vault" {}
```

## Managing Secrets Engines

One of the most common tasks is enabling and configuring secrets engines.

```hcl
# Enable a KV v2 secrets engine at a custom path
resource "vault_mount" "kv_v2" {
  path        = "secret"
  type        = "kv-v2"
  description = "KV Version 2 secrets engine for application secrets"

  options = {
    version = "2"
  }
}

# Store a secret in the KV engine
resource "vault_kv_secret_v2" "database_creds" {
  mount = vault_mount.kv_v2.path
  name  = "database/production"

  data_json = jsonencode({
    username = "db_admin"
    password = var.db_password
  })
}
```

## Configuring Authentication Backends

You can manage Vault's auth backends through Terraform as well.

```hcl
# Enable the AppRole auth method
resource "vault_auth_backend" "approle" {
  type = "approle"
  path = "approle"
}

# Create a role for your application
resource "vault_approle_auth_backend_role" "app_role" {
  backend   = vault_auth_backend.approle.path
  role_name = "my-application"

  # Token settings
  token_ttl     = 3600
  token_max_ttl = 14400

  # Bind the role to specific CIDR blocks
  token_bound_cidrs = ["10.0.0.0/8"]

  token_policies = ["app-read-policy"]
}
```

## Writing Vault Policies

Policies control what a token can access. You can manage them directly in Terraform.

```hcl
# Create a policy that allows reading from the secret path
resource "vault_policy" "app_read" {
  name = "app-read-policy"

  policy = <<-EOT
    # Allow reading secrets under the secret/data/database path
    path "secret/data/database/*" {
      capabilities = ["read", "list"]
    }

    # Allow the app to renew its own token
    path "auth/token/renew-self" {
      capabilities = ["update"]
    }
  EOT
}
```

## Reading Secrets as Data Sources

Sometimes you need to read secrets from Vault to use in other Terraform resources.

```hcl
# Read a secret from Vault to use elsewhere in your config
data "vault_kv_secret_v2" "db_creds" {
  mount = "secret"
  name  = "database/production"
}

# Use the secret values in another resource
resource "aws_db_instance" "main" {
  engine   = "postgres"
  username = data.vault_kv_secret_v2.db_creds.data["username"]
  password = data.vault_kv_secret_v2.db_creds.data["password"]

  # ... other configuration
}
```

## PKI Secrets Engine

Vault's PKI engine is excellent for managing TLS certificates.

```hcl
# Enable the PKI secrets engine
resource "vault_mount" "pki" {
  path        = "pki"
  type        = "pki"
  description = "PKI secrets engine for TLS certificates"

  default_lease_ttl_seconds = 86400      # 1 day
  max_lease_ttl_seconds     = 315360000  # 10 years
}

# Create a PKI role for issuing certificates
resource "vault_pki_secret_backend_role" "web_server" {
  backend = vault_mount.pki.path
  name    = "web-server"

  allowed_domains  = ["example.com"]
  allow_subdomains = true

  max_ttl = "72h"

  key_type = "rsa"
  key_bits = 2048
}
```

## Multiple Vault Clusters

If you manage multiple Vault clusters, use provider aliases.

```hcl
# Primary Vault cluster
provider "vault" {
  alias   = "primary"
  address = "https://vault-primary.example.com:8200"
  token   = var.primary_vault_token
}

# DR (Disaster Recovery) Vault cluster
provider "vault" {
  alias   = "dr"
  address = "https://vault-dr.example.com:8200"
  token   = var.dr_vault_token
}

# Use a specific provider for a resource
resource "vault_policy" "app_policy" {
  provider = vault.primary
  name     = "app-policy"
  policy   = "..."
}
```

## Best Practices

Here are some tips from real-world usage of the Vault provider:

1. Never hardcode tokens in your Terraform files. Use environment variables or a variables file that is excluded from version control.

2. Use AppRole or cloud-based auth methods in CI/CD pipelines instead of long-lived tokens.

3. Pin your provider version to avoid unexpected breaking changes during upgrades.

4. Be cautious with `terraform plan` output since it can expose secret values in logs. Use the `sensitive` attribute on variables and outputs.

5. Consider using Vault namespaces if you are running Vault Enterprise, and configure the `namespace` argument in the provider block.

```hcl
# Using Vault Enterprise namespaces
provider "vault" {
  address   = "https://vault.example.com:8200"
  token     = var.vault_token
  namespace = "admin/team-platform"
}
```

## Handling State File Security

Since Terraform state may contain sensitive values read from Vault, always use encrypted remote state backends.

```hcl
# Use an encrypted S3 backend for state storage
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "vault/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

## Wrapping Up

The Vault provider for Terraform gives you a powerful way to manage your entire secrets infrastructure as code. From enabling secrets engines and configuring auth backends to writing policies and issuing certificates, everything can be version-controlled and reviewed through your normal workflow.

Start with simple token authentication during development, then move to AppRole or cloud IAM auth for production environments. And always remember to secure your Terraform state, because it will contain the secrets you are managing.

If you are interested in monitoring your Vault infrastructure alongside your other services, check out [OneUptime](https://oneuptime.com) for unified observability across your stack.
