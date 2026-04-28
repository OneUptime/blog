# How to Integrate OpenBao with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OpenBao, Secrets Management, Security, Open Source, Infrastructure as Code

Description: Learn how to use OpenBao - the open-source fork of HashiCorp Vault - with OpenTofu to manage secrets without relying on BSL-licensed software.

## Introduction

OpenBao is a community-maintained fork of HashiCorp Vault under the Mozilla Public License 2.0, created after Vault's license changed to the Business Source License in 2023. Its API is compatible with Vault, so the existing Vault provider for OpenTofu works with OpenBao without modification.

## Running OpenBao

```bash
# Docker (development mode - not for production)

docker run --rm -p 8200:8200 \
  -e BAO_DEV_ROOT_TOKEN_ID=root \
  quay.io/openbao/openbao:latest server -dev

# Verify OpenBao is running
export BAO_ADDR="http://127.0.0.1:8200"
export BAO_TOKEN="root"
bao status
```

## Configuring the Vault Provider to Point at OpenBao

Because OpenBao exposes the same HTTP API as Vault, use the `hashicorp/vault` provider and point it at your OpenBao server:

```hcl
# versions.tf
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 4.0"
    }
  }
}

# Point the Vault provider at OpenBao
provider "vault" {
  address = "https://openbao.example.com:8200"
  # Token via VAULT_TOKEN (OpenBao reads the same env var as Vault)
}
```

## Enabling and Writing a KV Secret

```hcl
# Enable KV v2 secrets engine in OpenBao
resource "vault_mount" "kv" {
  path    = "secret"
  type    = "kv"
  options = { version = "2" }
}

# Write a secret
resource "vault_kv_secret_v2" "app_config" {
  mount = vault_mount.kv.path
  name  = "prod/app"

  data_json = jsonencode({
    db_host     = "db.internal"
    db_password = var.db_password
    api_key     = var.api_key
  })
}
```

## Reading Secrets in OpenTofu

```hcl
# Read a secret from OpenBao at apply time
data "vault_kv_secret_v2" "app_config" {
  mount = "secret"
  name  = "prod/app"
}

# Use the secret values
resource "aws_ssm_parameter" "db_host" {
  name  = "/prod/db/host"
  type  = "String"
  value = data.vault_kv_secret_v2.app_config.data["db_host"]
}
```

## AppRole Authentication

```hcl
# Create an AppRole for OpenTofu
resource "vault_auth_backend" "approle" {
  type = "approle"
}

resource "vault_approle_auth_backend_role" "opentofu" {
  backend        = vault_auth_backend.approle.path
  role_name      = "opentofu-deploy"
  token_policies = ["opentofu-policy"]
  token_ttl      = 3600   # 1 hour
}

# Fetch the role ID and secret ID
data "vault_approle_auth_backend_role_id" "opentofu" {
  backend   = vault_auth_backend.approle.path
  role_name = vault_approle_auth_backend_role.opentofu.role_name
}
```

## Dynamic PKI Certificates

OpenBao's PKI secrets engine lets OpenTofu request short-lived TLS certificates:

```hcl
# Mount a PKI secrets engine
resource "vault_mount" "pki" {
  path                      = "pki"
  type                      = "pki"
  default_lease_ttl_seconds = 3600
  max_lease_ttl_seconds     = 86400
}

# Define a role that controls what certificates can be issued
resource "vault_pki_secret_backend_role" "server" {
  backend          = vault_mount.pki.path
  name             = "server-role"
  allowed_domains  = ["example.com"]
  allow_subdomains = true
  max_ttl          = 86400
}

# Issue a certificate for a service
resource "vault_pki_secret_backend_cert" "app_cert" {
  backend     = vault_mount.pki.path
  name        = vault_pki_secret_backend_role.server.name
  common_name = "app.example.com"
  ttl         = "24h"
}
```

## Conclusion

OpenBao provides a fully compatible, MPL-licensed alternative to HashiCorp Vault. By pointing the existing `hashicorp/vault` OpenTofu provider at an OpenBao server, teams can manage secrets, dynamic credentials, and PKI without being bound by Vault's BSL license - keeping both OpenTofu and OpenBao as fully open-source components in the infrastructure stack.
