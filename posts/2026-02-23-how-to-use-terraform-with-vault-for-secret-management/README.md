# How to Use Terraform with Vault for Secret Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Vault, Secret Management, HashiCorp, Security, DevOps

Description: Learn how to integrate Terraform with HashiCorp Vault for secure secret management, dynamic credentials, and encrypted state storage in your infrastructure pipelines.

---

Managing secrets in infrastructure-as-code is one of the most critical security challenges teams face. Hardcoding passwords, API keys, and certificates in Terraform configurations is a common anti-pattern that creates significant security risks. HashiCorp Vault solves this problem by providing a centralized secret management system that integrates natively with Terraform. Together, they enable a workflow where secrets are not hardcoded in code, while Terraform state and plan files are still protected as sensitive artifacts.

This guide covers practical patterns for integrating Terraform with Vault, from basic secret retrieval to advanced dynamic credential generation.

## Why Vault with Terraform

Terraform needs secrets to provision infrastructure - database passwords, API tokens, TLS certificates, and more. Without Vault, these secrets typically end up in one of three bad places: environment variables (easily leaked), terraform.tfvars files (accidentally committed to git), or the Terraform state file. Vault reduces the need to store secrets in code or variable files by providing a secure, auditable source of truth, but any secrets read or written by Terraform can still be persisted in state and plan files.

## Setting Up the Vault Provider

Configure Terraform to authenticate with Vault and retrieve secrets.

```hcl
# Configure the Vault provider

terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 5.0"
    }
  }
}

# Authenticate using token (simplest method)
provider "vault" {
  address = var.vault_address
  token   = var.vault_token
}

# Alternative: Authenticate using AppRole (recommended for CI/CD)
provider "vault" {
  alias   = "approle"
  address = var.vault_address

  auth_login {
    path = "auth/approle/login"
    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}

# Alternative: Authenticate using AWS IAM (for AWS-hosted Terraform)
provider "vault" {
  alias   = "aws_iam"
  address = var.vault_address

  auth_login {
    path = "auth/aws/login"
    method = "aws"
    parameters = {
      role = "terraform-role"
    }
  }
}
```

## Reading Secrets from Vault

Use the Vault provider to read secrets and pass them to your resources.

```hcl
# Read database credentials from Vault KV store
data "vault_kv_secret_v2" "database" {
  mount = "secret"
  name  = "database/${var.environment}"
}

# Read API keys from Vault
data "vault_kv_secret_v2" "api_keys" {
  mount = "secret"
  name  = "api-keys/${var.environment}"
}

# Use secrets in resources without hardcoding them in code
resource "aws_db_instance" "main" {
  identifier     = "app-db-${var.environment}"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  db_name  = "application"
  username = data.vault_kv_secret_v2.database.data["username"]
  password = data.vault_kv_secret_v2.database.data["password"]

  vpc_security_group_ids = [aws_security_group.db.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  tags = {
    Environment = var.environment
  }
}

# Store secrets in AWS Secrets Manager (sourced from Vault)
resource "aws_secretsmanager_secret" "app_secrets" {
  name = "app-secrets-${var.environment}"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    db_host     = aws_db_instance.main.address
    db_username = data.vault_kv_secret_v2.database.data["username"]
    db_password = data.vault_kv_secret_v2.database.data["password"]
    api_key     = data.vault_kv_secret_v2.api_keys.data["api_key"]
  })
}
```

## Dynamic Database Credentials

Vault's database secrets engine generates unique, short-lived credentials for each application or session. This eliminates shared static passwords.

```hcl
# Configure the Vault database secrets engine with Terraform
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = "database"
  name          = "app-postgres"
  allowed_roles = ["app-readonly", "app-readwrite"]

  postgresql {
    connection_url = "postgres://{{username}}:{{password}}@${aws_db_instance.main.address}:5432/application"
    username            = var.vault_db_admin_user
    password_wo         = var.vault_db_admin_password
    password_wo_version = 1
  }
}

# Role for read-only access
resource "vault_database_secret_backend_role" "readonly" {
  backend     = "database"
  name        = "app-readonly"
  db_name     = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\"",
  ]

  revocation_statements = [
    "REVOKE ALL ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"",
    "DROP ROLE IF EXISTS \"{{name}}\"",
  ]

  default_ttl = 3600
  max_ttl     = 86400
}

# Role for read-write access
resource "vault_database_secret_backend_role" "readwrite" {
  backend     = "database"
  name        = "app-readwrite"
  db_name     = vault_database_secret_backend_connection.postgres.name

  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'",
    "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"",
  ]

  default_ttl = 3600
  max_ttl     = 86400
}
```

## Managing Vault Policies with Terraform

Define access policies for the tokens used by each Terraform workspace or environment.

```hcl
# Policy for the production Terraform workspace
resource "vault_policy" "terraform_production" {
  name = "terraform-production"

  policy = <<-EOT
    # Read production secrets
    path "secret/data/database/production" {
      capabilities = ["read"]
    }

    path "secret/data/api-keys/production" {
      capabilities = ["read"]
    }

    # Generate dynamic database credentials
    path "database/creds/app-readwrite" {
      capabilities = ["read"]
    }

    # Read PKI certificates
    path "pki/issue/production" {
      capabilities = ["create", "update"]
    }
  EOT
}

# Policy for staging (more restricted)
resource "vault_policy" "terraform_staging" {
  name = "terraform-staging"

  policy = <<-EOT
    path "secret/data/database/staging" {
      capabilities = ["read"]
    }

    path "secret/data/api-keys/staging" {
      capabilities = ["read"]
    }

    path "database/creds/app-readonly" {
      capabilities = ["read"]
    }
  EOT
}

# AppRole for Terraform CI/CD authentication
resource "vault_approle_auth_backend_role" "terraform" {
  backend        = "approle"
  role_name      = "terraform-${var.environment}"
  token_policies = ["terraform-${var.environment}"]
  token_ttl      = 3600
  token_max_ttl  = 7200
}
```

## TLS Certificate Management

Use Vault's PKI secrets engine to generate TLS certificates for your infrastructure.

```hcl
# Enable PKI secrets engine
resource "vault_mount" "pki" {
  path        = "pki"
  type        = "pki"
  max_lease_ttl_seconds = 315360000
}

# Generate a root CA
resource "vault_pki_secret_backend_root_cert" "root" {
  backend     = vault_mount.pki.path
  type        = "internal"
  common_name = "Company Root CA"
  ttl         = "315360000"
}

# PKI role for issuing server certificates
resource "vault_pki_secret_backend_role" "server" {
  backend          = vault_mount.pki.path
  name             = "server-cert"
  allowed_domains  = ["company.com", "internal.company.com"]
  allow_subdomains = true
  max_ttl          = "2592000"
}

# Issue a certificate for the application
resource "vault_pki_secret_backend_cert" "app" {
  backend     = vault_mount.pki.path
  name        = vault_pki_secret_backend_role.server.name
  common_name = "app.${var.environment}.internal.company.com"
  ttl         = "720h"
}

# Import the certificate into ACM for use by an ALB
resource "aws_acm_certificate" "app" {
  certificate_body  = vault_pki_secret_backend_cert.app.certificate
  private_key       = vault_pki_secret_backend_cert.app.private_key
  certificate_chain = join("\n", vault_pki_secret_backend_cert.app.ca_chain)
}
```

## Securing Terraform State

Terraform does not automatically encrypt state with Vault transit. Use a secure remote backend with encryption, access controls, and locking. If you have a custom pipeline that encrypts state artifacts before storage, Vault transit can provide the encryption key.

```hcl
# Enable the transit secrets engine
resource "vault_mount" "transit" {
  path = "transit"
  type = "transit"
}

# Transit key for custom state artifact encryption
resource "vault_transit_secret_backend_key" "terraform_state" {
  backend = vault_mount.transit.path
  name    = "terraform-state-${var.environment}"
  type    = "aes256-gcm96"

  deletion_allowed = false
  exportable       = false
}
```

## Best Practices

Never store Vault tokens in Terraform code or state. Use short-lived authentication methods like AppRole or AWS IAM auth. Prefer dynamic secrets over static secrets wherever possible, as they reduce the blast radius of a compromise. Use separate Vault policies for each environment to enforce least-privilege access.

Mark outputs that contain sensitive values as sensitive to prevent them from appearing in normal CLI output:

```hcl
output "db_password" {
  value     = data.vault_kv_secret_v2.database.data["password"]
  sensitive = true
}
```

For more on Terraform integrations, see our guides on [using Terraform with Consul for service discovery](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-consul-for-service-discovery/view) and [using Terraform with Boundary for access management](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-with-boundary-for-access-management/view).

## Conclusion

Integrating Terraform with Vault transforms how you handle secrets in infrastructure automation. Instead of scattering credentials across configuration files and environment variables, you centralize them in Vault with fine-grained access controls, audit logging, and automatic rotation. Dynamic credentials take this a step further by eliminating long-lived secrets entirely. The initial investment in setting up Vault integration pays for itself in reduced security risk and simplified credential management.
