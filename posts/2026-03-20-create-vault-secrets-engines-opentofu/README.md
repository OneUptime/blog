# How to Create Vault Secrets Engines with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Vault, Secrets Engines, PKI, KV, AWS

Description: Learn how to enable and configure HashiCorp Vault secrets engines using OpenTofu, including KV, database, AWS, and PKI engines for comprehensive secret management.

## Introduction

Vault secrets engines are plugins that store, generate, or encrypt data. OpenTofu manages the lifecycle of secrets engines - enabling them, configuring their backends, and creating roles - ensuring your Vault infrastructure is reproducible and version-controlled.

## KV Secrets Engine (Version 2)

```hcl
resource "vault_mount" "kv" {
  path        = "secret"
  type        = "kv-v2"
  description = "KV Version 2 secrets engine"

  options = {
    version = "2"
  }
}

# Configure KV engine options

resource "vault_kv_secret_backend_v2" "config" {
  mount                      = vault_mount.kv.path
  max_versions               = 10
  delete_version_after       = 2764800  # 32 days (in seconds)
  cas_required               = false
}
```

## PKI Secrets Engine for Certificate Management

```hcl
# Root CA
resource "vault_mount" "pki_root" {
  path                      = "pki"
  type                      = "pki"
  default_lease_ttl_seconds = 86400      # 1 day
  max_lease_ttl_seconds     = 315360000  # ~10 years
}

resource "vault_pki_secret_backend_root_cert" "root" {
  backend              = vault_mount.pki_root.path
  type                 = "internal"
  common_name          = "Example Corp Root CA"
  ttl                  = "87600h"
  format               = "pem"
  private_key_format   = "der"
  key_type             = "rsa"
  key_bits             = 4096
  exclude_cn_from_sans = true
  ou                   = "Platform Engineering"
  organization         = "Example Corp"
  country              = "US"
}

# Intermediate CA
resource "vault_mount" "pki_int" {
  path                      = "pki_int"
  type                      = "pki"
  default_lease_ttl_seconds = 86400      # 1 day
  max_lease_ttl_seconds     = 157680000  # 5 years
}

resource "vault_pki_secret_backend_intermediate_cert_request" "int" {
  backend     = vault_mount.pki_int.path
  type        = "internal"
  common_name = "Example Corp Intermediate CA"
  key_type    = "rsa"
  key_bits    = 4096
}

resource "vault_pki_secret_backend_root_sign_intermediate" "int" {
  backend              = vault_mount.pki_root.path
  csr                  = vault_pki_secret_backend_intermediate_cert_request.int.csr
  common_name          = "Example Corp Intermediate CA"
  ttl                  = "43800h"
  exclude_cn_from_sans = true
}

# Role for issuing web server certificates
resource "vault_pki_secret_backend_role" "web_server" {
  backend          = vault_mount.pki_int.path
  name             = "web-server"
  allowed_domains  = ["example.com", "internal.example.com"]
  allow_subdomains = true
  max_ttl          = "720h"  # 30 days
  key_type         = "rsa"
  key_bits         = 2048
  server_flag      = true
  client_flag      = false
}
```

## SSH Secrets Engine

```hcl
resource "vault_mount" "ssh" {
  path = "ssh"
  type = "ssh"
}

resource "vault_ssh_secret_backend_ca" "ssh" {
  backend              = vault_mount.ssh.path
  generate_signing_key = true
}

resource "vault_ssh_secret_backend_role" "ops" {
  backend                 = vault_mount.ssh.path
  name                    = "ops-access"
  key_type                = "ca"
  allowed_users           = "ubuntu,ec2-user"
  default_extensions      = { permit-pty = "" }
  allowed_extensions      = "permit-pty,permit-port-forwarding"
  default_user            = "ubuntu"
  ttl                     = "30m"
  max_ttl                 = "4h"
}
```

## TOTP Secrets Engine

```hcl
resource "vault_mount" "totp" {
  path = "totp"
  type = "totp"
}
```

## Cubbyhole (Per-Token Storage)

```hcl
# Cubbyhole is automatically available at cubbyhole/
# No configuration needed - it's always enabled and token-scoped
# Use it for response wrapping and temp credential storage
```

## Organizing Multiple Engines

```hcl
locals {
  secret_mounts = {
    "secret"   = { type = "kv-v2", description = "Application secrets" }
    "infra"    = { type = "kv-v2", description = "Infrastructure secrets" }
    "database" = { type = "database", description = "Dynamic DB credentials" }
    "aws"      = { type = "aws", description = "Dynamic AWS credentials" }
    "pki"      = { type = "pki", description = "Certificate management" }
  }
}

resource "vault_mount" "engines" {
  for_each    = local.secret_mounts
  path        = each.key
  type        = each.value.type
  description = each.value.description
}
```

## Conclusion

Managing secrets engines with OpenTofu treats your Vault configuration as infrastructure - it's reproducible, peer-reviewed, and consistent across environments. The PKI engine deserves special attention for internal certificate management, replacing manual certificate processes with short-lived, automatically-renewed certificates that reduce the impact of certificate compromise.
