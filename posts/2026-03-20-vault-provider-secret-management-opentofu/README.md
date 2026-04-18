# How to Use the Vault Provider for Secret Management in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Provider, Secret Management, Security

Description: Learn how to configure and use the HashiCorp Vault provider in OpenTofu to manage secrets, policies, and auth methods as infrastructure code.

## Introduction

The Vault provider for OpenTofu does double duty: it reads existing secrets during plan/apply, and it manages Vault resources (policies, secrets engines, auth methods) as infrastructure. This guide covers both use cases.

## Provider Setup

```hcl
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
  }
}

provider "vault" {
  address   = var.vault_address  # e.g., "https://vault.example.com:8200"
  namespace = var.vault_namespace # For Vault Enterprise
  # Auth via VAULT_TOKEN env var, or configure auth_login below
}
```

## Enabling Secrets Engines

```hcl
# Enable the KV v2 secrets engine

resource "vault_mount" "kv" {
  path        = "secret"
  type        = "kv"
  options     = { version = "2" }
  description = "KV Version 2 secret engine mount"
}

# Enable the database secrets engine
resource "vault_mount" "database" {
  path = "database"
  type = "database"
}

# Enable the AWS secrets engine
resource "vault_mount" "aws" {
  path = "aws"
  type = "aws"
}
```

## Managing KV Secrets

```hcl
resource "vault_kv_secret_v2" "app_config" {
  mount               = vault_mount.kv.path
  name                = "prod/application"
  cas                 = 1
  delete_all_versions = true

  data_json = jsonencode({
    api_key      = var.api_key
    webhook_url  = var.webhook_url
    environment  = "prod"
  })

  custom_metadata {
    max_versions = 5
    data = {
      responsible_team = "platform"
      last_rotation    = "2025-01-15"
    }
  }
}
```

## Configuring Database Secrets Engine

```hcl
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "prod-postgres"
  allowed_roles = ["app-readonly", "app-readwrite"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@${aws_db_instance.main.endpoint}/appdb"
    username       = "vault_admin"
    password       = var.vault_db_admin_password
    max_open_connections = 5
  }
}

resource "vault_database_secret_backend_role" "app_readonly" {
  backend             = vault_mount.database.path
  name                = "app-readonly"
  db_name             = vault_database_secret_backend_connection.postgres.name
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]
  default_ttl = 3600
  max_ttl     = 86400
}
```

## Managing Vault Policies

```hcl
resource "vault_policy" "app_policy" {
  name = "prod-app-policy"

  policy = <<EOT
# Read application secrets
path "secret/data/prod/*" {
  capabilities = ["read"]
}

# Generate database credentials
path "database/creds/app-readonly" {
  capabilities = ["read"]
}

# Generate AWS credentials
path "aws/creds/app-role" {
  capabilities = ["read"]
}
EOT
}
```

## Configuring Auth Methods

```hcl
# Enable Kubernetes auth method
resource "vault_auth_backend" "kubernetes" {
  type = "kubernetes"
}

resource "vault_kubernetes_auth_backend_config" "k8s" {
  backend            = vault_auth_backend.kubernetes.path
  kubernetes_host    = "https://kubernetes.default.svc"
  kubernetes_ca_cert = file("${path.module}/ca.crt")
}

resource "vault_kubernetes_auth_backend_role" "app" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "prod-app"
  bound_service_account_names      = ["app-service-account"]
  bound_service_account_namespaces = ["production"]
  token_policies                   = [vault_policy.app_policy.name]
  token_ttl                        = 3600
}
```

## Reading Secrets for Other Resources

```hcl
# Use vault_kv_secret_v2 to read secrets managed elsewhere
data "vault_kv_secret_v2" "external_api" {
  mount = "secret"
  name  = "prod/external-api"
}

resource "aws_ssm_parameter" "api_key" {
  name  = "/prod/external-api-key"
  type  = "SecureString"
  value = data.vault_kv_secret_v2.external_api.data["api_key"]
}
```

## Conclusion

The Vault provider lets you manage Vault's own configuration - secrets engines, policies, roles, and auth methods - as code, ensuring your secret management infrastructure is reproducible and version-controlled. Combine resource management with data sources to both configure Vault and consume its secrets within the same OpenTofu configuration.
